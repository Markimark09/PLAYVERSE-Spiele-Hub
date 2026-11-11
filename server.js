require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const ADMIN_PIN = (process.env.ADMIN_PIN || '1234').trim();

app.use(express.json());

app.use((req, res, next) => {
    const forbidden = ['/.env', '/server.js', '/package.json', '/package-lock.json'];
    if (forbidden.includes(req.path.toLowerCase())) {
        return res.status(403).send('Forbidden');
    }
    next();
});

app.post('/api/verify-admin', (req, res) => {
    const { pin } = req.body || {};
    if (String(pin || '').trim() === ADMIN_PIN) {
        return res.json({ ok: true });
    }
    return res.status(401).json({ ok: false, error: 'Falscher Admin-PIN' });
});

app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PLAYVERSE] Server läuft erfolgreich auf Port ${PORT}`);
});