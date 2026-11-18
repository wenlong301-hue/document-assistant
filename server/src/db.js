import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';
import { newId, sha256 } from './crypto.js';

const DB_FILE = path.join(config.dataDir, 'doc-assistant.db');
export const db = new DatabaseSync(DB_FILE);

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  snapshot TEXT,
  updated_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','editor','viewer')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON project_members(user_id);

CREATE TABLE IF NOT EXISTS ydocs (
  name TEXT PRIMARY KEY,
  state BLOB NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  project_id TEXT,
  action TEXT NOT NULL,
  target TEXT,
  meta TEXT,
  created_at INTEGER NOT NULL
);
`);

const now = () => Date.now();
const COLORS = ['#134CFF', '#E53E3E', '#15803D', '#D97706', '#7C3AED', '#0F766E', '#DB2777', '#1D4ED8'];

// ---------------- users ----------------
export const users = {
  create({ email, name, passwordHash }) {
    const id = newId();
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    db.prepare('INSERT INTO users (id,email,name,color,password_hash,created_at) VALUES (?,?,?,?,?,?)')
      .run(id, String(email).toLowerCase().trim(), name, color, passwordHash, now());
    return users.byId(id);
  },
  byId(id) {
    return db.prepare('SELECT id,email,name,color,created_at FROM users WHERE id = ?').get(id) || null;
  },
  byEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase().trim()) || null;
  }
};

// ---------------- refresh tokens ----------------
export const tokens = {
  issue(userId, { ttlSec }) {
    const raw = `${newId()}.${Math.random().toString(36).slice(2)}`;
    db.prepare('INSERT INTO refresh_tokens (id,user_id,token_hash,expires_at,created_at) VALUES (?,?,?,?,?)')
      .run(newId(), userId, sha256(raw), now() + ttlSec * 1000, now());
    return raw;
  },
  consume(raw) {
    if (!raw) return null;
    const row = db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?').get(sha256(raw));
    if (!row) return null;
    if (row.revoked_at || row.expires_at < now()) return null;
    db.prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?').run(now(), row.id);
    return row.user_id;
  },
  revoke(raw) {
    if (!raw) return;
    db.prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ?').run(now(), sha256(raw));
  }
};

// ---------------- projects ----------------
export const projects = {
  create(ownerId, name, snapshot) {
    const id = newId();
    const ts = now();
    db.prepare('INSERT INTO projects (id,owner_id,name,snapshot,updated_at,created_at) VALUES (?,?,?,?,?,?)')
      .run(id, ownerId, name, snapshot ? JSON.stringify(snapshot) : null, ts, ts);
    db.prepare('INSERT INTO project_members (project_id,user_id,role,created_at) VALUES (?,?,?,?)')
      .run(id, ownerId, 'owner', ts);
    return projects.byId(id);
  },
  byId(id) {
    const row = db.prepare('SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!row) return null;
    let snapshot = null;
    try { snapshot = row.snapshot ? JSON.parse(row.snapshot) : null; } catch { snapshot = null; }
    return { ...row, snapshot };
  },
  listForUser(userId) {
    return db.prepare(`
      SELECT p.id, p.name, p.updated_at, p.created_at, m.role,
        CASE WHEN p.snapshot IS NULL THEN 0 ELSE 1 END AS has_snapshot
      FROM projects p
      JOIN project_members m ON m.project_id = p.id
      WHERE m.user_id = ? AND p.deleted_at IS NULL
      ORDER BY p.updated_at DESC
    `).all(userId);
  },
  role(projectId, userId) {
    const row = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, userId);
    return row ? row.role : null;
  },
  members(projectId) {
    return db.prepare(`
      SELECT u.id, u.email, u.name, u.color, m.role
      FROM project_members m JOIN users u ON u.id = m.user_id
      WHERE m.project_id = ?
      ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END, u.name
    `).all(projectId);
  },
  addMember(projectId, userId, role) {
    db.prepare('INSERT OR REPLACE INTO project_members (project_id,user_id,role,created_at) VALUES (?,?,?,?)')
      .run(projectId, userId, role, now());
  },
  removeMember(projectId, userId) {
    db.prepare("DELETE FROM project_members WHERE project_id = ? AND user_id = ? AND role <> 'owner'").run(projectId, userId);
  },
  rename(projectId, name) {
    db.prepare('UPDATE projects SET name = ?, updated_at = ? WHERE id = ?').run(name, now(), projectId);
  },
  saveSnapshot(projectId, snapshot) {
    const name = (snapshot && typeof snapshot.name === 'string' && snapshot.name.trim()) || null;
    if (name) {
      db.prepare('UPDATE projects SET snapshot = ?, name = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(snapshot), name, now(), projectId);
    } else {
      db.prepare('UPDATE projects SET snapshot = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(snapshot), now(), projectId);
    }
  },
  softDelete(projectId) {
    db.prepare('UPDATE projects SET deleted_at = ? WHERE id = ?').run(now(), projectId);
  }
};

// ---------------- Yjs 快照 ----------------
export const ydocs = {
  load(name) {
    const row = db.prepare('SELECT state FROM ydocs WHERE name = ?').get(name);
    return row ? new Uint8Array(row.state) : null;
  },
  store(name, state) {
    db.prepare('INSERT INTO ydocs (name,state,updated_at) VALUES (?,?,?) ON CONFLICT(name) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at')
      .run(name, state, now());
  },
  remove(name) {
    db.prepare('DELETE FROM ydocs WHERE name = ?').run(name);
  }
};

export function audit(userId, projectId, action, target, meta) {
  try {
    db.prepare('INSERT INTO audit_log (user_id,project_id,action,target,meta,created_at) VALUES (?,?,?,?,?,?)')
      .run(userId || null, projectId || null, action, target || null, meta ? JSON.stringify(meta) : null, now());
  } catch { /* 审计失败不影响主流程 */ }
}

export const dbFile = DB_FILE;
