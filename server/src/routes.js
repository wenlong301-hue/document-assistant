import { config } from './config.js';
import { hashPassword, verifyPassword, signJwt, verifyJwt, newId } from './crypto.js';
import { db, users, tokens, projects, ydocs, audit } from './db.js';
import { seedProjectDoc, publishProjectName, collabStats } from './collab.js';

const MAX_TITLE = 200;
const MAX_PROJECTS_PER_USER = 200;

const fail = (status, message) => {
  const err = new Error(message);
  err.statusCode = status;
  return err;
};

const emailOk = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
const publicUser = (user) => ({ id: user.id, email: user.email, name: user.name, color: user.color });

function issueSession(user) {
  const accessToken = signJwt(
    { typ: 'access', sub: user.id, exp: Math.floor(Date.now() / 1000) + config.accessTtlSec },
    config.secret
  );
  const refreshToken = tokens.issue(user.id, { ttlSec: config.refreshTtlSec });
  return { user: publicUser(user), accessToken, refreshToken, expiresIn: config.accessTtlSec };
}

const roleOf = (projectId, userId) => projects.role(projectId, userId);

function requireRole(projectId, userId, roles) {
  const role = roleOf(projectId, userId);
  if (!role) throw fail(403, '无权访问该项目');
  if (roles && !roles.includes(role)) throw fail(403, '当前账号权限不足');
  return role;
}

