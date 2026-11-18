# 云端协同（账号 + 多人实时编辑）

> 本文说明「文档助手」的云端协同功能：架构、数据流、部署、运维与已知限制。
> 局域网协同（同一 Wi-Fi、端口 6536）保持原有能力，不受影响。

---

## 1. 能力概览

| 能力 | 说明 |
|------|------|
| 账号体系 | 邮箱 + 密码注册/登录，access token 30 分钟、refresh token 30 天，refresh token 用 Electron `safeStorage` 加密保存在本机 |
| 项目权限 | 项目级角色：`owner`（所有者）/ `editor`（可编辑）/ `viewer`（只读），服务端强制校验 |
| 实时协同 | 基于 Yjs + Hocuspocus，多人同时编辑同一节点；远端光标、在线名单、断线自动重连 |
| 结构同步 | 大纲（层级、命名、排序）与正文一起同步，任何人的调整都会实时出现在其他人大纲里 |
| 只读成员 | 服务端在 CRDT 层直接丢弃写入，不只依赖前端禁用编辑器 |
| 本地兼容 | 本地 `.mdoc` / 文件夹项目照常使用；可把当前项目上传为云端项目，也可导出云端项目为 `.mdoc` |
| 无需同网 | 客户端只要求能访问协同服务器（公网 HTTPS/WSS 即可） |

---

## 2. 架构

```
┌──────────────── Electron 客户端 ────────────────┐
│ 渲染进程（React + Tiptap）                      │
│  ├─ 首页：云端项目列表 / 登录 / 成员管理         │
│  ├─ 编辑器：Tiptap Collaboration + Yjs          │
│  └─ 通过 window.electronAPI 调用主进程          │
│ 主进程                                          │
│  ├─ cloudClient：令牌存储 + HTTP 转发 + 票据    │
│  └─ 局域网协同服务（另一套，保持不变）           │
└───────────────────┬─────────────────────────────┘
                    │ HTTPS / WSS
┌───────────────────▼─────────────────────────────┐
│ Nginx：TLS 终止、/ → UI、/api → 8080、/collab → 1234 │
├─────────────────────────────────────────────────┤
│ Node 服务（Fastify + Hocuspocus）                 │
│  ├─ REST：账号 / 项目 / 成员 / 票据 / 导出       │
│  └─ 协同：房间 project:<id>，Yjs 增量 + awareness│
├─────────────────────────────────────────────────┤
│ SQLite（WAL）：users / projects / members / ydocs│
└─────────────────────────────────────────────────┘
```

**数据模型（协同文档内）** 与局域网协同完全一致，因此两套模式共用同一编辑器绑定：

- `meta`（Y.Map）：`name`、`outline`（大纲树 JSON）、`selectedNodeId`、`mode`
- `content`（Y.Map）：`nodeId -> HTML`（用于首次播种与导出）
- `node:<id>`（Y.XmlFragment）：单个节点的 Tiptap 富文本，逐字符协同

服务端在 `onStoreDocument` 时把 `meta` + `content` 物化成项目快照，用于项目列表、导出与断线后重建。

---

## 3. 本地开发

```bash
# 1) 启动协同服务器（Node >= 22.5，使用内置 node:sqlite，无需数据库）
cd server
npm install
npm start            # http://127.0.0.1:8080  ws://127.0.0.1:1234

# 2) 启动客户端（另开终端，回到仓库根目录）
npm run dev          # Vite + Electron 开发模式
```

首次使用：

1. 首页「云端协同」→ 登录 / 注册（默认服务器 `http://127.0.0.1:8080`，可在弹窗里改）
2. 「新建云端项目」→ 输入名称 → 自动进入项目
3. 或「上传当前项目」把已打开的本地项目推到云端
4. 「成员」→ 输入对方**已注册**邮箱 → 选择「可编辑 / 只读」

> 想隔离数据（比如同时开两个账号测试）：设置环境变量 `DOC_ASSISTANT_DATA_DIR=/path/to/dir` 再启动客户端。

---

## 4. 部署（2C12G 甲骨文云）

### 4.1 进程

| 进程 | 端口 | 说明 |
|------|------|------|
| Nginx | 80/443 | TLS、静态/反代 |
| Node API | 8080 | Fastify REST |
| Node 协同 | 1234 | Hocuspocus WebSocket |
| SQLite | — | 文件在 `server/data/` |

协同与 API 在同一个 Node 进程内（`server/src/index.js`），单机足够几百人在线。

### 4.2 Nginx

