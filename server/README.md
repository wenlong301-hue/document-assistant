# 文档助手 云端协同服务

完整说明见 [../docs/CLOUD.md](../docs/CLOUD.md)。

```bash
npm install
cp .env.example .env    # 按需修改
npm start               # API :8080 / WebSocket :1234
```

- 依赖 Node >= 22.5（使用内置 `node:sqlite`，不需要额外数据库）
- 数据目录默认 `server/data/`，含账号、项目、Yjs 快照与密钥
- 生产环境必须设置固定的 `JWT_SECRET` 与 `PUBLIC_COLLAB_URL`
