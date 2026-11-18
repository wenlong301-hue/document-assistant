import { Server } from '@hocuspocus/server';
import * as Y from 'yjs';
import { config } from './config.js';
import { verifyJwt } from './crypto.js';
import { projects, ydocs } from './db.js';

let server = null;
let hocuspocus = null;
const DEBUG = process.env.COLLAB_DEBUG === '1';
const log = (...args) => { if (DEBUG) console.log('[collab]', ...args); };

const ROOM_PREFIX = 'project:';
const MAX_SNAPSHOT_BYTES = 32 * 1024 * 1024;

export const roomName = (projectId) => `${ROOM_PREFIX}${projectId}`;

function projectIdFromRoom(documentName) {
  const name = String(documentName || '');
  if (!name.startsWith(ROOM_PREFIX)) return null;
  return name.slice(ROOM_PREFIX.length) || null;
}

/** 用服务端数据初始化一个项目的 Yjs 文档（创建项目时调用一次） */
export function seedProjectDoc(projectId, name, snapshot = null) {
  const ydoc = new Y.Doc();
  ydoc.transact(() => {
    const meta = ydoc.getMap('meta');
    meta.set('name', name);
    if (snapshot) {
      // 客户端历史上用 children 命名大纲，两种写法都接受
      const outline = Array.isArray(snapshot.outline) ? snapshot.outline : snapshot.children;
      if (Array.isArray(outline)) meta.set('outline', outline);
      if (snapshot.selectedNodeId) meta.set('selectedNodeId', String(snapshot.selectedNodeId));
      if (snapshot.mode) meta.set('mode', String(snapshot.mode));
      const content = ydoc.getMap('content');
      for (const [nodeId, html] of Object.entries(snapshot.content || {})) {
        if (typeof html === 'string' && nodeId) content.set(String(nodeId), html);
      }
    }
  }, 'server-seed');
  ydocs.store(roomName(projectId), Y.encodeStateAsUpdate(ydoc));
  ydoc.destroy();
}

/** 项目改名时同步到已加载的协同文档 */
export function publishProjectName(projectId, name) {
  const doc = hocuspocus?.documents?.get(roomName(projectId));
  if (!doc) return;
  const meta = doc.getMap('meta');
  if (meta.get('name') !== name) {
    doc.transact(() => meta.set('name', name), 'server-rename');
  }
}

/** 刚创建的项目若有人正在看，刷新其在线状态（暂无广播需求，占位便于扩展） */
export function collabStats() {
  if (!hocuspocus) return { documents: 0, connections: 0 };
  return { documents: hocuspocus.getDocumentsCount(), connections: hocuspocus.getConnectionsCount() };
}

export function startCollab() {
  server = new Server({
    name: '文档助手云端协同',
    address: config.host,
    port: config.collabPort,
    quiet: true,
    stopOnSignals: false,
    debounce: 2000,
    maxDebounce: 8000,
    timeout: 30000,

    async onAuthenticate({ token, documentName, connectionConfig }) {
      const payload = verifyJwt(token, config.secret, { typ: 'ws' });
      if (!payload) throw new Error('协同票据无效或已过期');

      const projectId = projectIdFromRoom(documentName);
      if (!projectId) throw new Error('非法的协同房间');

      const role = projects.role(projectId, payload.sub);
      log('authenticate', documentName, 'user', payload.sub, 'role', role);
      if (!role) throw new Error('无权访问该项目');
      // 只读成员由服务端直接丢弃写入，不能只依赖前端禁用编辑器。
      // hocuspocus 3.2.x 的 payload 字段是 connectionConfig（3.4+ 才叫 connection）
      if (role === 'viewer') {
        try { connectionConfig.readOnly = true; } catch (error) { log('set readOnly failed', error); }
      }

      return { userId: payload.sub, role, projectId };
    },

    async onLoadDocument({ document, documentName }) {
      const state = ydocs.load(documentName);
      log('load', documentName, state ? `stored ${state.length}B` : 'empty');
      if (state) Y.applyUpdate(document, state);
      return document;
    },

    async onStoreDocument({ document, documentName }) {
      ydocs.store(documentName, Y.encodeStateAsUpdate(document));
      log('store', documentName, 'text maps', document.getMap('content').size);

      const projectId = projectIdFromRoom(documentName);
      if (!projectId) return;
      const meta = document.getMap('meta');
      const content = document.getMap('content');
      const snapshot = {
        name: String(meta.get('name') || ''),
        outline: meta.get('outline') || [],
        selectedNodeId: String(meta.get('selectedNodeId') || ''),
        mode: String(meta.get('mode') || ''),
        content: Object.fromEntries(content.entries()),
        updatedAt: new Date().toISOString()
      };
      try {
        if (JSON.stringify(snapshot).length > MAX_SNAPSHOT_BYTES) {
          log('snapshot too large, skip materialize', documentName);
          return;
        }
        projects.saveSnapshot(projectId, snapshot);
      } catch (error) {
        log('materialize failed', error);
      }
    }
  });

  return server.listen().then((instance) => {
    hocuspocus = instance;
    return instance;
  });
}

export async function stopCollab() {
  const current = server;
  server = null;
  hocuspocus = null;
  if (!current) return;
  try { await current.destroy(); } catch { /* ignore */ }
}
