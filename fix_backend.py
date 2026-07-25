with open('backend/main.js','r',encoding='utf-8') as f:
    content = f.read()

trade_code = '''
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

'''

content = content.replace('app.listen', trade_code + 'app.listen')

with open('backend/main.js','w',encoding='utf-8') as f:
    f.write(content)

print("✅ Backend updated successfully!")
