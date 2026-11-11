# PLAYVERSE — V24 Mobile, Tablet & Node.js (Pelican Panel) Edition

Diese Version macht das Playverse zu **100 % Smartphone- und Tablet-freundlich** (iOS & Android) und läuft sowohl auf dem **Pelican Panel (Node.js)** als auch auf **GitHub Pages / IntelliJ**.

## Neue Mobile- & Tablet-Features in V24
1. **Touch-Steuerung für alle Action-Games:**
   - **Snake:** Hat jetzt ein On-Screen **Steuerkreuz (D-Pad)** unter dem Spielfeld *plus* **Wisch-Steuerung (Swipe)** direkt auf dem Canvas.
   - **Retro Pong:** Hat jetzt eigene **Touch-Pads für Spieler 1 und Spieler 2**, damit ihr zu zweit an einem Tablet oder Smartphone spielen könnt.
   - **Catch it:** Unterstützt direktes Finger-Tracking (`touchmove`) auf dem Spielfeld.
   - **Minesweeper:** Hat über dem Spielfeld einen **Umschalt-Button (`⛏️ Aufdecken` ↔ `🚩 Flagge setzen`)**, damit man ohne Rechtsklick Flaggen auf dem Touchscreen setzen kann.
   - **Kreuzworträtsel:** Funktioniert jetzt reibungslos mit der virtuellen Smartphone-/Tablet-Tastatur (automatisches Weiterspringen per `oninput`).
2. **Kein ungewolltes Reinzoomen mehr:**
   - Schnelles Tippen bei *Cookie Clicker*, *Speed Klicker*, *Maulwurf-Jagd* oder *Farb-Krieg* löst dank `touch-action: manipulation` und `onpointerdown` keinen Doppelklick-Zoom mehr aus.
   - Eingabefelder nutzen `16px` Schriftgröße, damit iPhones (iOS Safari) beim Antippen nicht automatisch heranzoomen.
3. **Perfektes Responsive Layout:**
   - **Desktop:** 3 Spalten
   - **Tablet (iPad / Android Tab):** 2 Spalten
   - **Smartphone:** 1 Spalte + kompakter Header + automatisch skalierende Spielbretter (Vier gewinnt, Schach, Memory, Minesweeper).
