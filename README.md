# PLAYVERSE — Ultimative Edition

Willkommen im PLAYVERSE, einer modernen, responsiven Single-Page-Application (SPA) für deinen Browser. Dieses Arcade-Hub bietet eine riesige Sammlung aus **54 Spielen** (34 Solo- & Lokalspiele, 20 Online-Multiplayer-Spiele) in einem schicken Dark-Mode-Design.

## Highlights der V13 Edition
* **54 Spiele:** Von Snake über Kreuzworträtsel bis hin zu 4-Spieler Farb-Krieg.
* **Live-Spieler Counter:** Zeigt in Echtzeit an, wie viele Spieler gerade im Playverse online sind.
* **Automatisches Match-Reset:** Multiplayer-Spiele starten 5 Sekunden nach einem Sieg/Unentschieden automatisch neu.
* **Inaktivitäts-Timeout:** Verlassene Multiplayer-Räume werden nach 60 Sekunden Inaktivität automatisch geschlossen und gesäubert.
* **Host-Disconnect Protection:** Verlässt der Ersteller den Raum, wird dieser sofort geschlossen.

## Enthaltene Spiele (Auszug)

### Lokal & Solo (34 Spiele)
* **Klassiker:** Vier gewinnt (Lokal), Tic Tac Toe (Lokal), Memory, Minesweeper, Snake, Retro Pong.
* **Rätsel & Brain-Training:** Wort-Rätsel (Wordle-Klon), Kreuzworträtsel (5x5), Hangman, Schiebepuzzle, Stroop-Test, Memory-Matrix, Kopfrechnen.
* **Geschicklichkeit & Reaktion:** Aim Trainer, Flappy Block, Dino Run, Catch it, Speed Klicker, Reaktionstest, Tipp-Speed, Maulwurf-Jagd.
* **Glück & Minigames:** Einarmiger Bandit, Magic 8-Ball, Münzwurf, Höher/Tiefer, Blackjack, Würfel-Duell.

### Mehrspieler Online (20 Spiele per Raumcode)
* **Neu: 4-Spieler Modus:** Farb-Krieg (Color War) - Färbt in 30 Sekunden die meisten Felder!
* **Brett- & Kartenspiele:** Schach Online, UNO Online, Vier gewinnt Online, Tic Tac Toe Online, Karten-Krieg (War).
* **Raten & Glück:** Schiffe versenken, Zahlenjagd Online, Münzwurf Online, Roulette Online, Bingo Online.
* **Duelle auf Zeit:** Reaktions-Duell, Tipp-Rennen, Klick-Rennen, Wort-Rennen, Mathe-Duell, Farb-Match, Schatzsuche.

## GitHub Pages Deployment

1. Erstelle ein neues GitHub-Repository (z. B. `playverse`).
2. Lade die Dateien `index.html` und `README.md` aus diesem Archiv in das Root-Verzeichnis deines Repositories hoch.
3. Gehe im Repository auf **Settings → Pages**.
4. Wähle unter *Source* **Deploy from a branch** und setze den Branch auf `main` und den Ordner auf `/ (root)`.
5. Klicke auf **Save**. Nach kurzer Zeit ist deine Webseite live!

## Online-Modus einrichten (Firebase)

Die lokalen Spiele funktionieren komplett offline im Browser. Für alle Multiplayer-Funktionen und den Live-Counter wird eine kostenlose Firebase-Datenbank benötigt.

**Diese Version (V13) ist bereits vollständig vorkonfiguriert.** Du musst im Quellcode der `index.html` nichts mehr ändern.

### Letzter wichtiger Schritt (Datenbank freischalten)
Damit sich Endgeräte verbinden dürfen, musst du die Datenbankregeln in deinem Firebase-Projekt anpassen:

1. Öffne https://console.firebase.google.com/ und wähle dein Projekt (`playverse-bce37`).
2. Klicke links unter **Build** auf **Realtime Database**.
3. Wähle oben den Reiter **Regeln (Rules)**.
4. Füge folgenden Code in den Editor ein:

```json
{
  "rules": {
    "playverseRooms": {
      "$room": {
        ".read": true,
        ".write": true
      }
    },
    "playversePresence": {
      ".read": true,
      ".write": true
    }
  }
}
```
*(Hinweis: Für ein öffentliches Produktionsprojekt solltest du später Firebase Authentication und sicherere Regeln verwenden, diese offenen Regeln dienen dem sofortigen Start und Testen).*

5. Klicke auf **Veröffentlichen (Publish)**.

Jetzt ist das Playverse zu 100% startklar!
