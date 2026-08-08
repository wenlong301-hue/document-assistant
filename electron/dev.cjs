const { spawn } = require('child_process');
const http = require('http');

const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

const vite = spawn('npx', ['vite'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

let electronProc = null;
let shuttingDown = false;

function waitForVite(url, retries = 60, intervalMs = 500) {
  return new Promise((resolve, reject) => {
    const tryOnce = (left) => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (left <= 0) reject(new Error(`Vite dev server not ready: ${url}`));
        else setTimeout(() => tryOnce(left - 1), intervalMs);
      });
    };
    tryOnce(retries);
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  try { electronProc?.kill(); } catch {}
  try { vite.kill(); } catch {}
  process.exit(code);
}

waitForVite(DEV_URL)
  .then(() => {
    electronProc = spawn('npx', ['electron', '.', '--dev'], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: DEV_URL,
      },
    });
    electronProc.on('exit', (code) => shutdown(code || 0));
  })
  .catch((error) => {
    console.error(error.message || error);
    shutdown(1);
  });

vite.on('exit', (code) => {
  if (!shuttingDown) shutdown(code || 0);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
