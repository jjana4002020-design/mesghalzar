const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'mesghalzar-secret-key-2024';
let goldPrice = 188060000;

// SQLite Database
const db = new sqlite3.Database('./users.db');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    gold_balance REAL DEFAULT 0,
    rial_balance REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Generate mock price history
function generatePriceHistory() {
  const history = [];
  const basePrice = 183000000;
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const variation = Math.sin(i * 0.5) * 2000000 + Math.random() * 1000000;
    history.push({
      date: date.toISOString().split('T')[0],
      price: Math.round(basePrice + variation + (30 - i) * 150000)
    });
  }
  return history;
}
const priceHistory = generatePriceHistory();

// Middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Routes
app.get('/api/v1/gold/price', (req, res) => {
  const today = priceHistory[priceHistory.length - 1];
  const yesterday = priceHistory[priceHistory.length - 2];
  const change = today.price - yesterday.price;
  const changePercent = ((change / yesterday.price) * 100).toFixed(2);
  res.json({
    price: goldPrice, currency: 'IRR', unit: 'gram',
    change, changePercent,
    high: Math.max(...priceHistory.slice(-7).map(h => h.price)),
    low: Math.min(...priceHistory.slice(-7).map(h => h.price)),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/gold/history', (req, res) => res.json(priceHistory));

app.get('/api/v1/stats', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    const users = row ? row.count : 0;
    res.json({ users, volume: 0, branches: 0, delivered: 0 });
  });
});

// Auth Routes
app.post('/api/v1/auth/register', async (req, res) => {
  const { name, phone, email, password } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Name, phone and password required' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  db.run(
    'INSERT INTO users (name, phone, email, password) VALUES (?, ?, ?, ?)',
    [name, phone, email || null, hashedPassword],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Phone or email already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      const token = jwt.sign({ userId: this.lastID, phone }, JWT_SECRET);
      res.json({ success: true, token, user: { id: this.lastID, name, phone, email } });
    }
  );
});

app.post('/api/v1/auth/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone and password required' });
  }
  db.get('SELECT * FROM users WHERE phone = ?', [phone], async (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id, phone: user.phone }, JWT_SECRET);
    res.json({
      success: true, token,
      user: { id: user.id, name: user.name, phone: user.phone, email: user.email }
    });
  });
});

app.get('/api/v1/auth/me', authMiddleware, (req, res) => {
  db.get('SELECT id, name, phone, email, gold_balance, rial_balance FROM users WHERE id = ?', 
    [req.user.userId], (err, user) => {
      if (err || !user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    }
  );
});


// Create transactions table
db.run("CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, amount_mg REAL, price_per_gram REAL, total_rial REAL, status TEXT DEFAULT 'completed', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id))");

app.get("/api/v1/trade/price", (req, res) => {
    res.json({ success: true, price_per_gram: 188060000 });
});

app.post("/api/v1/trade/buy", authMiddleware, (req, res) => {
    const { amount_mg, price_per_gram } = req.body;
    const userId = req.user.userId;
    if (!amount_mg || amount_mg <= 0 || !price_per_gram || price_per_gram <= 0) {
        return res.status(400).json({ error: "مقدار نامعتبر" });
    }
    const amountGram = amount_mg / 1000;
    const totalRial = amountGram * price_per_gram;
    db.get("SELECT rial_balance, gold_balance FROM users WHERE id = ?", [userId], (err, user) => {
        if (err || !user) return res.status(500).json({ error: "خطای دیتابیس" });
        if (user.rial_balance < totalRial) {
            return res.status(400).json({ error: "موجودی ریال کافی نیست" });
        }
        db.run("UPDATE users SET rial_balance = rial_balance - ?, gold_balance = gold_balance + ? WHERE id = ?", [totalRial, amount_mg, userId], function(err) {
            if (err) return res.status(500).json({ error: "خطا در خرید" });
            db.run("INSERT INTO transactions (user_id, type, amount_mg, price_per_gram, total_rial) VALUES (?, ?, ?, ?, ?)", [userId, "buy", amount_mg, price_per_gram, totalRial], (err) => {
                if (err) console.error(err);
                res.json({ success: true, message: "خرید با موفقیت انجام شد", new_gold: user.gold_balance + amount_mg, new_rial: user.rial_balance - totalRial });
            });
        });
    });
});

app.post("/api/v1/trade/sell", authMiddleware, (req, res) => {
    const { amount_mg, price_per_gram } = req.body;
    const userId = req.user.userId;
    if (!amount_mg || amount_mg <= 0 || !price_per_gram || price_per_gram <= 0) {
        return res.status(400).json({ error: "مقدار نامعتبر" });
    }
    const amountGram = amount_mg / 1000;
    const totalRial = amountGram * price_per_gram;
    db.get("SELECT rial_balance, gold_balance FROM users WHERE id = ?", [userId], (err, user) => {
        if (err || !user) return res.status(500).json({ error: "خطای دیتابیس" });
        if (user.gold_balance < amount_mg) {
            return res.status(400).json({ error: "موجودی طلا کافی نیست" });
        }
        db.run("UPDATE users SET rial_balance = rial_balance + ?, gold_balance = gold_balance - ? WHERE id = ?", [totalRial, amount_mg, userId], function(err) {
            if (err) return res.status(500).json({ error: "خطا در فروش" });
            db.run("INSERT INTO transactions (user_id, type, amount_mg, price_per_gram, total_rial) VALUES (?, ?, ?, ?, ?)", [userId, "sell", amount_mg, price_per_gram, totalRial], (err) => {
                if (err) console.error(err);
                res.json({ success: true, message: "فروش با موفقیت انجام شد", new_gold: user.gold_balance - amount_mg, new_rial: user.rial_balance + totalRial });
            });
        });
    });
});

app.get("/api/v1/trade/history", authMiddleware, (req, res) => {
    const userId = req.user.userId;
    db.all("SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: "خطای دیتابیس" });
        res.json({ success: true, transactions: rows });
    });
});

app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
