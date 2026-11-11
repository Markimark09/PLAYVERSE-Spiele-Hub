# PLAYVERSE — V25 Ultimate VIP, Tetris, Stacker & Preis-Ticket Edition

Willkommen im **PLAYVERSE V25**! Dieses Komplett-Update erweitert deinen Spiele-Hub auf **56 Spiele** (36 Solo- & Lokalspiele + 20 Online-Multiplayer-Spiele) und integriert alle gewünschten neuen Systeme.

## Neu in Version 25:
1. **Zwei neue Solo-Arcade-Hits (inkl. Touch- & Tastatur-Steuerung):**
   - **🧱 TETRIS ARCADE:** Klassisches 10x20 Gitter mit allen 7 Tetrominos, Ghost-Piece-Vorschau, Level-Beschleunigung, Reihen-Zähler, Tastatursteuerung (Pfeiltasten/WASD/Leertaste) und maßgeschneidertem 5-Tasten-Touch-Pad (`⬅️`, `🔄`, `➡️`, `⬇️`, `⏬`) für Smartphones & Tablets.
   - **🏗️ STACKER ARCADE:** Das berühmte 7x15 Arcade-Stapelspiel mit steigender Geschwindigkeit pro Reihe, automatischem Abschneiden überstehender Blöcke, Mega-Jackpot in Reihe 15 und riesigem Touch-Tap-Button.

2. **Erweitertes Support- & Preis-Ticket-System (Manipulationssicher + Spam-Schutz):**
   - **Klare Trennung:** Tickets werden im Spieler- und Admin-Menü eindeutig als **`🏆 Preis-Ticket`** (Highscore-Einreichungen) oder **`🛠️ Support`** markiert und sind per Klick filterbar.
   - **Manipulationssicherer Highscore-Beweis:** Spielstände in Tetris & Stacker liegen gekapselt in einer geschützten JavaScript-Closure (nicht über die Browser-Konsole manipulierbar) und werden bei Spielende mit einer FNV-1a-Signatur (`PVSIG-...`), Spielzeit-Plausibilitätsprüfung, Aktionszähler und Einmal-Nonce versehen.
   - **Spam-Schutz:** Jede gespielte Runde kann nur einmal eingereicht werden; zusätzlich verhindert ein 30-Sekunden-Cooldown Ticket-Spam.
   - **1-Klick Admin-Genehmigung:** In der Admin-Ansicht (`🎫 Tickets & VIP` → `Admin-Ansicht öffnen`) kann der Admin nach Preis-Tickets filtern, sieht den Anti-Cheat-Verifizierungsstatus (`✅ Anti-Cheat Signatur & Spielzeit verifiziert`) und kann mit einem Klick auf **`🎁 Genehmigen (+X 🎟️ gutschreiben)`** dem Spieler die Bonus-Tickets vollautomatisch auf sein Firebase-Konto überweisen.

3. **Belohnungssystem & 30-Tage VIP-Rang (`👑 VIP`):**
   - Im Reiter **`🎫 Tickets & VIP`** können Spieler ihre verdienten Arcade-Tickets (`50 🎟️`) gegen **30 Tage VIP-Status** eintauschen.
   - Das Ablaufdatum (`vipUntil` = heute + 30 Tage) wird direkt im Firebase-Profil gespeichert und läuft nach 30 Tagen automatisch ab.
   - Aktive VIPs tragen automatisch das goldene **`👑 VIP`**-Badge im **Header**, im **Account-Profil**, in der **Freundesliste**, in den **Highscore-Bestenlisten (Tetris & Stacker)** sowie in allen **Multiplayer-Lobbys**.

## WICHTIG: Firebase Realtime Database Regeln (inkl. Bestenlisten)
Kopiere diese Regeln in deine Firebase Console unter **Realtime Database → Regeln (Rules)** und klicke auf **Veröffentlichen**:

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
    },
    "playverseLeaderboards": {
      ".read": true, ".write": true
    },
    "playverseAdmin": {
      ".read": true, ".write": false
    }
  }
}
```
