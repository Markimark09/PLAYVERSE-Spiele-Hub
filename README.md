# PLAYVERSE — V20 Modular Edition (Account, Freunde, Live-Invite & Ticket-System)

Willkommen im **PLAYVERSE V20**! Alle Dateien sind sauber modular aufgeteilt und vollständig im Archiv enthalten.

## Dateistruktur für IntelliJ & GitHub
- `index.html` (Hauptseite, alle 54 Spiele-Ansichten, Account-/Freunde-/Ticket-Modal & Live-Einladungs-Banner)
- `css/style.css` (Komplettes Dark-Mode-Design, korrigierte Grid-Grafiken, Spieleranzahl-Badges)
- `js/core.js` (Firebase-Verbindung, Account-Login/Registrierung, Freundesliste, 1-Klick-Einladungen, Support- & Arcade-Ticket-System)
- `js/solo.js` (Alle 34 Lokal- & Solo-Spiele)
- `js/multi.js` (Alle 20 Online-Multiplayer-Spiele inkl. Schnell-Einladungsleiste in der Lobby)

## Neue Features in V20
1. **Account-System:** Spieler können oben rechts über `👤 Login / Account` mit Benutzername & Passwort/PIN sofort ein Konto erstellen (inklusive Auto-Login).
2. **Freundes-Menü & Online-Status:** Füge Freunde per Benutzername hinzu, nimm Freundschaftsanfragen an und sieh live, wer gerade online ist.
3. **1-Klick-Einladen:** Sobald du einen Raum öffnest, siehst du unter dem Raumcode deine Freunde als Schnell-Buttons (`📩 XY einladen`). Dein Freund erhält sofort ein Live-Popup und tritt mit einem einzigen Klick direkt deiner Lobby bei!
4. **Doppeltes Ticket-System:**
   - **Support-Tickets:** Eingeloggte Nutzer können im Reiter `🎫 Tickets` offizielle Support-Tickets (Bug-Report, Spielwunsch, Account-Hilfe) anlegen und verwalten.
   - **Arcade-Tickets:** Als Belohnung erhältst du beim Erstellen eines Accounts und beim Spielen Arcade-Tickets (`🎟️`).

## WICHTIG: Firebase Realtime Database Regeln aktualisieren
Damit Accounts, Freundeslisten, Einladungen und Tickets gespeichert werden dürfen, trage in deiner Firebase Console unter **Realtime Database → Regeln (Rules)** folgende Regeln ein:

```json
{
  "rules": {
    "playverseRooms": {
      "$room": { ".read": true, ".write": true }
    },
    "playversePresence": {
      ".read": true, ".write": true
    },
    "playverseOnlineUsers": {
      ".read": true, ".write": true
    },
    "playverseUsers": {
      ".read": true, ".write": true
    },
    "playverseTickets": {
      ".read": true, ".write": true
    }
  }
}
```
