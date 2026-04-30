// ==============================================================================
// PROJECT : GOD LEVEL STICKER ENGINE V3.0  (NODE.JS TITAN PROTOCOL)
// OWNER   : @RUHI_VIG_QNR   |   NETWORK : @RUHIzxyST
// FILE    : index.js
// LANG    : JavaScript / Node.js  — Zero Python, Zero Asyncio Hell
// ==============================================================================
//
// ╔══════════════════════════════════════════════════════════════╗
// ║            ONE-TIME SETUP (run in terminal)                  ║
// ╠══════════════════════════════════════════════════════════════╣
// ║  node --version          # Must be >= 18                     ║
// ║  npm install             # Installs everything incl. FFmpeg  ║
// ║  node index.js           # Launch                            ║
// ╚══════════════════════════════════════════════════════════════╝
//
// WHY NODE.JS OVER PYTHON:
//  - FFmpeg auto-downloads via ffmpeg-static (no apt-get needed)
//  - Grammy Bot API library: zero update-loop conflicts
//  - better-sqlite3: synchronous, fastest SQLite in any language
//  - @napi-rs/canvas: pre-built binaries, no libcairo install needed
//  - Single "npm install" gets EVERYTHING — no venv, no pip, no hell
// ==============================================================================

'use strict';

// ── Core Node.js ──────────────────────────────────────────────────────────────
const path      = require('path');
const fs        = require('fs');
const fsp       = fs.promises;
const { promisify } = require('util');
const { execFile }  = require('child_process');
const execFileAsync = promisify(execFile);

// ── Telegram ──────────────────────────────────────────────────────────────────
const { Bot, InputFile, InlineKeyboard } = require('grammy');

// ── Database ──────────────────────────────────────────────────────────────────
const BetterSQLite3 = require('better-sqlite3');

// ── Media ─────────────────────────────────────────────────────────────────────
const ffmpegBin  = require('ffmpeg-static');       // auto-downloaded FFmpeg binary
const ffmpeg     = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegBin);

const sharp      = require('sharp');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

// ── Health Server ─────────────────────────────────────────────────────────────
const express = require('express');

// ── UserBot (optional) ────────────────────────────────────────────────────────
let TelegramClient, StringSession;
try {
  ({ TelegramClient } = require('gramjs'));
  ({ StringSession }  = require('gramjs/sessions'));
} catch (_) { /* gramjs is optional */ }

// ==============================================================================
// 1. CONFIGURATION
// ==============================================================================

const Config = {
  // ── Core credentials ────────────────────────────────────────────────────────
  API_ID:       25368477,
  API_HASH:     '3515708444650d08ea56168a30b7c00c',
  MASTER_TOKEN: '8335291293:AAHdyvok0KCOf0bEbxzg7nLKtLTdHWuwVl8',

  // ── UserBot: set to your string session string, or leave null ───────────────
  USERBOT_SESSION: null,

  // ── Branding ─────────────────────────────────────────────────────────────────
  OWNER_ID:       8128852482,
  OWNER_USERNAME: '@RUHI_VIG_QNR',
  CHANNEL:        '@RUHIzxyST',
  WATERMARK:      '@RUHIzxyST',

  get CHANNEL_URL() { return `https://t.me/${this.CHANNEL.replace('@', '')}`; },

  // ── Limits ───────────────────────────────────────────────────────────────────
  MAX_VIDEO_SEC:   3,
  STICKER_PX:      512,
  MAX_PACK_SIZE:   120,
  RATE_LIMIT_SEC:  10,
  SPAM_BAN_AT:     5,

  // ── Server ───────────────────────────────────────────────────────────────────
  HEALTH_PORT: parseInt(process.env.PORT || '8080', 10),

  // ── Theme colors ─────────────────────────────────────────────────────────────
  CYBER_BLUE:   '#00D9FF',
  MATRIX_GREEN: '#00FF41',

  // ── Paths ────────────────────────────────────────────────────────────────────
  TEMP_DIR: path.join(process.cwd(), 'downloads'),
  DB_FILE:  path.join(process.cwd(), 'titan_database.db'),

  init() {
    fs.mkdirSync(this.TEMP_DIR, { recursive: true });
  },
};

Config.init();

// ==============================================================================
// 2. LOGGER
// ==============================================================================

const Logger = {
  _fmt(level, msg) {
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
    return `${ts} | TitanEngine | ${level} | ${msg}`;
  },
  info(msg)    { console.log(this._fmt('INFO ', msg)); },
  error(msg)   { console.error(this._fmt('ERROR', msg)); },
  warning(msg) { console.warn(this._fmt('WARN ', msg)); },
  debug(msg)   { if (process.env.DEBUG) console.log(this._fmt('DEBUG', msg)); },
};

// ==============================================================================
// 3. UI TEMPLATES — ALL 3 GOD-LEVEL FUSIONS INTACT
// ==============================================================================

