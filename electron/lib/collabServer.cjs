'use strict';

const crypto = require('crypto');
const { Server } = require('@hocuspocus/server');

const COLLAB_PORT = 6536;
const ROOM_NAME = 'doc-assistant';

function randomToken() {
  return crypto.randomBytes(9).toString('base64url');
}

function listenOnPort(server, port) {
  return new Promise((resolve, reject) => {
    const httpServer = server.httpServer;
    const originalListen = httpServer.listen.bind(httpServer);
    httpServer.listen = (options, callback) => {
      if (options && typeof options === 'object') {
        const next = { ...options, host: options.host || options.address || '0.0.0.0' };
        delete next.address;
        return originalListen(next, callback);
      }
      return originalListen(options, callback);
    };
    const onError = (error) => {
      httpServer.off('error', onError);
      reject(error);
    };
    httpServer.once('error', onError);
    server.listen(port).then(() => {
      httpServer.off('error', onError);
      resolve(server);
    }).catch((error) => {
      httpServer.off('error', onError);
      reject(error);
    });
  });
}

function createCollabServer() {
  let server = null;
  let hostToken = '';
  let started = false;

  async function startCollabServer(port = COLLAB_PORT) {
    if (started && server) {
      const bound = Number(server.address?.port) || port || COLLAB_PORT;
      return { port: bound, token: hostToken, room: ROOM_NAME };
    }

    hostToken = randomToken();
    const preferred = Number(port) || COLLAB_PORT;
    const tryPorts = [preferred];
    for (let p = preferred + 1; p < preferred + 20; p++) tryPorts.push(p);

    let lastError = null;
    for (const listenPort of tryPorts) {
      const next = new Server({
        name: '文档助手协同',
        address: '0.0.0.0',
        port: listenPort,
        quiet: true,
        stopOnSignals: false,
        debounce: 2000,
        timeout: 30000,
        async onAuthenticate({ token }) {
          if (!token || String(token) !== hostToken) {
            throw new Error('协同口令不正确');
          }
          return { user: { role: 'editor' } };
        },
      });
      try {
        await listenOnPort(next, listenPort);
        server = next;
        started = true;
        const bound = Number(next.address?.port) || listenPort;
        return { port: bound, token: hostToken, room: ROOM_NAME };
      } catch (error) {
        lastError = error;
        try { await next.destroy(); } catch {}
        if (error && error.code === 'EADDRINUSE') continue;
        throw error;
      }
    }
    throw lastError || new Error('EADDRINUSE');
  }

  async function stopCollabServer() {
    if (!server) {
      started = false;
      hostToken = '';
      return;
    }
    const current = server;
    server = null;
    started = false;
    hostToken = '';
    try {
      await Promise.race([
        current.destroy(),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);
    } catch {}
  }

  return {
    startCollabServer,
    stopCollabServer,
    getCollabToken: () => hostToken,
    isCollabStarted: () => started,
  };
}

module.exports = { createCollabServer, COLLAB_PORT, ROOM_NAME };
