
const firebaseConfig = {
  apiKey: "AIzaSyCBSidRZEMcqhTVxRiWzQ3-Fn5-yD-AS0M",
  authDomain: "playverse-bce37.firebaseapp.com",
  databaseURL: "https://playverse-bce37-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "playverse-bce37",
  storageBucket: "playverse-bce37.firebasestorage.app",
  messagingSenderId: "884239855268",
  appId: "1:884239855268:web:80c6abe3f74fa643eb0031"
};
let db=null, presRef=null;
try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.database();
  let connRef = db.ref('.info/connected');
  connRef.on('value', s => {
    if(s.val()===true){
       presRef = db.ref('playversePresence').push();
       presRef.onDisconnect().remove();
       presRef.set(true);
       if(window.app && window.app.currentUser) {
           window.app.setOnlineStatus(window.app.currentUser);
       }
    }
  });
  db.ref('playversePresence').on('value', s => {
     let el = document.getElementById('onlineCount');
     if(el) el.textContent = Math.max(1, s.numChildren());
  });
} catch(e) { console.warn("Firebase Init Error:", e) }

window.app = {
    itvs: [], toms: [], rafs: [], idleTimer: null, resetTimer: null,
    currentUser: null, userData: null, userListener: null, ticketsListener: null, onlineUsers: {},

    stInt: function(f,t) { let i=setInterval(f,t); this.itvs.push(i); return i; },
    stTo:  function(f,t) { let i=setTimeout(f,t); this.toms.push(i); return i; },
    clrAll: function() {
        this.itvs.forEach(clearInterval); this.itvs=[];
        this.toms.forEach(clearTimeout); this.toms=[];
        this.rafs.forEach(cancelAnimationFrame); this.rafs=[];
        if(this.idleTimer) clearTimeout(this.idleTimer);
        if(this.resetTimer) clearTimeout(this.resetTimer);
        if(window.activeKeyListener) {
            document.removeEventListener('keydown', window.activeKeyListener);
            window.activeKeyListener = null;
        }
        if(window.activeKeyUpListener) {
            document.removeEventListener('keyup', window.activeKeyUpListener);
            window.activeKeyUpListener = null;
        }
    },
    switchTab: function(t) {
        document.querySelectorAll('.tab-content').forEach(e=>e.classList.remove('active'));
        document.querySelectorAll('.tab').forEach(e=>e.classList.remove('active'));
        document.getElementById('grid-'+t).classList.add('active');
        document.getElementById('btn-'+t).classList.add('active');
    },
    home: function() {
        this.clrAll();
        document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
        document.getElementById('home').classList.add('active');
        if(window.multi && window.multi.roomListener && window.multi.roomRef){
            window.multi.roomRef.off('value', window.multi.roomListener);
            window.multi.roomListener=null;
        }
    },
    startSolo: function(id) {
        this.clrAll();
        document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
        let t = document.getElementById(id);
        if(t) t.classList.add('active');
        if(window.solo && typeof window.solo[id+'Start'] === 'function') window.solo[id+'Start']();
        else if(window.solo && typeof window.solo[id+'reset'] === 'function') window.solo[id+'reset']();
    },
    startMulti: function(id) {
        if(window.multi && typeof window.multi.prepare === 'function') {
            window.multi.prepare(id);
        }
    },

    // --- MODAL & ACCOUNT / FRIENDS / TICKETS ---
    openModal: function(tab) {
        document.getElementById('hubModal').classList.add('open');
        this.openSubTab(tab || 'acc');
    },
    closeModal: function() {
        document.getElementById('hubModal').classList.remove('open');
    },
    openSubTab: function(tab) {
        ['acc','friends','tickets'].forEach(k => {
            document.getElementById('st-'+k).classList.toggle('active', k===tab);
            document.getElementById('pane-'+k).style.display = (k===tab) ? 'block' : 'none';
        });
    },
    cleanKey: function(name) {
        return (name||'').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    },
    setOnlineStatus: function(userKey) {
        if(!db || !userKey) return;
        let uOnRef = db.ref('playverseOnlineUsers/' + userKey);
        uOnRef.onDisconnect().remove();
        uOnRef.set(true);
    },
    loginOrRegister: function(mode) {
        let rawName = document.getElementById('authUser').value.trim();
        let pass = document.getElementById('authPass').value.trim();
        let key = this.cleanKey(rawName);
        let msg = document.getElementById('authMsg');
        if(key.length < 3 || pass.length < 3) {
            msg.textContent = "Name und Passwort müssen mindestens 3 Zeichen lang sein!";
            return;
        }
        if(!db) {
            msg.textContent = "Firebase nicht erreichbar.";
            return;
        }
        let uRef = db.ref('playverseUsers/' + key);
        uRef.once('value').then(s => {
            if(mode === 'register') {
                if(s.exists()) {
                    msg.textContent = "Dieser Benutzername ist bereits vergeben!";
                    return;
                }
                let profile = { displayName: rawName, pass: pass, arcadeTickets: 10, createdAt: Date.now() };
                uRef.set(profile).then(() => {
                    msg.textContent = "Account erfolgreich erstellt! (+10 Start-Tickets)";
                    this.completeLogin(key, profile);
                });
            } else {
                if(!s.exists() || s.val().pass !== pass) {
                    msg.textContent = "Falscher Benutzername oder Passwort!";
                    return;
                }
                msg.textContent = "";
                this.completeLogin(key, s.val());
            }
        });
    },
    completeLogin: function(key, data) {
        this.currentUser = key;
        this.userData = data;
        localStorage.setItem('pv_user', key);
        localStorage.setItem('pv_pass', data.pass);
        this.setOnlineStatus(key);

        // Pre-fill multiplayer lobby names
        let hn = document.getElementById('hn'), jn = document.getElementById('jn');
        if(hn) hn.value = data.displayName || key;
        if(jn) jn.value = data.displayName || key;

        // Subscribe to user profile changes (friends, requests, invites, arcadeTickets)
        if(this.userListener) db.ref('playverseUsers/' + key).off('value', this.userListener);
        this.userListener = s => {
            if(!s.exists()) return;
            this.userData = s.val();
            this.renderAccountUI();
            this.checkIncomingInvite(this.userData.invite);
        };
        db.ref('playverseUsers/' + key).on('value', this.userListener);

        // Subscribe to Support Tickets
        if(this.ticketsListener) db.ref('playverseTickets/' + key).off('value', this.ticketsListener);
        this.ticketsListener = s => {
            this.renderTicketsList(s.val() || {});
        };
        db.ref('playverseTickets/' + key).on('value', this.ticketsListener);
    },
    logout: function() {
        if(this.currentUser && db) {
            db.ref('playverseOnlineUsers/' + this.currentUser).remove();
            if(this.userListener) db.ref('playverseUsers/' + this.currentUser).off('value', this.userListener);
            if(this.ticketsListener) db.ref('playverseTickets/' + this.currentUser).off('value', this.ticketsListener);
        }
        this.currentUser = null;
        this.userData = null;
        localStorage.removeItem('pv_user');
        localStorage.removeItem('pv_pass');
        this.renderAccountUI();
    },
    addArcadeTickets: function(amount) {
        if(!this.currentUser || !db || !this.userData) return;
        let next = (this.userData.arcadeTickets || 0) + amount;
        db.ref('playverseUsers/' + this.currentUser + '/arcadeTickets').set(next);
    },
    renderAccountUI: function() {
        let logged = !!this.currentUser && !!this.userData;
        document.getElementById('authGuest').style.display = logged ? 'none' : 'block';
        document.getElementById('authLogged').style.display = logged ? 'block' : 'none';
        document.getElementById('friendsNeedAuth').style.display = logged ? 'none' : 'block';
        document.getElementById('friendsContent').style.display = logged ? 'block' : 'none';
        document.getElementById('ticketsNeedAuth').style.display = logged ? 'none' : 'block';
        document.getElementById('ticketsContent').style.display = logged ? 'block' : 'none';
        document.getElementById('headerTicketPill').style.display = logged ? 'flex' : 'none';

        if(!logged) {
            document.getElementById('headerAccBtn').textContent = '👤 Login / Account';
            document.getElementById('friendReqBadge').style.display = 'none';
            return;
        }
        let d = this.userData;
        let tCount = d.arcadeTickets || 0;
        document.getElementById('headerAccBtn').textContent = '👤 ' + (d.displayName || this.currentUser);
        document.getElementById('profName').textContent = d.displayName || this.currentUser;
        document.getElementById('profArcadeTickets').textContent = tCount;
        document.getElementById('headerTickets').textContent = tCount;
        document.getElementById('ticketPaneCount').textContent = tCount;

        // Requests
        let reqs = d.requests || {};
        let reqKeys = Object.keys(reqs);
        let badge = document.getElementById('friendReqBadge');
        badge.style.display = reqKeys.length ? 'inline-block' : 'none';
        badge.textContent = reqKeys.length;

        let reqBox = document.getElementById('friendReqList');
        if(reqKeys.length === 0) {
            reqBox.innerHTML = '<div class="muted" style="font-size:13px">Keine offenen Anfragen.</div>';
        } else {
            reqBox.innerHTML = reqKeys.map(rk => `
                <div class="list-item">
                    <span><b>${reqs[rk]}</b> möchte dein Freund sein</span>
                    <div class="row">
                        <button class="btn success" style="padding:6px 10px;font-size:12px" onclick="app.respondFriend('${rk}','${reqs[rk]}',true)">✓ Annehmen</button>
                        <button class="btn danger" style="padding:6px 10px;font-size:12px" onclick="app.respondFriend('${rk}','',false)">✕</button>
                    </div>
                </div>
            `).join('');
        }

        // Friends List
        let frs = d.friends || {};
        let frKeys = Object.keys(frs);
        let frBox = document.getElementById('friendList');
        if(frKeys.length === 0) {
            frBox.innerHTML = '<div class="muted" style="font-size:13px">Noch keine Freunde in deiner Liste.</div>';
        } else {
            frBox.innerHTML = frKeys.map(fk => {
                let isOn = !!this.onlineUsers[fk];
                let canInvite = window.multi && window.multi.roomCode && document.getElementById('online').classList.contains('active');
                return `
                <div class="list-item">
                    <div><span class="${isOn?'badge-online':'badge-offline'}"></span><b>${frs[fk]}</b> <span class="muted" style="font-size:11px">(${isOn?'Online':'Offline'})</span></div>
                    <div class="row">
                        ${canInvite ? `<button class="btn primary" style="padding:6px 12px;font-size:12px" onclick="app.sendInvite('${fk}')">📩 In Raum einladen</button>` : `<span class="muted" style="font-size:11px">Öffne ein Spiel zum Einladen</span>`}
                    </div>
                </div>`;
            }).join('');
        }

        // Update Quick Invite Bar inside Online Lobby if open
        if(window.multi && window.multi.renderQuickInvites) window.multi.renderQuickInvites();
    },
    addFriend: function() {
        if(!this.currentUser || !db) return;
        let raw = document.getElementById('friendAddInput').value.trim();
        let targetKey = this.cleanKey(raw);
        let msg = document.getElementById('friendMsg');
        if(!targetKey || targetKey === this.currentUser) {
            msg.textContent = "Bitte gib einen gültigen Benutzernamen eines Freundes ein.";
            return;
        }
        db.ref('playverseUsers/' + targetKey).once('value').then(s => {
            if(!s.exists()) {
                msg.textContent = "Spieler '" + raw + "' wurde nicht gefunden!";
                return;
            }
            db.ref('playverseUsers/' + targetKey + '/requests/' + this.currentUser).set(this.userData.displayName || this.currentUser);
            msg.textContent = "Freundschaftsanfrage an " + (s.val().displayName || raw) + " gesendet!";
            document.getElementById('friendAddInput').value = '';
        });
    },
    respondFriend: function(fromKey, fromDisplay, accept) {
        if(!this.currentUser || !db) return;
        db.ref('playverseUsers/' + this.currentUser + '/requests/' + fromKey).remove();
        if(accept) {
            db.ref('playverseUsers/' + this.currentUser + '/friends/' + fromKey).set(fromDisplay || fromKey);
            db.ref('playverseUsers/' + fromKey + '/friends/' + this.currentUser).set(this.userData.displayName || this.currentUser);
        }
    },
    sendInvite: function(friendKey) {
        if(!this.currentUser || !db || !window.multi || !window.multi.roomCode) {
            alert("Erstelle oder betrete zuerst einen Multiplayer-Raum, um einen Freund einzuladen!");
            return;
        }
        let inv = {
            fromName: this.userData.displayName || this.currentUser,
            roomCode: window.multi.roomCode,
            game: window.multi.gameType,
            ts: Date.now()
        };
        db.ref('playverseUsers/' + friendKey + '/invite').set(inv);
        let msg = document.getElementById('friendMsg');
        if(msg) msg.textContent = "Einladung gesendet!";
    },
    checkIncomingInvite: function(inv) {
        let toast = document.getElementById('inviteToast');
        if(!inv || !inv.roomCode || (Date.now() - inv.ts > 60000)) {
            toast.classList.remove('show');
            return;
        }
        document.getElementById('invTitle').textContent = inv.fromName + " lädt dich ein!";
        document.getElementById('invDesc').textContent = "Raumcode: " + inv.roomCode + " · Direkt mit 1 Klick beitreten!";
        document.getElementById('invAcceptBtn').onclick = () => {
            db.ref('playverseUsers/' + this.currentUser + '/invite').remove();
            toast.classList.remove('show');
            this.closeModal();
            window.multi.acceptDirectInvite(inv.game, inv.roomCode, this.userData.displayName || this.currentUser);
        };
        toast.classList.add('show');
    },
    dismissInvite: function() {
        document.getElementById('inviteToast').classList.remove('show');
        if(this.currentUser && db) db.ref('playverseUsers/' + this.currentUser + '/invite').remove();
    },

    // --- SUPPORT TICKET SYSTEM ---
    createSupportTicket: function() {
        if(!this.currentUser || !db) return;
        let cat = document.getElementById('tktCat').value;
        let subj = document.getElementById('tktSubj').value.trim();
        let body = document.getElementById('tktMsg').value.trim();
        let fb = document.getElementById('tktFeedback');
        if(!subj || !body) {
            fb.textContent = "Bitte fülle Betreff und Beschreibung aus!";
            return;
        }
        let tRef = db.ref('playverseTickets/' + this.currentUser).push();
        tRef.set({
            id: tRef.key.slice(-6).toUpperCase(),
            cat: cat,
            subj: subj,
            msg: body,
            status: 'Offen',
            createdAt: new Date().toLocaleString('de-DE')
        }).then(() => {
            document.getElementById('tktSubj').value = '';
            document.getElementById('tktMsg').value = '';
            fb.textContent = "✓ Ticket wurde erstellt und gespeichert!";
        });
    },
    closeSupportTicket: function(tKey) {
        if(!this.currentUser || !db) return;
        db.ref('playverseTickets/' + this.currentUser + '/' + tKey + '/status').set('Erledigt');
    },
    renderTicketsList: function(ticketsObj) {
        let box = document.getElementById('myTicketsList');
        let keys = Object.keys(ticketsObj).reverse();
        if(keys.length === 0) {
            box.innerHTML = '<div class="muted" style="font-size:13px">Du hast noch keine Support-Tickets erstellt.</div>';
            return;
        }
        box.innerHTML = keys.map(k => {
            let t = ticketsObj[k];
            let isOpen = t.status === 'Offen';
            return `
            <div class="ticket-card">
                <div class="row" style="justify-content:space-between;margin-bottom:6px">
                    <strong>#${t.id} · ${t.subj}</strong>
                    <span class="ticket-status ${isOpen?'open':'closed'}">${t.status}</span>
                </div>
                <div class="muted" style="font-size:12px;margin-bottom:6px">${t.cat} · ${t.createdAt}</div>
                <div style="font-size:13px;margin-bottom:8px">${t.msg}</div>
                ${t.reply ? `<div style="background:#1c2940;border-left:3px solid var(--cyan);padding:8px;border-radius:6px;font-size:12px;margin-bottom:8px"><b>👑 Admin-Antwort:</b> ${t.reply}</div>` : ''}
                ${isOpen ? `<button class="btn" style="padding:5px 10px;font-size:11px" onclick="app.closeSupportTicket('${k}')">Als erledigt markieren</button>` : ''}
            </div>`;
        }).join('');
    },
    adminListener: null,
    envPin: null,
    loadEnv: async function() {
        if(this.envPin) return this.envPin;
        // 1. Versuche .env Datei zu lesen (funktioniert lokal in IntelliJ & auf Webservern)
        try {
            let res = await fetch('.env', { cache: 'no-store' });
            if(res.ok) {
                let text = await res.text();
                let match = text.match(/^\s*ADMIN_PIN\s*=\s*(.+?)\s*$/m);
                if(match && match[1]) {
                    this.envPin = match[1].replace(/^['"]|['"]$/g, '').trim();
                    return this.envPin;
                }
            }
        } catch(e) {}
        // 2. Fallback: Lese Admin-PIN aus Firebase (playverseAdmin/pin), falls .env auf GitHub Pages blockiert/ausgeblendet ist
        if(db) {
            try {
                let snap = await db.ref('playverseAdmin/pin').once('value');
                if(snap.exists()) {
                    this.envPin = String(snap.val()).trim();
                    return this.envPin;
                }
            } catch(e) {}
        }
        return null;
    },
    verifyPinWithServer: async function(pin) {
        // 1. Node.js Server-API prüfen (Pelican Panel / Express) -> 100% sicher, .env bleibt geheim
        try {
            let res = await fetch('/api/verify-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: pin })
            });
            if(res.status === 200) return true;
            if(res.status === 401) return false;
        } catch(e) {}
        // 2. Fallback für reinen statischen Betrieb ohne Node.js
        let expectedPin = await this.loadEnv();
        if(!expectedPin) return null;
        return pin.trim() === expectedPin;
    },
    toggleAdminTickets: async function() {
        let area = document.getElementById('adminTicketsArea');
        if(area.style.display === 'block') {
            area.style.display = 'none';
            return;
        }
        let pin = prompt("Bitte Admin-Passwort / PIN eingeben:");
        if(pin === null) return;
        let isValid = await this.verifyPinWithServer(pin);
        if(isValid === null) {
            alert("Kein ADMIN_PIN gefunden! Bitte prüfe deine .env Datei.");
            return;
        }
        if(!isValid) {
            alert("Falscher Admin-PIN!");
            return;
        }
        area.style.display = 'block';
        if(!db) return;
        if(this.adminListener) db.ref('playverseTickets').off('value', this.adminListener);
        this.adminListener = s => {
            let allUsers = s.val() || {};
            let box = document.getElementById('allTicketsList');
            let items = [];
            Object.keys(allUsers).forEach(uKey => {
                let uTickets = allUsers[uKey] || {};
                Object.keys(uTickets).forEach(tKey => {
                    items.push({ uKey: uKey, tKey: tKey, t: uTickets[tKey] });
                });
            });
            items.reverse();
            if(items.length === 0) {
                box.innerHTML = '<div class="muted" style="font-size:13px">Aktuell gibt es überhaupt keine Tickets.</div>';
                return;
            }
            box.innerHTML = items.map(item => {
                let t = item.t;
                let isOpen = t.status === 'Offen';
                return `
                <div class="ticket-card">
                    <div class="row" style="justify-content:space-between;margin-bottom:6px">
                        <strong>👤 ${item.uKey} · #${t.id} (${t.subj})</strong>
                        <span class="ticket-status ${isOpen?'open':'closed'}">${t.status}</span>
                    </div>
                    <div class="muted" style="font-size:12px;margin-bottom:6px">${t.cat} · ${t.createdAt}</div>
                    <div style="font-size:13px;margin-bottom:8px">${t.msg}</div>
                    ${t.reply ? `<div style="background:#1c2940;border-left:3px solid var(--cyan);padding:8px;border-radius:6px;font-size:12px;margin-bottom:8px"><b>Antwort:</b> ${t.reply}</div>` : ''}
                    <div class="row" style="justify-content:flex-start">
                        <button class="btn primary" style="padding:5px 10px;font-size:11px" onclick="app.adminReplyTicket('${item.uKey}','${item.tKey}')">💬 Antworten</button>
                        ${isOpen ? `<button class="btn success" style="padding:5px 10px;font-size:11px" onclick="app.adminCloseTicket('${item.uKey}','${item.tKey}')">✓ Schließen</button>` : ''}
                    </div>
                </div>`;
            }).join('');
        };
        db.ref('playverseTickets').on('value', this.adminListener);
    },
    adminReplyTicket: function(uKey, tKey) {
        let text = prompt("Deine Antwort an " + uKey + ":");
        if(!text || !db) return;
        db.ref('playverseTickets/' + uKey + '/' + tKey).update({
            reply: text.trim(),
            status: 'Beantwortet'
        });
    },
    adminCloseTicket: function(uKey, tKey) {
        if(!db) return;
        db.ref('playverseTickets/' + uKey + '/' + tKey + '/status').set('Erledigt');
    }
};

// Track online users & auto-login on startup
window.addEventListener('DOMContentLoaded', () => {
    if(db) {
        db.ref('playverseOnlineUsers').on('value', s => {
            window.app.onlineUsers = s.val() || {};
            if(window.app.currentUser) window.app.renderAccountUI();
        });
        let savedU = localStorage.getItem('pv_user');
        let savedP = localStorage.getItem('pv_pass');
        if(savedU && savedP) {
            db.ref('playverseUsers/' + savedU).once('value').then(s => {
                if(s.exists() && s.val().pass === savedP) {
                    window.app.completeLogin(savedU, s.val());
                }
            });
        }
    }
});