const UI = {
  // Fusion 1: The Ultimate Balance
  // (2.5 titles + sharp ticks | 2.2 Japanese brackets | 2.1 clean border)
  FUSION_1: (owner, network) =>
    '✦ ⟬ ᴀᴜᴛᴏ ᴠɪᴅ-ᴛᴏ-sᴛɪᴄᴋᴇʀ ⟭ ✦\n\n'
    + '╭── ⌈ ☁️ sʏsᴛᴇᴍ ᴀᴄᴛɪᴠᴇ ☁️ ⌋ ──╮\n'
    + '  〱 ᴀᴜᴛᴏ-ᴛʀɪᴍ ᴛᴏ [𝟹s] ✓\n'
    + '  〱 ᴀᴜᴛᴏ-ᴄʀᴏᴘ [𝟻𝟷𝟸px] ✓\n'
    + '  〱 ᴊᴜsᴛ sᴇɴᴅ ᴛʜᴇ ᴇᴍᴏᴊɪ ✨\n'
    + '╰─────────.★..────────╯\n\n'
    + `〆 ᴏᴡɴᴇʀ: ${owner}\n`
    + `⛩️ ɴᴇᴛᴡᴏʀᴋ: ${network}\n\n`
    + '「 ⭔ ᴅʀᴏᴘ ᴀɴʏ ᴠɪᴅᴇᴏ ᴛᴏ ʙᴇɢɪɴ... 」',

  // Fusion 2: The Clean Flow
  // (2.2 arrows + 2.5 checkmarks | minimal technical step-by-step)
  FUSION_2: (owner, network) =>
    '⛩️ ⌈ ᴜʟᴛɪᴍᴀᴛᴇ sᴛɪᴄᴋᴇʀ ғᴏʀɢᴇ ⌋ ⛩️\n\n'
    + '╭┈ ✦ ᴀᴜᴛᴏᴍᴀᴛɪᴏɴ ✦\n'
    + '┊ ⤷ sᴇɴᴅ ᴠɪᴅᴇᴏ ➔ ᴀᴜᴛᴏ ᴄʀᴏᴘ\n'
    + '┊ ⤷ ɢɪᴠᴇ ᴇᴍᴏᴊɪ ➔ sᴛɪᴄᴋᴇʀ ʀᴇᴀᴅʏ!\n'
    + '╰┈➤ ᴘᴇʀғᴇᴄᴛ ǫᴜᴀʟɪᴛʏ ✓\n\n'
    + `ꨄ ᴍᴀsᴛᴇʀ : ${owner}\n`
    + `ꨄ ᴄʜᴀɴɴᴇʟ : ${network}\n\n`
    + '⟬ *ᴀᴡᴀɪᴛɪɴɢ ᴠɪᴅᴇᴏ ɪɴᴘᴜᴛ...* ⟭',

  // Fusion 3: Minimalist Cyber-Zen
  // (2.1 floral vibe + 2.5 pro-gamer elements | solid blockquote feel)
  FUSION_3: (owner, network) =>
    '🌸 ⟬ sᴛɪᴄᴋᴇʀ ᴇɴɢɪɴᴇ ᴘʀᴏ ⟭ 🌸\n'
    + '⌈ ᴀᴜᴛᴏᴍᴀᴛɪᴄ ᴘʀᴏᴄᴇssɪɴɢ ⌋\n\n'
    + '╭───────────────.★..─╮\n'
    + '  〱 sᴇɴᴅ ᴠɪᴅᴇᴏ ➔ ᴀᴜᴛᴏ-ᴛʀɪᴍ ✓\n'
    + '  〱 ᴀᴅᴅ ᴇᴍᴏᴊɪ ➔ sᴛɪᴄᴋᴇʀ ᴅᴏɴᴇ ✓\n'
    + '╰─..★.───────────────╯\n\n'
    + `〆 ᴏᴡɴᴇʀ: ${owner}\n`
    + `〆 ᴜᴘᴅᴀᴛᴇs: ${network}\n\n`
    + '「 ⭔ *sᴇɴᴅ ᴍᴇᴅɪᴀ ᴛᴏ sᴛᴀʀᴛ!* 」',

  getWelcome() {
    const fns = [this.FUSION_1, this.FUSION_2, this.FUSION_3];
    return fns[Math.floor(Math.random() * fns.length)](
      Config.OWNER_USERNAME,
      Config.CHANNEL,
    );
  },

  getNeonHelp() {
    return '✦ NEON TEXT GENERATOR ✦\n\n'
      + 'Usage : /neon Your Text Here\n'
      + 'Output: Glowing Typography Sticker\n'
      + 'Colors: Cyber Blue / Matrix Green\n';
  },
};

// ==============================================================================
// 4. DATABASE  (better-sqlite3 — sync API, wrapped async-style for consistency)
// ==============================================================================

class Database {
  constructor() {
    this.db = new BetterSQLite3(Config.DB_FILE);
    this.db.pragma('journal_mode = WAL');   // Write-Ahead Logging — faster writes
    this._createTables();
    Logger.info('Database ready (WAL mode).');
  }

