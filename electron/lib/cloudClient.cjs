'use strict';

/**
 * 云端客户端（主进程）
 * - access/refresh token 只存在于主进程，渲染进程通过 IPC 请求
 * - refresh token 用 Electron safeStorage 加密落盘
 */

const fs = require('fs');
const path = require('path');
const { safeStorage } = require('electron');
const { ensureDir } = require('./markdownExport.cjs');

const DEFAULT_SERVER = 'http://127.0.0.1:8080';
const REQUEST_TIMEOUT = 20000;

function normalizeServerUrl(input) {
  let url = String(input || '').trim();
  if (!url) url = DEFAULT_SERVER;
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url.replace(/\/+$/, '');
}

function createCloudClient({ dataDir }) {
  const CONFIG_FILE = path.join(dataDir, 'cloud.json');
  const AUTH_FILE = path.join(dataDir, 'cloud-auth.bin');

  let config = { serverUrl: DEFAULT_SERVER, projectId: null };
  let auth = null;
  let refreshing = null;

  function loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        config = {
          serverUrl: normalizeServerUrl(raw.serverUrl),
          projectId: raw.projectId || null
        };
      }
    } catch { /* 配置损坏时回退默认值 */ }
    return config;
  }

  function saveConfig() {
    ensureDir(dataDir);
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  }

  function saveAuth() {
    ensureDir(dataDir);
    if (!auth) {
      if (fs.existsSync(AUTH_FILE)) fs.unlinkSync(AUTH_FILE);
      return;
    }
    const payload = JSON.stringify(auth);
    if (safeStorage.isEncryptionAvailable()) {
      fs.writeFileSync(AUTH_FILE, safeStorage.encryptString(payload));
    } else {
      fs.writeFileSync(AUTH_FILE, Buffer.from(payload, 'utf-8'));
    }
  }

  function loadAuth() {
    try {
      if (!fs.existsSync(AUTH_FILE)) return null;
      const raw = fs.readFileSync(AUTH_FILE);
      const text = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(raw) : raw.toString('utf-8');
      const parsed = JSON.parse(text);
      return parsed && parsed.refreshToken ? parsed : null;
    } catch {
      return null;
    }
  }

  function clearAuth() {
    auth = null;
    saveAuth();
  }

  async function http(method, pathname, body, { token } = {}) {
    const headers = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(`${config.serverUrl}${pathname}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT)
    });
    const text = await res.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
    }
    return { ok: res.ok, status: res.status, data };
  }

  async function refreshTokens() {
    if (!auth || !auth.refreshToken) return false;
    if (refreshing) return refreshing;
    refreshing = (async () => {
      try {
        const res = await http('POST', '/api/auth/refresh', { refreshToken: auth.refreshToken });
        if (!res.ok || !res.data || !res.data.accessToken) {
          clearAuth();
          return false;
        }
        auth = { accessToken: res.data.accessToken, refreshToken: res.data.refreshToken, user: res.data.user };
        saveAuth();
        return true;
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  }

  async function request(method, pathname, body) {
    if (!pathname.startsWith('/api/')) throw new Error('非法接口路径');
    if (!auth) auth = loadAuth();
    if (!auth) {
      const err = new Error('请先登录');
      err.status = 401;
      throw err;
    }
    let res = await http(method, pathname, body, { token: auth.accessToken });
    if (res.status === 401) {
      const refreshed = await refreshTokens();
      if (!refreshed) {
        const err = new Error('登录已过期，请重新登录');
        err.status = 401;
        throw err;
      }
      res = await http(method, pathname, body, { token: auth.accessToken });
    }
    if (!res.ok) {
      const err = new Error((res.data && res.data.error) || `请求失败 (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return res.data;
  }

  function applySession(data) {
    auth = { accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user };
    saveAuth();
    return { user: data.user, serverUrl: config.serverUrl, projectId: config.projectId };
  }

  return {
    loadConfig,
    getConfig: () => ({ ...config }),

    setServerUrl(serverUrl) {
      config.serverUrl = normalizeServerUrl(serverUrl);
      saveConfig();
      return { ...config };
    },

    setProject(projectId) {
      config.projectId = projectId || null;
      saveConfig();
    },

    async login({ serverUrl, email, password } = {}) {
      if (serverUrl) { config.serverUrl = normalizeServerUrl(serverUrl); saveConfig(); }
      const res = await http('POST', '/api/auth/login', { email, password });
      if (!res.ok) throw new Error((res.data && res.data.error) || '登录失败');
      return applySession(res.data);
    },

    async register({ serverUrl, name, email, password } = {}) {
      if (serverUrl) { config.serverUrl = normalizeServerUrl(serverUrl); saveConfig(); }
      const res = await http('POST', '/api/auth/register', { email, password, name });
      if (!res.ok) throw new Error((res.data && res.data.error) || '注册失败');
      return applySession(res.data);
    },

    async logout() {
      const refreshToken = auth && auth.refreshToken;
      clearAuth();
      config.projectId = null;
      saveConfig();
      if (refreshToken) {
        try { await http('POST', '/api/auth/logout', { refreshToken }); } catch { /* ignore */ }
      }
      return true;
    },

    async session() {
      if (!auth) auth = loadAuth();
      if (!auth) return { user: null, serverUrl: config.serverUrl, projectId: config.projectId };
      try {
        const me = await request('GET', '/api/me');
        auth.user = me.user;
        saveAuth();
        return { user: auth.user, serverUrl: config.serverUrl, projectId: config.projectId };
      } catch (err) {
        if (err && err.status === 401) return { user: null, serverUrl: config.serverUrl, projectId: null };
        return { user: auth.user || null, serverUrl: config.serverUrl, projectId: config.projectId };
      }
    },

    request,

    async wsTicket(projectId) {
      const data = await request('POST', '/api/ws-ticket', { projectId });
      return { collabUrl: data.collabUrl, ticket: data.ticket, role: data.role, ttl: data.ttl };
    },

    async health() {
      const res = await http('GET', '/api/health');
      return res.ok ? res.data : null;
    }
  };
}

module.exports = { createCloudClient, normalizeServerUrl, DEFAULT_SERVER };
