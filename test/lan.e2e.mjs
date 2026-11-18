/**
 * 局域网协同回归测试（确认云端改造没有破坏原有能力）
 * 运行：node test/lan.e2e.mjs
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CDP_PORT = Number(process.env.CDP_PORT || 9334);
const stamp = Date.now().toString(36);
const DATA_DIR = path.join(process.env.OPENCODE_TMP || "/tmp", `da-lan-${stamp}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const ok = (label, cond, extra) => {
  if (cond) console.log(`  ✅ ${label}`);
  else { failures++; console.log(`  ❌ ${label}`, extra === undefined ? "" : JSON.stringify(extra)); }
};

function connectCDP(wsUrl) {
  const ws = new WebSocket(wsUrl, { perMessageDeflate: false, maxPayload: 64 * 1024 * 1024 });
  let seq = 0;
  const pending = new Map();
  const errors = [];
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
      return;
    }
    if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text);
  });
  const ready = new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result?.value;
  };
  return { ready, send, evaluate, errors, close: () => ws.close() };
}

async function waitForTarget(timeout = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
      const page = list.find((t) => t.type === "page" && /index\.html/.test(t.url));
      if (page) return page;
    } catch { /* not ready */ }
    await sleep(300);
  }
  throw new Error("Electron 未暴露调试端口");
}

const main = async () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const electronBin = path.join(ROOT, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
  const child = spawn(electronBin, [ROOT, `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${path.join(DATA_DIR, "userdata")}`], {
    cwd: ROOT,
    env: { ...process.env, DOC_ASSISTANT_DATA_DIR: DATA_DIR },
    stdio: ["ignore", "ignore", "pipe"]
  });

  let cdp;
  let provider;
  try {
    const target = await waitForTarget();
    cdp = connectCDP(target.webSocketDebuggerUrl);
    await cdp.ready;
    await cdp.send("Runtime.enable");
    await sleep(1200);
    ok("渲染进程已连接", true);

    const started = await waitFor(() => cdp.evaluate(`window.electronAPI.startCollab(6536)`), 20000);
    ok("可发起局域网协同", !!started?.token && !!started?.wsUrl, started);

    const doc = new Y.Doc();
    provider = new HocuspocusProvider({
      url: started.wsUrl,
      name: started.room || "doc-assistant",
      token: started.token,
      document: doc
    });
    await waitFor(() => provider.isSynced, 15000);
    ok("局域网协同可连接并同步", provider.isSynced === true);

    doc.getText("probe").insert(0, "lan-ok");
    await sleep(600);
    ok("局域网写入正常", doc.getText("probe").toString() === "lan-ok");

    const stopped = await cdp.evaluate(`window.electronAPI.stopCollab().then(() => true)`);
    ok("可关闭局域网协同", stopped === true);
    ok("无渲染进程异常", cdp.errors.length === 0, cdp.errors.slice(0, 2));
  } finally {
    try { provider?.destroy(); } catch { /* ignore */ }
    try { cdp?.close(); } catch { /* ignore */ }
    await sleep(300);
    child.kill("SIGKILL");
    await sleep(500);
    try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  console.log(`\n${failures === 0 ? "🎉 局域网协同回归通过" : `⚠️  ${failures} 项失败`}\n`);
  process.exit(failures === 0 ? 0 : 1);
};

async function waitFor(fn, timeout = 10000, interval = 200) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = await fn();
    if (value) return value;
    await sleep(interval);
  }
  return null;
}

main().catch((error) => {
  console.error("\n💥 测试异常:", error);
  try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
  process.exit(1);
});