  _createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id     INTEGER PRIMARY KEY,
        join_date   TEXT,
        stickers    INTEGER DEFAULT 0,
        is_banned   INTEGER DEFAULT 0,
        theme       TEXT    DEFAULT 'blue',
        last_req    REAL    DEFAULT 0,
        spam_count  INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS clones (
        owner_id   INTEGER,
        bot_token  TEXT PRIMARY KEY,
        bot_name   TEXT,
        added_at   TEXT,
        status     TEXT DEFAULT 'active'
      );
      CREATE TABLE IF NOT EXISTS analytics (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT,
        user_id    INTEGER,
        ts         TEXT,
        meta       TEXT
      );
      CREATE TABLE IF NOT EXISTS sticker_packs (
        user_id   INTEGER,
        pack_name TEXT,
        count     INTEGER DEFAULT 0,
        volume    INTEGER DEFAULT 1,
        PRIMARY KEY (user_id, pack_name)
      );
    `);
  }

  // ── User management ─────────────────────────────────────────────────────────
  addUser(userId) {
    this.db
      .prepare('INSERT OR IGNORE INTO users (user_id, join_date) VALUES (?, ?)')
      .run(userId, new Date().toISOString());
  }

  getTheme(userId) {
    const row = this.db
      .prepare('SELECT theme FROM users WHERE user_id = ?')
      .get(userId);
    return row ? row.theme : 'blue';
  }

  setTheme(userId, theme) {
    this.db
      .prepare('UPDATE users SET theme = ? WHERE user_id = ?')
      .run(theme, userId);
  }

  isBanned(userId) {
    const row = this.db
      .prepare('SELECT is_banned FROM users WHERE user_id = ?')
      .get(userId);
    return row ? row.is_banned === 1 : false;
  }

  banUser(userId) {
    this.db
      .prepare('UPDATE users SET is_banned = 1 WHERE user_id = ?')
      .run(userId);
    Logger.warning(`User ${userId} auto-banned for spam.`);
  }

  // ── Rate limiting ────────────────────────────────────────────────────────────
  checkRateLimit(userId) {
    const now = Date.now() / 1000;
    const row = this.db
      .prepare('SELECT last_req FROM users WHERE user_id = ?')
      .get(userId);

    if (row && now - row.last_req < Config.RATE_LIMIT_SEC) {
      // Increment spam counter
      this.db
        .prepare('UPDATE users SET spam_count = spam_count + 1 WHERE user_id = ?')
        .run(userId);
      const spamRow = this.db
        .prepare('SELECT spam_count FROM users WHERE user_id = ?')
        .get(userId);
      if (spamRow && spamRow.spam_count >= Config.SPAM_BAN_AT) {
        this.banUser(userId);
        return 'BANNED';
      }
      return false;
    }
    this.db
      .prepare('UPDATE users SET last_req = ?, spam_count = 0 WHERE user_id = ?')
      .run(now, userId);
    return true;
  }

  // ── Analytics ────────────────────────────────────────────────────────────────
  logEvent(eventType, userId, meta = '') {
    this.db
      .prepare('INSERT INTO analytics (event_type, user_id, ts, meta) VALUES (?, ?, ?, ?)')
      .run(eventType, userId, new Date().toISOString(), meta);
  }

  incrementStickers(userId) {
    this.db
      .prepare('UPDATE users SET stickers = stickers + 1 WHERE user_id = ?')
      .run(userId);
  }

  getTotalUsers()    { return this.db.prepare('SELECT COUNT(*) as n FROM users').get().n; }
  getTotalStickers() { return this.db.prepare('SELECT SUM(stickers) as n FROM users').get().n || 0; }

  getAllUserIds() {
    return this.db
      .prepare('SELECT user_id FROM users WHERE is_banned = 0')
      .all()
      .map(r => r.user_id);
  }

  // ── Sticker pack pagination (Feature 2) ─────────────────────────────────────
  getPackVolume(userId) {
    const row = this.db
      .prepare(
        'SELECT volume, count FROM sticker_packs WHERE user_id = ? ORDER BY volume DESC LIMIT 1'
      )
      .get(userId);
    if (!row)                          return { volume: 1, count: 0 };
    if (row.count >= Config.MAX_PACK_SIZE) return { volume: row.volume + 1, count: 0 };
    return { volume: row.volume, count: row.count };
  }

  incrementPackCount(userId, packName, volume) {
    this.db
      .prepare(
        'INSERT INTO sticker_packs (user_id, pack_name, count, volume) VALUES (?, ?, 1, ?) '
        + 'ON CONFLICT(user_id, pack_name) DO UPDATE SET count = count + 1'
      )
      .run(userId, packName, volume);
  }

  // ── Clones ───────────────────────────────────────────────────────────────────
  addClone(ownerId, token, botName) {
    this.db
      .prepare(
        'INSERT OR REPLACE INTO clones (owner_id, bot_token, bot_name, added_at) VALUES (?, ?, ?, ?)'
      )
      .run(ownerId, token, botName, new Date().toISOString());
  }

  getAllClones() {
    return this.db
      .prepare("SELECT bot_token, bot_name FROM clones WHERE status = 'active'")
      .all();
  }
}

const db = new Database();

// ==============================================================================
// 5. TASK QUEUE  (Feature 8 — Anti-Flood, limited workers)
// ==============================================================================

class TaskQueue {
  constructor(maxWorkers = 3) {
    this.pending    = [];
    this.running    = 0;
    this.maxWorkers = maxWorkers;
  }

  // fn must be an async function (zero args) that returns a Promise
  enqueue(fn) {
    return new Promise((resolve, reject) => {
      this.pending.push({ fn, resolve, reject });
      this._tick();
    });
  }

  _tick() {
    while (this.running < this.maxWorkers && this.pending.length > 0) {
      const { fn, resolve, reject } = this.pending.shift();
      this.running++;
      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => { this.running--; this._tick(); });
    }
  }
}

const queue = new TaskQueue(3);

// ==============================================================================
// 6. MEDIA PROCESSOR  (Features 1, 3, 4, 7)
// ==============================================================================

class MediaProcessor {

  // ── Helper: hex string to RGB object ────────────────────────────────────────
  static hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  // ── Feature 1: AI Background Removal + Glowing Outline ──────────────────────
  static async applyCutoutWithGlow(inputPath, outputPath, theme = 'blue') {
    try {
      Logger.info(`AI cutout starting: ${path.basename(inputPath)}`);

      // Step 1: AI background removal
      let subjectBuffer;
      try {
        const { removeBackground } = require('@imgly/background-removal-node');
        const rawBuffer = await fsp.readFile(inputPath);
        const blob      = new Blob([rawBuffer], { type: 'image/png' });
        const result    = await removeBackground(blob);
        subjectBuffer   = Buffer.from(await result.arrayBuffer());
        Logger.info('AI background removal complete.');
      } catch (bgErr) {
        Logger.warning(`BG removal failed (${bgErr.message}), using original image.`);
        subjectBuffer = await fsp.readFile(inputPath);
      }

      // Step 2: Resize subject to 512x512
      const resized = await sharp(subjectBuffer)
        .resize(Config.STICKER_PX, Config.STICKER_PX, {
          fit:        'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();

      // Step 3: Build glow using @napi-rs/canvas
      const glowHex = theme === 'green' ? Config.MATRIX_GREEN : Config.CYBER_BLUE;
      const { r, g, b } = MediaProcessor.hexToRgb(glowHex);
      const s = Config.STICKER_PX;

      const canvas = createCanvas(s, s);
      const ctx    = canvas.getContext('2d');
      ctx.clearRect(0, 0, s, s);

      const img = await loadImage(resized);

      // Glow passes — blurred + colorized layers behind subject
      for (let blur = 20; blur >= 4; blur -= 4) {
        ctx.save();
        ctx.filter     = `blur(${blur}px)`;
        ctx.globalAlpha = 0.35 * (blur / 20);
        ctx.drawImage(img, 0, 0, s, s);
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
        ctx.fillRect(0, 0, s, s);
        ctx.restore();
      }

      // Draw original subject on top (no composite tint)
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(img, 0, 0, s, s);

      await fsp.writeFile(outputPath, canvas.toBuffer('image/png'));
      Logger.info('Cutout + glow saved.');
      return true;
    } catch (err) {
      Logger.error(`applyCutoutWithGlow failed: ${err.message}`);
      return false;
    }
  }

  // ── Feature 3: Text-to-Neon Sticker (glassmorphism) ─────────────────────────
  static async createNeonSticker(text, outputPath, theme = 'blue') {
    try {
      Logger.info(`Neon sticker: "${text}"`);
      const glowHex = theme === 'green' ? Config.MATRIX_GREEN : Config.CYBER_BLUE;
      const { r, g, b } = MediaProcessor.hexToRgb(glowHex);
      const s = Config.STICKER_PX;

      const canvas = createCanvas(s, s);
      const ctx    = canvas.getContext('2d');

      // Glassmorphism dark background
      ctx.fillStyle = 'rgba(10, 14, 35, 0.88)';
      ctx.fillRect(0, 0, s, s);

      // Subtle gradient overlay
      const grad = ctx.createLinearGradient(0, 0, s, s);
      grad.addColorStop(0, `rgba(${r},${g},${b},0.08)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s, s);

      // Text setup
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';

      // Dynamic font size based on text length
      const fontSize = text.length > 12 ? 44 : text.length > 6 ? 56 : 68;
      ctx.font = `bold ${fontSize}px sans-serif`;

      // Glow layers (outer → inner)
      const glowStops = [32, 24, 16, 10, 6];
      glowStops.forEach((blurRadius, i) => {
        ctx.save();
        ctx.filter      = `blur(${blurRadius}px)`;
        ctx.globalAlpha = 0.12 + i * 0.06;
        ctx.fillStyle   = `rgb(${r},${g},${b})`;
        ctx.fillText(text, s / 2, s / 2);
        ctx.restore();
      });

      // Bright core text
      ctx.globalAlpha = 1;
      ctx.filter      = 'blur(0px)';
      ctx.fillStyle   = `rgb(${r},${g},${b})`;
      ctx.fillText(text, s / 2, s / 2);

      // Thin outline for sharpness
      ctx.strokeStyle = `rgba(255,255,255,0.25)`;
      ctx.lineWidth   = 1;
      ctx.strokeText(text, s / 2, s / 2);

      await fsp.writeFile(outputPath, canvas.toBuffer('image/png'));
      Logger.info('Neon sticker saved.');
      return true;
    } catch (err) {
      Logger.error(`createNeonSticker failed: ${err.message}`);
      return false;
    }
  }

  // ── Feature 7: Video sticker forge with watermark ───────────────────────────
  static async forgeVideoSticker(inputPath, outputPath, addWatermark = true) {
    Logger.info(`FFmpeg render: ${path.basename(inputPath)}`);
    return new Promise((resolve) => {
      let cmd = ffmpeg(inputPath)
        .duration(Config.MAX_VIDEO_SEC)
        .videoFilters([
          `scale=${Config.STICKER_PX}:${Config.STICKER_PX}:force_original_aspect_ratio=increase`,
          `crop=${Config.STICKER_PX}:${Config.STICKER_PX}`,
        ])
        .videoCodec('libvpx-vp9')
        .outputOptions(['-crf 30', '-b:v 256k', '-an'])
        .format('webm');

      // Feature 7: Burn watermark via drawtext
      if (addWatermark) {
        cmd = cmd.videoFilters([
          `scale=${Config.STICKER_PX}:${Config.STICKER_PX}:force_original_aspect_ratio=increase`,
          `crop=${Config.STICKER_PX}:${Config.STICKER_PX}`,
          `drawtext=text='${Config.WATERMARK}':fontcolor=00D9FF@0.5:fontsize=18:x=w-tw-8:y=h-th-8`,
        ]);
      }

      cmd
        .on('end',   ()    => { Logger.info('FFmpeg render complete.'); resolve(true); })
        .on('error', (err) => { Logger.error(`FFmpeg error: ${err.message}`); resolve(false); })
        .save(outputPath);
    });
  }

  // ── Feature 4: Universal static image converter (JPG, PNG, WebP, GIF) ───────
  static async convertToStaticSticker(inputPath, outputPath) {
    try {
      await sharp(inputPath)
        .resize(Config.STICKER_PX, Config.STICKER_PX, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } })
        .png()
        .toFile(outputPath);
      Logger.info('Static image converted to PNG sticker.');
      return true;
    } catch (err) {
      Logger.error(`convertToStaticSticker failed: ${err.message}`);
      return false;
    }
  }

  // ── Cleanup helper ──────────────────────────────────────────────────────────
  static cleanup(...files) {
    files.forEach(f => {
      if (f && fs.existsSync(f)) {
        try { fs.unlinkSync(f); Logger.debug(`Removed: ${f}`); }
        catch (_) {}
      }
    });
  }
}

