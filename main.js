const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.json({ message: 'Gold Platform API - mesghalzar.ir' });
});

app.get('/api/v1/gold/price', (req, res) => {
  res.json({ price: 182910000, currency: 'IRR', unit: 'gram' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
