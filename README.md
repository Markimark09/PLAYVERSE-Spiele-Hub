# PLAYVERSE — Mini Games Hub

Responsive Spiele-Webseite für GitHub Pages.

## Spiele
- Vier gewinnt (lokal, 2 Spieler)

- Tic Tac Toe (lokal, 2 Spieler)

- Memory

- Reaktionstest

- Würfel-Duell

- Zahlenjagd

- UNO Online (Raumcode, 2 Spieler)

- Schach Online (Raumcode, 2 Spieler)


## GitHub Pages
1. Erstelle ein neues Repository, z. B. `playverse`.

2. Lade `index.html` und `README.md` hoch.
3. Öffne **Settings → Pages**.
4. Wähle **Deploy from a branch**, Branch `main`, Ordner `/ (root)`, dann Save.

## Online-Modus einrichten
Die lokalen Spiele funktionieren sofort. Für UNO und Schach über mehrere Geräte ist Firebase nötig:

1. Erstelle ein Projekt unter https://console.firebase.google.com/

2. Füge eine Web-App hinzu und kopiere die Firebase-Web-Konfiguration.
3. Erstelle unter **Build → Realtime Database** eine Datenbank.
4. Ersetze in `index.html` im Abschnitt `FIREBASE CONFIG` die Platzhalter mit deinen echten Werten.
5. Zum Testen mit Freunden kannst du in Realtime Database Rules diese Regeln setzen:

```json
{
  "rules": {
    "playverseRooms": {
      "$room": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

**Achtung:** Diese offenen Regeln sind nur für einen privaten Test geeignet. Jeder, der die Datenbank-URL kennt, kann Räume lesen oder ändern. Für eine öffentliche Seite solltest du Firebase Authentication und sichere Regeln einrichten.

Die Schach-Zugprüfung verwendet `chess.js` über CDN. Online-Funktionen brauchen Internet und eine korrekte Firebase-Konfiguration. Es gibt keine Echtgeld-, Wett- oder Auszahlungsfunktionen.
