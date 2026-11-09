# PLAYVERSE — Ultimative Modular Edition

Willkommen im PLAYVERSE! Dieses Projekt wurde von Grund auf überarbeitet und in eine saubere, professionelle Dateistruktur aufgeteilt. 

## Struktur für GitHub & IntelliJ
Lade den gesamten Inhalt dieses Archivs in dein Projektverzeichnis oder dein GitHub-Repository:

- `index.html` (Hier befindet sich nur noch das saubere HTML-Grundgerüst)
- `css/style.css` (Dein komplettes Design & Dark-Mode)
- `js/core.js` (Firebase, Navigation, App-Logik, Global Timers)
- `js/solo.js` (Alle 34 Einzel- und Lokalspiele, sauber isoliert, keine Variablen-Konflikte mehr!)
- `js/multi.js` (Die 20 Multiplayer-Räume & Game-Server Logik)

## Neue Features der V19
* **Perfekte Grid-Grafiken:** Alle Gitter-basierten Spiele (Memory, Schiffe versenken, Minesweeper, TicTacToe) haben jetzt feste maximale Breiten. Es zerreißt das Layout am großen Bildschirm nicht mehr!
* **Spieleranzahl-Tagging:** Auf jedem Vorschaubild (Kachel) siehst du nun rechts oben einen eleganten Tag ("Solo", "2 Spieler", "4 Spieler", "Solo vs PC").
* **Die ultimative Kreuzworträtsel-Navigation:** Steuere blitzschnell mit den Pfeiltasten (Oben, Unten, Links, Rechts) durch das Kreuzworträtsel. Leere Felder werden intelligent übersprungen!
* **Enter-Tasten Support:** Spiele wie Zahlenjagd, Kopfrechnen, Tipp-Speed, oder Wort-Rätsel akzeptieren ab sofort die Enter-Taste. Du musst nicht mehr klicken!
* **Variablen-Isolation:** Die Javascript-Dateien nutzen ab sofort geschlossene Namensräume (`window.solo` und `window.multi`). Dadurch können sich Spiele, die ähnliche Variablen nutzen (z.B. Punkte oder Zeitzähler), nie wieder gegenseitig stören oder die Seite zum Absturz bringen.

Dein Firebase API-Key ist bereits fest in der `js/core.js` einprogrammiert. Du bist also zu 100% startklar.