```nginx
server {
  listen 443 ssl http2;
  server_name doc.example.com;

  ssl_certificate     /etc/letsencrypt/live/doc.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/doc.example.com/privkey.pem;

  client_max_body_size 64m;

  location /api/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /collab {
    proxy_pass http://127.0.0.1:1234;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 3600s;   # 别用默认 60s，否则安静文档会反复断线
    proxy_send_timeout 3600s;
    proxy_buffering off;
  }
}
```

启动服务时务必设置：

```bash
PUBLIC_COLLAB_URL=wss://doc.example.com/collab
JWT_SECRET=<随机 48 字节 hex>
```

否则客户端会拿到 `ws://host:1234`，在 HTTPS 页面下被浏览器拦截。

### 4.3 systemd

```ini
[Unit]
Description=DocAssistant Cloud
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/doc-assistant/server
Environment=NODE_ENV=production
Environment=PORT=8080
Environment=COLLAB_PORT=1234
Environment=PUBLIC_COLLAB_URL=wss://doc.example.com/collab
Environment=JWT_SECRET=替换成随机值
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### 4.4 安全清单

1. 安全组/防火墙只开 22、80、443；8080/1234 只听本机或内网
2. SSH 只允许密钥；`fail2ban`
3. `JWT_SECRET` 固定且保密（否则重启后所有登录态失效）
4. 协同票据只在下发后 12 小时内有效，且每次连接都会重新校验成员身份
5. 只读成员的写入在服务端 CRDT 层丢弃
6. 数据库文件权限 600，`server/data/` 不对外暴露

### 4.5 备份

- 唯一不可重建的数据是 `server/data/doc-assistant.db`（含 Yjs 快照）
- 建议每日 `sqlite3 doc-assistant.db ".backup backup.db"` 并同步到对象存储，保留 14 天
- `projects.snapshot` 可随时从 Yjs 重算，但恢复时更省事

---

## 5. 客户端实现要点

| 文件 | 作用 |
|------|------|
| `electron/lib/cloudClient.cjs` | 令牌存储（safeStorage）、HTTP 请求、401 自动刷新、协同票据 |
| `electron/main.cjs` | IPC：`cloud-login/register/logout/session/request/ws-ticket` |
| `src/app/cloud/api.ts` | 渲染进程侧的 REST 封装（全部经主进程转发，令牌不出主进程） |
| `src/app/cloud/useCloudSession.ts` | 登录态、云端项目列表、成员管理 |
| `src/app/collab/useCollabSession.ts` | 新增 `handleStartCloud`：用票据接入 `project:<id>` 房间；房间为空时用本地缓存播种 |
| `src/app/components/project/CloudProjectSection.tsx` | 首页云端区块（登录态、项目卡片、上传/新建/成员） |
| `src/app/document/CloudAuthModal.tsx` / `CloudMembersModal.tsx` | 登录注册 / 成员管理弹窗 |

### 关键行为

- **播种只在房间为空时发生**：服务端创建项目时会写入 `meta.name` 与快照；只有内容为空（新项目）才由第一个打开它的客户端写入默认大纲，避免多人重复写入。
- **云端协同不停止局域网服务**：`teardown({ stopServer })` 会判断 `session.cloud`。
- **离开项目自动断开**：`level` 离开 `project` 时自动退出云端房间并释放连接。
- **保存策略**：正文以 Yjs 为准；本地 `.mdoc` 仍会写一份缓存，用于离线打开与手动导出。

---

## 6. 已知限制 / 后续可做

1. 云端项目**重命名**接口已就绪（`PATCH /api/projects/:id`），界面暂未挂载入口
2. 图片仍以 base64 存在正文里，大图会让协同增量变大；后续应改为对象存储 + URL
3. 离线编辑未启用 `y-indexeddb`，断网期间只能看不能改
4. 服务端未做历史版本/回滚（Yjs 快照已具备基础，可扩展为按时间点回放）
5. 删除项目为软删除，暂未提供回收站

---

## 7. 自动化测试

```bash
# 前提：服务端已启动、前端已构建
npm run server        # 终端 1
npm run build         # 终端 2
npm run test:cloud    # 云端全链路（真实 Electron + 真实服务器）
npm run test:acl      # 只读成员在 CRDT 层被拒绝写入
npm run test:lan      # 局域网协同回归（确认云端改造没破坏原能力）
```

- `test:cloud`：注册登录 → 云端项目列表 → UI 点击进入项目 → 双客户端 Yjs 同步 → 远端大纲变更实时出现在界面 → 在线名单 → 服务端物化快照 → 导出快照
- `test:acl`：非成员拿不到票据、只读成员可以观看但写入被服务端丢弃
- `test:lan`：发起局域网协同 → 第二个客户端连接并同步 → 关闭服务
