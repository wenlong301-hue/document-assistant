/**
 * 云端协同端到端测试（真实 Electron + 真实服务器）
 *
 * 前置：
 *   1. 服务端已启动：cd server && npm start
 *   2. 已构建前端：npm run build
 * 运行：node test/cloud.e2e.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE || 'http://127.0.0.1:8080';
const CDP_PORT = Number(process.env.CDP_PORT || 9333);
const stamp = Date.now().toString(36);
const EMAIL = `e2e-${stamp}@test.dev`;
const PASSWORD = 'pass12345';
const DATA_DIR = path.join(process.env.OPENCODE_TMP || '/tmp', `da-e2e-${stamp}`);
const PROJECT_NAME = `云端测试文档-${stamp}`;
const NEW_NODE_NAME = `远端新增章节-${stamp}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const ok = (label, cond, extra) => {
  if (cond) console.log(`  ✅ ${label}`);
  else { failures++; console.log(`  ❌ ${label}`, extra === undefined ? '' : JSON.stringify(extra)); }
};

async function api(p, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

function connectCDP(wsUrl) {
  const ws = new WebSocket(wsUrl, { perMessageDeflate: false, maxPayload: 64 * 1024 * 1024 });
  let seq = 0;
  const pending = new Map();
  const consoleErrors = [];

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push((msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails || {};
      consoleErrors.push(d.exception?.description || d.text || 'unknown exception');
    }
  });

  const ready = new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result?.value;
  }

  return { ready, send, evaluate, consoleErrors, close: () => ws.close() };
}

async function waitForTarget(timeout = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page' && /index\.html/.test(t.url));
      if (page) return page;
    } catch { /* 尚未就绪 */ }
    await sleep(300);
  }
  throw new Error('Electron 未能暴露调试端口');
}

async function waitFor(fn, { timeout = 12000, interval = 200 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = await fn();
    if (value) return value;
    await sleep(interval);
  }
  return null;
}

