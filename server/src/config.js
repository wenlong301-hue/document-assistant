import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

export const config = {
  port: Number(process.env.PORT || 8080),
  collabPort: Number(process.env.COLLAB_PORT || 1234),
  host: process.env.HOST || '0.0.0.0',
  dataDir: path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data')),
  ticketTtlSec: Number(process.env.TICKET_TTL || 12 * 3600),
  accessTtlSec: Number(process.env.ACCESS_TTL || 30 * 60),
  refreshTtlSec: Number(process.env.REFRESH_TTL || 30 * 24 * 3600),
  publicCollabUrl: process.env.PUBLIC_COLLAB_URL || '',
  secret: process.env.JWT_SECRET || ''
};

if (!fs.existsSync(config.dataDir)) fs.mkdirSync(config.dataDir, { recursive: true });

// 未显式配置密钥时生成一次并落盘，保证重启后令牌依然有效
if (!config.secret) {
  const secretFile = path.join(config.dataDir, 'jwt-secret');
  if (fs.existsSync(secretFile)) {
    config.secret = fs.readFileSync(secretFile, 'utf-8').trim();
  } else {
    config.secret = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(secretFile, config.secret, { mode: 0o600 });
  }
}
