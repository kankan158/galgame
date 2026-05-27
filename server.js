const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Database = require('better-sqlite3');

const APP_PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const dbPath = path.join(DATA_DIR, 'ai-tryon.db');
const db = new Database(dbPath);

// Initialize tables
db.prepare(`
  CREATE TABLE IF NOT EXISTS wardrobe_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    name TEXT,
    note TEXT,
    image_url TEXT,
    created_at INTEGER
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    nickname TEXT,
    bio TEXT,
    avatar_url TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS body_info (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    height INTEGER,
    weight INTEGER,
    shape TEXT
  )
`).run();

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// serve uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const safe = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, safe);
  }
});
const upload = multer({ storage });

// Wardrobe CRUD
app.get('/api/wardrobe', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM wardrobe_items ORDER BY created_at DESC').all();
    res.json({ ok: true, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/wardrobe', upload.single('image'), (req, res) => {
  try {
    const { category, name, note } = req.body;
    const created_at = Date.now();
    let image_url = null;
    if (req.file) image_url = '/uploads/' + req.file.filename;
    const stmt = db.prepare('INSERT INTO wardrobe_items (category, name, note, image_url, created_at) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(category || '', name || '', note || '', image_url, created_at);
    const item = db.prepare('SELECT * FROM wardrobe_items WHERE id = ?').get(info.lastInsertRowid);
    res.json({ ok: true, item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.put('/api/wardrobe/:id', upload.single('image'), (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM wardrobe_items WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ ok: false, error: 'not found' });
    const { category, name, note } = req.body;
    let image_url = existing.image_url;
    if (req.file) {
      image_url = '/uploads/' + req.file.filename;
      // optional: remove previous file
      if (existing.image_url) {
        const prev = path.join(__dirname, existing.image_url.replace(/^\//, ''));
        if (fs.existsSync(prev)) fs.unlinkSync(prev);
      }
    }
    db.prepare('UPDATE wardrobe_items SET category = ?, name = ?, note = ?, image_url = ? WHERE id = ?')
      .run(category || '', name || '', note || '', image_url, id);
    const item = db.prepare('SELECT * FROM wardrobe_items WHERE id = ?').get(id);
    res.json({ ok: true, item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/wardrobe/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM wardrobe_items WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ ok: false, error: 'not found' });
    if (existing.image_url) {
      const prev = path.join(__dirname, existing.image_url.replace(/^\//, ''));
      if (fs.existsSync(prev)) fs.unlinkSync(prev);
    }
    db.prepare('DELETE FROM wardrobe_items WHERE id = ?').run(id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Profile
app.get('/api/profile', (req, res) => {
  try {
    let profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();
    if (!profile) {
      db.prepare('INSERT INTO profile (id, nickname, bio, avatar_url) VALUES (1, ?, ?, ?)').run('', '', null);
      profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();
    }
    res.json({ ok: true, profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.put('/api/profile', upload.single('avatar'), (req, res) => {
  try {
    const { nickname, bio } = req.body;
    let avatar_url = null;
    const existing = db.prepare('SELECT * FROM profile WHERE id = 1').get();
    if (req.file) {
      avatar_url = '/uploads/' + req.file.filename;
      if (existing && existing.avatar_url) {
        const prev = path.join(__dirname, existing.avatar_url.replace(/^\//, ''));
        if (fs.existsSync(prev)) fs.unlinkSync(prev);
      }
    } else if (existing) avatar_url = existing.avatar_url;
    db.prepare('INSERT OR REPLACE INTO profile (id, nickname, bio, avatar_url) VALUES (1, ?, ?, ?)')
      .run(nickname || '', bio || '', avatar_url);
    const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();
    res.json({ ok: true, profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Body info
app.get('/api/bodyinfo', (req, res) => {
  try {
    let body = db.prepare('SELECT * FROM body_info WHERE id = 1').get();
    if (!body) {
      db.prepare('INSERT INTO body_info (id, height, weight, shape) VALUES (1, NULL, NULL, NULL)').run();
      body = db.prepare('SELECT * FROM body_info WHERE id = 1').get();
    }
    res.json({ ok: true, body });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.put('/api/bodyinfo', (req, res) => {
  try {
    const { height, weight, shape } = req.body;
    db.prepare('INSERT OR REPLACE INTO body_info (id, height, weight, shape) VALUES (1, ?, ?, ?)')
      .run(height || null, weight || null, shape || null);
    const body = db.prepare('SELECT * FROM body_info WHERE id = 1').get();
    res.json({ ok: true, body });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(APP_PORT, () => {
  console.log(`AI Tryon backend listening on http://localhost:${APP_PORT}`);
  console.log(`DB: ${dbPath}`);
});
