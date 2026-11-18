import Fastify from 'fastify';
import { config } from './config.js';
import { registerRoutes } from './routes.js';
import { startCollab, stopCollab } from './collab.js';

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL || 'info' },
  bodyLimit: 64 * 1024 * 1024
});

await registerRoutes(app);

try {
  await app.listen({ port: config.port, host: config.host });
  await startCollab();
  app.log.info(`协同服务已启动: ws://${config.host}:${config.collabPort}`);
  app.log.info(`API 已启动: http://${config.host}:${config.port}`);
  app.log.info(`数据目录: ${config.dataDir}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

let closing = false;
async function shutdown(signal) {
  if (closing) return;
  closing = true;
  app.log.info(`收到 ${signal}，正在关闭...`);
  try { await stopCollab(); } catch { /* ignore */ }
  try { await app.close(); } catch { /* ignore */ }
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
