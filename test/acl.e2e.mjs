/**
 * 权限回归测试：只读成员在 CRDT 层无法写入；非成员拿不到票据
 * 运行：node test/acl.e2e.mjs
 */
import WebSocket from "ws";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";

const BASE = process.env.BASE || "http://127.0.0.1:8080";
const stamp = Date.now().toString(36);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const ok = (label, cond, extra) => {
  if (cond) console.log(`  ✅ ${label}`);
  else { failures++; console.log(`  ❌ ${label}`, extra === undefined ? "" : JSON.stringify(extra)); }
};

async function api(p, { method = "GET", token, body } = {}) {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: { ...(body ? { "content-type": "application/json" } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

async function connect(url, room, token) {
  const doc = new Y.Doc();
  const provider = new HocuspocusProvider({ url, name: room, token, document: doc });
  const started = Date.now();
  while (!provider.isSynced && Date.now() - started < 15000) await sleep(100);
  return { provider, doc };
}

const main = async () => {
  const owner = await api("/api/auth/register", { method: "POST", body: { email: `owner-${stamp}@test.dev`, password: "pass12345", name: "所有者" } });
  const viewer = await api("/api/auth/register", { method: "POST", body: { email: `viewer-${stamp}@test.dev`, password: "pass12345", name: "只读成员" } });
  const stranger = await api("/api/auth/register", { method: "POST", body: { email: `x-${stamp}@test.dev`, password: "pass12345", name: "路人" } });
  ok("注册三个账号", [owner, viewer, stranger].every((r) => r.status === 200));
  const ownerToken = owner.data.accessToken;

  const project = await api("/api/projects", { method: "POST", token: ownerToken, body: { name: `权限测试-${stamp}` } });
  const projectId = project.data.project.id;
  await api(`/api/projects/${projectId}/members`, { method: "POST", token: ownerToken, body: { email: `viewer-${stamp}@test.dev`, role: "viewer" } });
  ok("邀请只读成员", true);

  const noTicket = await api("/api/ws-ticket", { method: "POST", token: stranger.data.accessToken, body: { projectId } });
  ok("非成员拿不到协同票据(403)", noTicket.status === 403, noTicket.data);

  const ownerTicket = await api("/api/ws-ticket", { method: "POST", token: ownerToken, body: { projectId } });
  const viewerTicket = await api("/api/ws-ticket", { method: "POST", token: viewer.data.accessToken, body: { projectId } });
  ok("只读成员可以拿到票据（用于只读观看）", viewerTicket.status === 200);
  ok("票据声明了角色", viewerTicket.data.role === "viewer" && ownerTicket.data.role === "owner", { v: viewerTicket.data.role, o: ownerTicket.data.role });

  const ownerConn = await connect(ownerTicket.data.collabUrl, `project:${projectId}`, ownerTicket.data.ticket);
  const viewerConn = await connect(viewerTicket.data.collabUrl, `project:${projectId}`, viewerTicket.data.ticket);
  ok("两端都连接成功", ownerConn.provider.isSynced && viewerConn.provider.isSynced);

  ownerConn.doc.getMap("meta").set("name", `权限测试-${stamp}`);
  await sleep(600);
  ok("所有者写入生效", viewerConn.doc.getMap("meta").get("name") === `权限测试-${stamp}`);

  viewerConn.doc.getMap("meta").set("name", "只读成员篡改");
  viewerConn.doc.getMap("content").set("evil", "<p>越权内容</p>");
  await sleep(1200);
  ok("只读成员写入被服务端丢弃", ownerConn.doc.getMap("meta").get("name") === `权限测试-${stamp}`, ownerConn.doc.getMap("meta").get("name"));
  ok("只读成员无法写入正文", !ownerConn.doc.getMap("content").has("evil"));

  // 第三方只读校验：新连接读取到的仍应是所有者内容
  const checker = await connect(ownerTicket.data.collabUrl, `project:${projectId}`, ownerTicket.data.ticket);
  await sleep(400);
  ok("新连接看到的是权威内容", checker.doc.getMap("meta").get("name") === `权限测试-${stamp}`);

  ownerConn.provider.destroy();
  viewerConn.provider.destroy();
  checker.provider.destroy();

  console.log(`\n${failures === 0 ? "🎉 权限测试全部通过" : `⚠️  ${failures} 项失败`}\n`);
  process.exit(failures === 0 ? 0 : 1);
};

main().catch((error) => {
  console.error("\n💥 测试异常:", error);
  process.exit(1);
});
