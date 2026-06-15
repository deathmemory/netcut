const express = require('express');
const session = require('express-session');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3100;
const PASSWORD = process.env.NETCUT_PASSWORD || 'dmemory';

const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DATA_FILE = path.join(DATA_DIR, 'items.json');
const SECRET_FILE = path.join(DATA_DIR, 'secret.txt');

for (const dir of [DATA_DIR, UPLOADS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

// 持久化 session secret，重启后 cookie 仍有效
let SESSION_SECRET;
if (fs.existsSync(SECRET_FILE)) {
  SESSION_SECRET = fs.readFileSync(SECRET_FILE, 'utf8').trim();
} else {
  SESSION_SECRET = uuidv4() + uuidv4();
  fs.writeFileSync(SECRET_FILE, SESSION_SECRET);
}

app.use(express.json({ limit: '100mb' }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 天免登录
}));

// 登录接口（不拦截）
app.post('/api/login', (req, res) => {
  if (req.body.password === PASSWORD) {
    req.session.authenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: '密码错误' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// 认证中间件：保护所有 /api/* 路由
function requireAuth(req, res, next) {
  if (req.session.authenticated) return next();
  res.status(401).json({ error: '请先登录' });
}

app.use('/api', requireAuth);

// 静态文件（HTML/CSS/JS 本身不需要认证，由前端控制显示）
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

function readItems() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}

function writeItems(items) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
}

app.get('/api/items', (req, res) => {
  res.json(readItems());
});

app.post('/api/items/text', (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: '内容不能为空' });
  const item = { id: uuidv4(), type: 'text', content, createdAt: new Date().toISOString() };
  const items = readItems();
  items.unshift(item);
  writeItems(items);
  res.json(item);
});

app.post('/api/items/image', (req, res) => {
  const { dataUrl, name } = req.body;
  if (!dataUrl) return res.status(400).json({ error: '图片数据不能为空' });
  const item = { id: uuidv4(), type: 'image', dataUrl, name: name || 'image.png', createdAt: new Date().toISOString() };
  const items = readItems();
  items.unshift(item);
  writeItems(items);
  res.json(item);
});

app.post('/api/items/file', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '文件不能为空' });
  const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const item = {
    id: uuidv4(),
    type: 'file',
    filename: req.file.filename,
    originalName,
    size: req.file.size,
    mimetype: req.file.mimetype,
    createdAt: new Date().toISOString(),
  };
  const items = readItems();
  items.unshift(item);
  writeItems(items);
  res.json(item);
});

app.get('/api/files/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: '文件不存在' });
  res.sendFile(filePath);
});

app.delete('/api/items/:id', (req, res) => {
  let items = readItems();
  const item = items.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: '项目不存在' });
  if (item.type === 'file') {
    const filePath = path.join(UPLOADS_DIR, item.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  items = items.filter(i => i.id !== req.params.id);
  writeItems(items);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`NetCut 运行中: http://localhost:${PORT}`);
});
