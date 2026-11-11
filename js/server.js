require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();

// Pelican Panel nutzt standardmäßig SERVER_PORT oder PORT
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const ADMIN_PIN = (process.env.ADMIN_PIN || '1234').trim();

app.use(express.json());

// Sicherheitsschutz: Blockiere direkten Browser-Zugriff auf .env oder Server-Dateien
app.use((req, res, next) => {
    const forbidden = ['/.env', '/server.js', '/package.json', '/package-lock.json'];
    if (forbidden.includes(req.path.toLowerCase())) {
        return res.status(403).send('Forbidden');
    }
    next();
});

// Sicherer API-Endpunkt zur Prüfung des Admin-PINs aus der .env (Passwort verlässt niemals den Server!)
app.post('/api/verify-admin', (req, res) => {
    const { pin } = req.body || {};
    if (String(pin || '').trim() === ADMIN_PIN) {
        return res.json({ ok: true });
    }
    return res.status(401).json({ ok: false, error: 'Falscher Admin-PIN' });
});

// Statische Dateien ausliefern (index.html, css/, js/)
app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PLAYVERSE] Server läuft erfolgreich auf Port ${PORT}`);
});