const canWrite = (role) => role === 'owner' || role === 'editor';
const projectView = (row) => ({
  id: row.id,
  name: row.name,
  role: row.role,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

// 登录失败限流（单实例内存即可）
const loginFailures = new Map();
function throttleLogin(key) {
  const now = Date.now();
  const entry = loginFailures.get(key);
  if (!entry) return;
  if (now - entry.first > 15 * 60 * 1000) loginFailures.delete(key);
  else if (entry.count >= 20) throw fail(429, '尝试次数过多，请 15 分钟后再试');
}
function noteLoginFailure(key) {
  const now = Date.now();
  const entry = loginFailures.get(key);
  if (!entry || now - entry.first > 15 * 60 * 1000) loginFailures.set(key, { count: 1, first: now });
  else entry.count++;
}

export async function registerRoutes(app) {
  app.addHook('onRequest', async (req, reply) => {
    if (!req.url.startsWith('/api/')) return;
    if (req.url.startsWith('/api/auth/') || req.url === '/api/health') return;
    const header = req.headers.authorization || '';
    const token = header.replace(/^Bearer\s+/i, '');
    const payload = verifyJwt(token, config.secret, { typ: 'access' });
    if (!payload) return reply.code(401).send({ error: '登录已过期，请重新登录' });
    req.userId = payload.sub;
  });

  app.setErrorHandler((err, req, reply) => {
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    if (status >= 500) req.log.error({ err }, 'unhandled error');
    reply.code(status).send({ error: status >= 500 ? '服务器内部错误' : err.message });
  });

  app.get('/api/health', async () => ({ ok: true, version: 1, collab: collabStats() }));

  // ---------------- 账号 ----------------
  app.post('/api/auth/register', async (req) => {
    const { email, password, name } = req.body || {};
    if (!emailOk(email)) throw fail(400, '邮箱格式不正确');
    if (String(password || '').length < 8) throw fail(400, '密码至少 8 位');
    if (users.byEmail(email)) throw fail(409, '该邮箱已注册');
    const user = users.create({
      email,
      name: String(name || '').trim() || String(email).split('@')[0],
      passwordHash: hashPassword(password)
    });
    audit(user.id, null, 'register', user.id, { email: user.email });
    return issueSession(user);
  });

  app.post('/api/auth/login', async (req) => {
    const { email, password } = req.body || {};
    const key = `${String(email || '').toLowerCase()}|${req.ip}`;
    throttleLogin(key);
    const user = users.byEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      noteLoginFailure(key);
      throw fail(401, '邮箱或密码不正确');
    }
    loginFailures.delete(key);
    audit(user.id, null, 'login', user.id, { ip: req.ip });
    return issueSession(user);
  });

  app.post('/api/auth/refresh', async (req) => {
    const { refreshToken } = req.body || {};
    const userId = tokens.consume(refreshToken);
    if (!userId) throw fail(401, '登录状态已失效，请重新登录');
    const user = users.byId(userId);
    if (!user) throw fail(401, '账号不存在');
    return issueSession(user);
  });

  app.post('/api/auth/logout', async (req) => {
    tokens.revoke((req.body || {}).refreshToken);
    return { ok: true };
  });

  app.get('/api/me', async (req) => {
    const user = users.byId(req.userId);
    if (!user) throw fail(401, '账号不存在');
    return { user: publicUser(user) };
  });

  // ---------------- 项目 ----------------
  app.get('/api/projects', async (req) => {
    const rows = projects.listForUser(req.userId);
    return { projects: rows.map(projectView) };
  });

  app.post('/api/projects', async (req) => {
    const body = req.body || {};
    const name = String(body.name || '').trim().slice(0, MAX_TITLE) || '未命名文档';
    const count = projects.listForUser(req.userId).length;
    if (count >= MAX_PROJECTS_PER_USER) throw fail(400, '云端项目数量已达上限');

    const snapshot = body.snapshot && typeof body.snapshot === 'object' ? body.snapshot : null;
    const project = projects.create(req.userId, name, snapshot);
    seedProjectDoc(project.id, snapshot?.name || name, snapshot);
    audit(req.userId, project.id, 'project.create', project.id, { name });
    return { project: projectView({ ...project, role: 'owner' }) };
  });

  app.get('/api/projects/:id', async (req) => {
    const projectId = req.params.id;
    const role = requireRole(projectId, req.userId);
    const project = projects.byId(projectId);
    if (!project) throw fail(404, '项目不存在');
    return {
      project: { ...projectView({ ...project, role }), hasSnapshot: !!project.snapshot },
      members: projects.members(projectId)
    };
  });

  app.patch('/api/projects/:id', async (req) => {
    const projectId = req.params.id;
    requireRole(projectId, req.userId, ['owner', 'editor']);
    const name = String((req.body || {}).name || '').trim().slice(0, MAX_TITLE);
    if (!name) throw fail(400, '项目名称不能为空');
    projects.rename(projectId, name);
    publishProjectName(projectId, name);
    audit(req.userId, projectId, 'project.rename', projectId, { name });
    return { ok: true, name };
  });

  app.delete('/api/projects/:id', async (req) => {
    const projectId = req.params.id;
    requireRole(projectId, req.userId, ['owner']);
    projects.softDelete(projectId);
    ydocs.remove(`project:${projectId}`);
    audit(req.userId, projectId, 'project.delete', projectId, null);
    return { ok: true };
  });

  // ---------------- 成员 ----------------
  app.get('/api/projects/:id/members', async (req) => {
    requireRole(req.params.id, req.userId);
    return { members: projects.members(req.params.id) };
  });

  app.post('/api/projects/:id/members', async (req) => {
    const projectId = req.params.id;
    requireRole(projectId, req.userId, ['owner']);
    const { email, role } = req.body || {};
    if (!['editor', 'viewer'].includes(role)) throw fail(400, '角色只能是 editor 或 viewer');
    const user = users.byEmail(email);
    if (!user) throw fail(404, '该邮箱尚未注册');
    projects.addMember(projectId, user.id, role);
    audit(req.userId, projectId, 'member.add', user.id, { role });
    return { members: projects.members(projectId) };
  });

  app.delete('/api/projects/:id/members/:userId', async (req) => {
    const projectId = req.params.id;
    requireRole(projectId, req.userId, ['owner']);
    if (req.params.userId === req.userId) throw fail(400, '不能移除自己');
    projects.removeMember(projectId, req.params.userId);
    audit(req.userId, projectId, 'member.remove', req.params.userId, null);
    return { members: projects.members(projectId) };
  });

  // ---------------- 协同票据 ----------------
  app.post('/api/ws-ticket', async (req) => {
    const projectId = (req.body || {}).projectId;
    if (!projectId) throw fail(400, '缺少 projectId');
    const role = requireRole(projectId, req.userId);
    const ticket = signJwt(
      { typ: 'ws', sub: req.userId, projectId, exp: Math.floor(Date.now() / 1000) + config.ticketTtlSec },
      config.secret
    );
    const hostHeader = String(req.headers.host || 'localhost');
    const hostname = hostHeader.split(':')[0] || 'localhost';
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    const isHttps = forwardedProto === 'https' || req.protocol === 'https';
    const collabUrl = config.publicCollabUrl
      || (isHttps ? `wss://${hostHeader}` : `ws://${hostname}:${config.collabPort}`);
    return { ticket, collabUrl, role, ttl: config.ticketTtlSec };
  });

  // ---------------- 导出（.mdoc 快照） ----------------
  app.get('/api/projects/:id/export', async (req) => {
    const projectId = req.params.id;
    requireRole(projectId, req.userId);
    const project = projects.byId(projectId);
    if (!project) throw fail(404, '项目不存在');
    const snapshot = project.snapshot || { name: project.name, outline: [], content: {} };
    const payload = {
      name: snapshot.name || project.name,
      children: Array.isArray(snapshot.outline) ? snapshot.outline : [],
      content: snapshot.content && typeof snapshot.content === 'object' ? snapshot.content : {},
      updatedAt: new Date(project.updated_at || Date.now()).toISOString()
    };
    audit(req.userId, projectId, 'project.export', projectId, null);
    return payload;
  });

  return app;
}