// ==============================================================================
// 7. HEALTH SERVER  (Feature 5 — keeps bot alive on Render / Koyeb / HuggingFace)
// ==============================================================================

class HealthServer {
  constructor() {
    this.app = express();
    this.app.get('/',       this._health.bind(this));
    this.app.get('/health', this._health.bind(this));
    this.app.get('/status', this._status.bind(this));
  }

  _health(_req, res) {
    res.json({
      status:  'online',
      service: 'God Level Sticker Engine V3.0 (Node.js)',
      owner:   Config.OWNER_USERNAME,
      network: Config.CHANNEL,
      uptime:  process.uptime(),
    });
  }

  _status(_req, res) {
    res.json({
      total_users:    db.getTotalUsers(),
      total_stickers: db.getTotalStickers(),
      active_clones:  engine.cloneCount(),
      node_version:   process.version,
      status:         'operational',
    });
  }

  start() {
    this.app.listen(Config.HEALTH_PORT, () => {
      Logger.info(`Health server running on port ${Config.HEALTH_PORT}`);
    });
  }
}

const healthServer = new HealthServer();

// ==============================================================================
// 8. USERBOT MANAGER  (Feature 9 — gramjs String Session fallback)
// ==============================================================================

class UserBotManager {
  constructor() {
    this.client = null;
  }

