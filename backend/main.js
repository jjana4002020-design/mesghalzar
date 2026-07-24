const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 3000;
let goldPrice = 187810000;

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

app.get('/api/v1/gold/price', (req, res) => {
  const today = priceHistory[priceHistory.length - 1];
  const yesterday = priceHistory[priceHistory.length - 2];
  const change = today.price - yesterday.price;
  const changePercent = ((change / yesterday.price) * 100).toFixed(2);
  res.json({
    price: goldPrice,
    currency: 'IRR',
    unit: 'gram',
    change: change,
    changePercent: changePercent,
    high: Math.max(...priceHistory.slice(-7).map(h => h.price)),
    low: Math.min(...priceHistory.slice(-7).map(h => h.price)),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/gold/history', (req, res) => {
  res.json(priceHistory);
});

app.get('/api/v1/stats', (req, res) => {
  res.json({ users: 26000000, volume: 29900, branches: 16, delivered: 523 });
});

app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