const main = async () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log('\n== 准备云端项目 ==');
  const reg = await api('/api/auth/register', { method: 'POST', body: { email: EMAIL, password: PASSWORD, name: 'E2E用户' } });
  ok('注册测试账号', reg.status === 200, reg.data);
  const token = reg.data.accessToken;

  const snapshot = {
    name: PROJECT_NAME,
    children: [
      {
        id: `root-${stamp}`,
        name: PROJECT_NAME,
        includeInPreview: true,
        children: [{ id: `ch-${stamp}`, name: '第一章', includeInPreview: true, children: [] }]
      }
    ],
    content: { [`root-${stamp}`]: '<p></p>', [`ch-${stamp}`]: '<p>初始内容</p>' },
    selectedNodeId: `ch-${stamp}`,
    mode: 'outline'
  };
  const created = await api('/api/projects', { method: 'POST', token, body: { name: PROJECT_NAME, snapshot } });
  ok('创建云端项目（含快照）', created.status === 200 && !!created.data.project?.id, created.data);
  const projectId = created.data.project.id;

  console.log('\n== 启动 Electron ==');
  const electronBin = path.join(ROOT, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');
  const child = spawn(electronBin, [ROOT, `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${path.join(DATA_DIR, 'userdata')}`], {
    cwd: ROOT,
    env: { ...process.env, DOC_ASSISTANT_DATA_DIR: DATA_DIR, ELECTRON_ENABLE_LOGGING: '1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const stderrChunks = [];
  child.stderr.on('data', (d) => stderrChunks.push(d.toString()));
  child.stdout.on('data', () => {});

  let cdp;
  let remote;
  try {
    const target = await waitForTarget();
    cdp = connectCDP(target.webSocketDebuggerUrl);
    await cdp.ready;
    await cdp.send('Runtime.enable');
    await sleep(1500);
    ok('渲染进程已连接', true);

    console.log('\n== 登录（真实 UI 流程） ==');
    const opened = await waitFor(async () => cdp.evaluate(`!!document.querySelector('[data-cloud-login]')`), { timeout: 15000 });
    ok('首页渲染出云端入口', !!opened);

    await cdp.evaluate(`(() => {
      document.querySelector('[data-cloud-login]').click();
      return true;
    })()`);
    await sleep(400);
    const filled = await cdp.evaluate(`(() => {
      const setValue = (el, value) => {
        const proto = HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      const email = document.querySelector('input[placeholder="you@example.com"]');
      const pwd = document.querySelector('input[placeholder="请输入密码"]');
      if (!email || !pwd) return false;
      setValue(email, ${JSON.stringify(EMAIL)});
      setValue(pwd, ${JSON.stringify(PASSWORD)});
      return true;
    })()`);
    ok('登录弹窗可填写', filled === true);

    await cdp.evaluate(`(() => {
      const submit = document.querySelector('[data-cloud-submit]');
      if (!submit) return false;
      submit.click();
      return true;
    })()`);

    const userShown = await waitFor(async () => cdp.evaluate(`(document.querySelector('[data-cloud-user]') || {}).getAttribute?.('data-cloud-user') || ''`), { timeout: 15000 });
    ok('登录成功并显示账号', userShown === 'E2E用户', userShown);

    console.log('\n== 打开云端项目 ==');
    const cardReady = await waitFor(async () => cdp.evaluate(`!!document.querySelector('[data-cloud-project="${projectId}"]')`), { timeout: 15000 });
    ok('云端项目卡片出现', !!cardReady);
    await cdp.evaluate(`document.querySelector('[data-cloud-project="${projectId}"]').click()`);

    const outlineShown = await waitFor(async () => cdp.evaluate(`document.body.innerText.includes('第一章')`), { timeout: 20000 });
    ok('进入项目并渲染大纲', !!outlineShown);

    const collabState = await cdp.evaluate(`(() => {
      const text = document.body.innerText;
      return { hasTitle: text.includes(${JSON.stringify(PROJECT_NAME)}) };
    })()`);
    ok('标题显示为云端项目名', collabState.hasTitle === true, collabState);

    console.log('\n== 建立第二个协同客户端 ==');
    const ticket = await api('/api/ws-ticket', { method: 'POST', token, body: { projectId } });
    ok('获取协同票据', ticket.status === 200 && !!ticket.data.ticket);
    const doc = new Y.Doc();
    remote = new HocuspocusProvider({
      url: ticket.data.collabUrl,
      name: `project:${projectId}`,
      token: ticket.data.ticket,
      document: doc
    });
    await waitFor(async () => remote.isSynced, { timeout: 15000 });
    ok('第二个客户端同步完成', remote.isSynced === true);

    const remoteName = doc.getMap('meta').get('name');
    ok('协同文档包含项目名', remoteName === PROJECT_NAME, remoteName);
    const content = doc.getMap('content');
    ok('协同文档包含正文快照', String(content.get(`ch-${stamp}`) || '').includes('初始内容'), content.get(`ch-${stamp}`));

    console.log('\n== 远端修改实时出现在 Electron UI ==');
    remote.setAwarenessField('user', { name: '同事B', color: '#E53E3E' });
    const meta = doc.getMap('meta');
    const outline = Array.isArray(meta.get('outline')) ? meta.get('outline') : [];
    doc.transact(() => {
      meta.set('outline', [...outline, { id: `n2-${stamp}`, name: NEW_NODE_NAME, includeInPreview: true, children: [] }]);
    });

    const outlineSynced = await waitFor(async () => cdp.evaluate(`document.body.innerText.includes(${JSON.stringify(NEW_NODE_NAME)})`), { timeout: 15000 });
    ok('远端新增章节实时显示在大纲', !!outlineSynced);

    console.log('\n== 在线名单 ==');
    await sleep(800);
    await cdp.evaluate(`(() => {
      // 顶栏「协同」是 div+p 结构，点击文字即可冒泡到可点击容器
      const label = [...document.querySelectorAll('p')].find(p => p.textContent.trim() === '协同');
      label?.click();
      return !!label;
    })()`);
    const peerShown = await waitFor(async () => cdp.evaluate(`document.body.innerText.includes('同事B')`), { timeout: 8000 });
    ok('协同弹窗显示在线同事', !!peerShown);
    if (!peerShown) {
      const modalText = await cdp.evaluate(`document.body.innerText.replace(/\\n+/g, ' | ').slice(-600)`);
      console.log('     [debug] 页面文本尾部:', modalText);
    }

    console.log('\n== 服务端物化与导出 ==');
    const exported = await waitFor(async () => {
      const res = await api(`/api/projects/${projectId}/export`, { token });
      const children = res.data?.children || [];
      const names = JSON.stringify(children);
      return names.includes(NEW_NODE_NAME) ? res.data : null;
    }, { timeout: 15000, interval: 500 });
    ok('服务端快照已物化到最新大纲', !!exported, exported ? exported.children?.length : null);
    ok('导出快照保留正文', JSON.stringify(exported?.content || {}).includes('初始内容'));

    const list = await api('/api/projects', { token });
    const row = (list.data?.projects || []).find((p) => p.id === projectId);
    ok('项目列表可见', !!row && row.name === PROJECT_NAME, row);

    const errors = cdp.consoleErrors.filter((e) => !/Autofill|DevTools|Electron Security Warning|Download the React DevTools/i.test(e));
    ok('渲染进程无致命报错', errors.length === 0, errors.slice(0, 3));

    console.log('\n== 清理 ==');
    await cdp.evaluate(`window.electronAPI?.cloudLogout?.()`);
    ok('已退出登录', true);
  } finally {
    try { remote?.destroy(); } catch { /* ignore */ }
    try { cdp?.close(); } catch { /* ignore */ }
    await sleep(300);
    child.kill('SIGKILL');
    await sleep(600);
    try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  console.log(`\n${failures === 0 ? '🎉 云端协同端到端全部通过' : `⚠️  ${failures} 项失败`}\n`);
  if (failures && stderrChunks.length) {
    console.log(stderrChunks.join('').split('\n').slice(-30).join('\n'));
  }
  process.exit(failures === 0 ? 0 : 1);
};

main().catch((error) => {
  console.error('\n💥 测试异常:', error);
  try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
  process.exit(1);
});