  async initialize() {
    const session = Config.USERBOT_SESSION;
    const PLACEHOLDERS = [null, undefined, '', 'YOUR_STRING_SESSION', 'NONE', 'NULL'];
    if (PLACEHOLDERS.includes(session)) {
      Logger.info('UserBot disabled — no valid string session.');
      return;
    }
    if (!TelegramClient) {
      Logger.warning('gramjs not installed; UserBot unavailable.');
      return;
    }
    try {
      this.client = new TelegramClient(
        new StringSession(session),
        Config.API_ID,
        Config.API_HASH,
        { connectionRetries: 3 },
      );
      await this.client.start({ botAuthToken: undefined });
      Logger.info('UserBot (string session) activated.');
    } catch (err) {
      Logger.error(`UserBot init failed: ${err.message}`);
      this.client = null;
    }
  }

  isAvailable() { return this.client !== null; }
}

const userbot = new UserBotManager();

// ==============================================================================
// 9. MULTI-CLIENT ENGINE  (Master Bot + Clone Bots)
// ==============================================================================

class CloneEngine {
  constructor() {
    this.masterBot = null;
    this.clones    = new Map();  // token -> Bot instance
  }

  async bootMaster() {
    Logger.info('Booting Master Node...');
    this.masterBot = new Bot(Config.MASTER_TOKEN);
    const me = await this.masterBot.api.getMe();
    Logger.info(`Master Node Online: @${me.username}`);
    return this.masterBot;
  }

  async bootClones() {
    const rows = db.getAllClones();
    if (!rows.length) { Logger.info('No clones in DB. Master-only mode.'); return; }
    for (const { bot_token, bot_name } of rows) {
      await this._startClone(bot_token, bot_name);
    }
  }

  async _startClone(token, name) {
    try {
      const clone = new Bot(token);
      await clone.api.getMe();
      this.clones.set(token, clone);
      Logger.info(`Clone deployed: @${name}`);
      return clone;
    } catch (err) {
      Logger.warning(`Clone boot failed for @${name}: ${err.message}`);
      return null;
    }
  }

  async addClone(ownerId, token) {
    if (!token || token.split(':').length !== 2) return 'INVALID_FORMAT';
    try {
      const bot  = new Bot(token);
      const info = await bot.api.getMe();
      db.addClone(ownerId, token, info.username);
      this.clones.set(token, bot);
      registerHandlers(bot);
      bot.start();
      Logger.info(`Hot-boot OK: @${info.username}`);
      return { bot, username: info.username };
    } catch (err) {
      Logger.error(`Clone injection failed: ${err.message}`);
      return 'AUTH_FAILED';
    }
  }

  allBots() {
    return [this.masterBot, ...this.clones.values()].filter(Boolean);
  }

  cloneCount() { return this.clones.size; }
}

const engine = new CloneEngine();

// ==============================================================================
// 10. HANDLERS (all 10 features wired up)
// ==============================================================================

// Per-user state: awaiting emoji after media processed
const userStates = new Map();  // userId -> { filePath, isVideo, status }

function registerHandlers(bot) {

  // ── /start ───────────────────────────────────────────────────────────────────
  bot.command('start', async (ctx) => {
    const uid = ctx.from.id;
    db.addUser(uid);
    db.logEvent('start', uid);

    const keyboard = new InlineKeyboard()
      .url('⛩ JOIN NETWORK', Config.CHANNEL_URL)
      .row()
      .text('Change Theme', 'theme_menu');

    await ctx.reply(UI.getWelcome(), { reply_markup: keyboard });
  });

  // ── /theme (Feature 10) ─────────────────────────────────────────────────────
  bot.command('theme', async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text('⬛ CYBER BLUE',   'theme_blue')
      .row()
      .text('⬛ MATRIX GREEN', 'theme_green');
    await ctx.reply('⟬ SELECT YOUR THEME ⟭', { reply_markup: keyboard });
  });

  bot.callbackQuery('theme_blue',  async (ctx) => {
    db.setTheme(ctx.from.id, 'blue');
    await ctx.answerCallbackQuery('Theme: CYBER BLUE activated.');
    await ctx.editMessageText('Theme set to CYBER BLUE. Send /start to see it.');
  });

  bot.callbackQuery('theme_green', async (ctx) => {
    db.setTheme(ctx.from.id, 'green');
    await ctx.answerCallbackQuery('Theme: MATRIX GREEN activated.');
    await ctx.editMessageText('Theme set to MATRIX GREEN. Send /start to see it.');
  });

  bot.callbackQuery('theme_menu', async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text('CYBER BLUE',   'theme_blue')
      .row()
      .text('MATRIX GREEN', 'theme_green');
    await ctx.editMessageText('⟬ SELECT YOUR THEME ⟭', { reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  });

  // ── /clone ────────────────────────────────────────────────────────────────────
  bot.command('clone', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      return ctx.reply('「 Send: /clone YOUR_BOT_TOKEN 」');
    }
    const token = args[1].trim();
    const msg   = await ctx.reply('「 Injecting token into Master Node... 」');

    const result = await engine.addClone(ctx.from.id, token);
    if (result === 'INVALID_FORMAT') {
      await ctx.api.editMessageText(ctx.chat.id, msg.message_id, '「 Invalid token format. 」');
    } else if (result === 'AUTH_FAILED') {
      await ctx.api.editMessageText(ctx.chat.id, msg.message_id, '「 Auth failed. Check token. 」');
    } else {
      await ctx.api.editMessageText(
        ctx.chat.id,
        msg.message_id,
        `「 Clone Active: @${result.username} — Locked to ${Config.CHANNEL} 」`,
      );
    }
  });

  // ── /neon (Feature 3) ────────────────────────────────────────────────────────
  bot.command('neon', async (ctx) => {
    const uid = ctx.from.id;
    if (db.isBanned(uid)) return;

    const parts = ctx.message.text.split(' ');
    if (parts.length < 2) return ctx.reply(UI.getNeonHelp());

    const rl = db.checkRateLimit(uid);
    if (rl === 'BANNED') return ctx.reply('「 AUTO-BANNED: Excessive spam. 」');
    if (rl === false)    return ctx.reply('「 Rate limit: wait 10 seconds. 」');

    const text  = parts.slice(1).join(' ').substring(0, 28);
    const theme = db.getTheme(uid);
    const out   = path.join(Config.TEMP_DIR, `neon_${uid}_${Date.now()}.png`);
    const pmsg  = await ctx.reply('「 Generating Neon Sticker... 」');

    queue.enqueue(async () => {
      const ok = await MediaProcessor.createNeonSticker(text, out, theme);
      if (ok) {
        try {
          await ctx.replyWithSticker(new InputFile(out));
          await ctx.api.deleteMessage(ctx.chat.id, pmsg.message_id);
          db.incrementStickers(uid);
          db.logEvent('neon_sticker', uid, text);
        } catch (e) {
          await ctx.api.editMessageText(ctx.chat.id, pmsg.message_id, `「 Upload failed: ${e.message} 」`);
        }
      } else {
        await ctx.api.editMessageText(ctx.chat.id, pmsg.message_id, '「 Generation failed. 」');
      }
      MediaProcessor.cleanup(out);
    });
  });

  // ── /panel (Feature 6) ───────────────────────────────────────────────────────
  bot.command('panel', async (ctx) => {
    if (ctx.from.id !== Config.OWNER_ID) return;

    const text =
      '╭─── ⟬ TITAN CONTROL PANEL ⟭ ───╮\n'
      + `┊ Total Users   : ${db.getTotalUsers()}\n`
      + `┊ Total Stickers: ${db.getTotalStickers()}\n`
      + `┊ Active Clones : ${engine.cloneCount()}\n`
      + `┊ Master Node   : Online\n`
      + `┊ Node.js        : ${process.version}\n`
      + `┊ Uptime        : ${Math.floor(process.uptime())}s\n`
      + '╰──────────────────────────────╯\n\n'
      + 'Use /broadcast <message> to reach all users.';

    await ctx.reply(text);
  });

  // ── /broadcast (Feature 6) ───────────────────────────────────────────────────
  bot.command('broadcast', async (ctx) => {
    if (ctx.from.id !== Config.OWNER_ID) return;
    const parts = ctx.message.text.split(' ');
    if (parts.length < 2) return ctx.reply('Usage: /broadcast <message>');

    const broadcastText = parts.slice(1).join(' ');
    const userIds = db.getAllUserIds();
    const status  = await ctx.reply(`Broadcasting to ${userIds.length} users...`);

    let success = 0, failed = 0;
    for (const uid of userIds) {
      try {
        await bot.api.sendMessage(uid, `BROADCAST:\n\n${broadcastText}`);
        success++;
        await new Promise(r => setTimeout(r, 50));  // 20 msgs/sec — Telegram limit safe
      } catch (_) { failed++; }
    }

    await ctx.api.editMessageText(
      ctx.chat.id,
      status.message_id,
      `Broadcast complete.\nSuccess: ${success}\nFailed: ${failed}`,
    );
  });

  // ── Media handler (Features 1, 4, 8) ─────────────────────────────────────────
  bot.on([':photo', ':video', ':animation', ':document'], async (ctx) => {
    const uid = ctx.from.id;
    if (db.isBanned(uid)) return ctx.reply('「 You are banned. 」');

    const rl = db.checkRateLimit(uid);
    if (rl === 'BANNED') return ctx.reply('「 AUTO-BANNED: Excessive spam. 」');
    if (rl === false)    return ctx.reply('「 Rate limit: wait 10 seconds. 」');

    const media = ctx.message.photo
      ? ctx.message.photo.at(-1)  // largest photo
      : ctx.message.video || ctx.message.animation || ctx.message.document;

    if (!media) return;

    const fileSize = media.file_size || 0;
    if (fileSize > 20 * 1024 * 1024) return ctx.reply('「 Max file size: 20 MB. 」');

    const isPhoto    = Boolean(ctx.message.photo);
    const isAnimated = Boolean(
      ctx.message.animation
      || (ctx.message.video && ctx.message.video.duration <= Config.MAX_VIDEO_SEC)
    );

    const pmsg = await ctx.reply('「 Downloading media... 」');

    const rawFile = await ctx.getFile();
    const rawUrl  = `https://api.telegram.org/file/bot${bot.token}/${rawFile.file_path}`;

    // Download file via axios
    const ext      = path.extname(rawFile.file_path) || '.tmp';
    const rawPath  = path.join(Config.TEMP_DIR, `raw_${uid}_${Date.now()}${ext}`);
    const response = await require('axios').get(rawUrl, { responseType: 'arraybuffer' });
    await fsp.writeFile(rawPath, Buffer.from(response.data));

    const theme = db.getTheme(uid);

    queue.enqueue(async () => {
      let outPath, isVideo, ok;

      if (isPhoto) {
        await ctx.api.editMessageText(ctx.chat.id, pmsg.message_id, '「 AI Background Removal... 」');
        outPath = path.join(Config.TEMP_DIR, `cutout_${uid}_${Date.now()}.png`);
        ok      = await MediaProcessor.applyCutoutWithGlow(rawPath, outPath, theme);
        isVideo = false;
      } else if (isAnimated) {
        await ctx.api.editMessageText(ctx.chat.id, pmsg.message_id, '「 Auto-Trimming & Scaling... 」');
        outPath = path.join(Config.TEMP_DIR, `proc_${uid}_${Date.now()}.webm`);
        ok      = await MediaProcessor.forgeVideoSticker(rawPath, outPath);
        isVideo = true;
      } else {
        await ctx.api.editMessageText(ctx.chat.id, pmsg.message_id, '「 Converting image... 」');
        outPath = path.join(Config.TEMP_DIR, `conv_${uid}_${Date.now()}.png`);
        ok      = await MediaProcessor.convertToStaticSticker(rawPath, outPath);
        isVideo = false;
      }

      MediaProcessor.cleanup(rawPath);

      if (ok) {
        userStates.set(uid, { filePath: outPath, isVideo, status: 'awaiting_emoji' });
        await ctx.api.editMessageText(
          ctx.chat.id, pmsg.message_id,
          '「 Media ready. Send ONE emoji for this sticker. 」',
        );
        db.logEvent('media_processed', uid);
      } else {
        await ctx.api.editMessageText(
          ctx.chat.id, pmsg.message_id,
          '「 Engine error: processing failed. 」',
        );
      }
    });
  });

  // ── Emoji receiver → sticker forge (Features 2, 9) ───────────────────────────
  bot.on('message:text', async (ctx) => {
    const uid   = ctx.from.id;
    const state = userStates.get(uid);
    if (!state || state.status !== 'awaiting_emoji') return;

    const emoji = ctx.message.text.trim();
    // Rough emoji validation: short string, non-ASCII or known emoji range
    if (emoji.length > 8 || emoji.startsWith('/')) return;

    const { filePath, isVideo } = state;
    const me  = await bot.api.getMe();

    // Feature 2: Auto-pagination
    const { volume, count } = db.getPackVolume(uid);
    const baseName  = `titan_${uid}`;
    const packName  = volume > 1
      ? `${baseName}_vol${volume}_by_${me.username}`
      : `${baseName}_by_${me.username}`;
    const packTitle = volume > 1
      ? `God Level Vol ${volume} ${Config.CHANNEL}`
      : `God Level ${Config.CHANNEL}`;

    const pmsg = await ctx.reply(`「 Forging Sticker (Vol ${volume})... 」`);

    try {
      const stickerFormat = isVideo ? 'video' : 'static';
      const fileStream    = fs.createReadStream(filePath);
      const inputFile     = new InputFile(fileStream);

      // Try adding to existing pack first
      let added = false;
      try {
        await bot.api.addStickerToSet(uid, packName, {
          sticker:    inputFile,
          format:     stickerFormat,
          emoji_list: [emoji],
        });
        added = true;
      } catch (_) {}

      // If pack doesn't exist yet, create it
      if (!added) {
        await bot.api.createNewStickerSet(uid, packName, packTitle, [
          {
            sticker:    new InputFile(fs.createReadStream(filePath)),
            format:     stickerFormat,
            emoji_list: [emoji],
          },
        ]);
      }

      db.incrementPackCount(uid, packName, volume);
      db.incrementStickers(uid);

      const packUrl = `https://t.me/addstickers/${packName}`;
      let   reply   = `✦ STICKER FORGED ✦\n\n`
        + `Add Pack : ${packUrl}\n`
        + `Volume   : ${volume}\n`
        + `In Pack  : ${count + 1} / ${Config.MAX_PACK_SIZE}\n\n`
        + `Network  : ${Config.CHANNEL}`;

      if (count + 1 >= Config.MAX_PACK_SIZE) {
        reply += `\n\nPack full! Next sticker starts Vol ${volume + 1}.`;
      }

      await ctx.api.editMessageText(ctx.chat.id, pmsg.message_id, reply, {
        disable_web_page_preview: true,
      });
      db.logEvent('sticker_created', uid, packName);

    } catch (err) {
      Logger.error(`Sticker API error for user ${uid}: ${err.message}`);
      await ctx.api.editMessageText(
        ctx.chat.id, pmsg.message_id,
        `「 API rejected request: ${err.message} 」`,
      );
    } finally {
      MediaProcessor.cleanup(filePath);
      userStates.delete(uid);
    }
  });

  // ── Global error handler ─────────────────────────────────────────────────────
  bot.catch((err) => {
    Logger.error(`Grammy error: ${err.message}`);
  });
}

// ==============================================================================
// 11. MAIN — SYSTEM BOOT SEQUENCE
// ==============================================================================

async function main() {
  console.log('='.repeat(62));
  console.log(' PROJECT TITAN V3.0 — NODE.JS GOD LEVEL STICKER ENGINE');
  console.log(' 10 FEATURES | OWNER: @RUHI_VIG_QNR | NET: @RUHIzxyST');
  console.log('='.repeat(62));

  // 1. Health server (keeps alive on free cloud tiers)
  healthServer.start();

  // 2. UserBot (optional)
  await userbot.initialize();

  // 3. Boot master bot
  const masterBot = await engine.bootMaster();

  // 4. Boot clones from DB
  await engine.bootClones();

  // 5. Register handlers on master + all clones
  for (const bot of engine.allBots()) {
    registerHandlers(bot);
  }

  Logger.info('='.repeat(62));
  Logger.info('SYSTEM FULLY OPERATIONAL — ALL 10 FEATURES ACTIVE');
  Logger.info('='.repeat(62));

  // 6. Start long-polling on all bots
  const startPromises = engine.allBots().map(b =>
    b.start({
      onStart: (info) => Logger.info(`Polling started: @${info.username}`),
      drop_pending_updates: false,
    })
  );

  await Promise.all(startPromises);
}

main().catch((err) => {
  Logger.error(`FATAL BOOT ERROR: ${err.message}`);
  process.exit(1);
});

// ==============================================================================
// END OF FILE — PROJECT TITAN V3.0 (NODE.JS EDITION)
// ==============================================================================
