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
    currentUser: null, userData: null, userListener: null, ticketsListener: null,
    onlineUsers: {}, cachedMyTickets: {}, cachedAllTickets: {},
    pendingClaim: false, claimInterval: null, claimSecondsLeft: 0,

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
        let searchEl = document.getElementById('gameSearch');
        if(searchEl) this.filterGames(searchEl.value);
    },

    // --- 1. SUCHLEISTE ---
    filterGames: function(rawQuery) {
        let q = (rawQuery || '').trim().toLowerCase();
        let clearBtn = document.getElementById('searchClearBtn');
        if(clearBtn) clearBtn.style.display = q.length > 0 ? 'inline-block' : 'none';

        let countGrid = (gridId) => {
            let grid = document.getElementById(gridId);
            if(!grid) return 0;
            let visible = 0;
            grid.querySelectorAll('.card').forEach(card => {
                let text = card.textContent.toLowerCase();
                let match = !q || text.includes(q);
                card.style.display = match ? 'flex' : 'none';
                if(match) visible++;
            });
            return visible;
        };

        let soloMatches = countGrid('grid-solo');
        let multiMatches = countGrid('grid-multi');

        let cs = document.getElementById('count-solo');
        let cm = document.getElementById('count-multi');
        if(cs) cs.textContent = soloMatches;
        if(cm) cm.textContent = multiMatches;

        let activeGrid = document.querySelector('.tab-content.active');
        let activeMatches = activeGrid && activeGrid.id === 'grid-multi' ? multiMatches : soloMatches;
        let emptyHint = document.getElementById('searchEmptyHint');
        if(emptyHint) {
            emptyHint.style.display = (q.length > 0 && activeMatches === 0) ? 'block' : 'none';
        }
    },
    clearSearch: function() {
        let input = document.getElementById('gameSearch');
        if(input) {
            input.value = '';
            this.filterGames('');
            input.focus();
        }
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

    // --- 2. PAUSCHALER +5 TICKETS GUTSCHREIBEN-BUTTON (120 SEKUNDEN ANZEIGEZEIT) ---
    offerTicketClaim: function(reasonText) {
        this.pendingClaim = true;
        this.claimSecondsLeft = 120;
        let bar = document.getElementById('claimTicketBar');
        let txt = document.getElementById('claimTicketText');
        let tmr = document.getElementById('claimTicketTimer');
        let btn = document.getElementById('claimTicketBtn');
        if(txt) txt.textContent = `🎉 ${reasonText || 'Spiel beendet!'} — Klicke rechts, um deine pauschal +5 Tickets gutzuschreiben!`;
        if(btn) {
            btn.disabled = false;
            btn.textContent = '🎟️ +5 Tickets gutschreiben';
        }
        if(tmr) tmr.textContent = this.claimSecondsLeft;
        if(bar) bar.style.display = 'block';

        if(this.claimInterval) clearInterval(this.claimInterval);
        this.claimInterval = setInterval(() => {
            this.claimSecondsLeft--;
            if(tmr) tmr.textContent = Math.max(0, this.claimSecondsLeft);
            if(this.claimSecondsLeft <= 0) {
                this.hideClaimBar();
            }
        }, 1000);
    },
    claimPendingTickets: function() {
        if(!this.pendingClaim) return;
        if(!this.currentUser || !db || !this.userData) {
            alert("Bitte logge dich oben rechts unter 'Login / Account' ein, damit dir die +5 Tickets gutgeschrieben werden können!");
            this.openModal('acc');
            return;
        }
        this.pendingClaim = false;
        let next = (Number(this.userData.arcadeTickets) || 0) + 5;
        db.ref('playverseUsers/' + this.currentUser + '/arcadeTickets').set(next);
        let btn = document.getElementById('claimTicketBtn');
        if(btn) {
            btn.disabled = true;
            btn.textContent = '✓ +5 Tickets gutgeschrieben!';
        }
        setTimeout(() => this.hideClaimBar(), 2500);
    },
    hideClaimBar: function() {
        this.pendingClaim = false;
        if(this.claimInterval) {
            clearInterval(this.claimInterval);
            this.claimInterval = null;
        }
        let bar = document.getElementById('claimTicketBar');
        if(bar) bar.style.display = 'none';
    },
    // Kompatibilitäts-Wrapper: Jede frühere Ticket-Vergabe triggert nun den manuellen +5 Gutschreiben-Button
    addArcadeTickets: function(amount, reason) {
        this.offerTicketClaim(reason || 'Runde erfolgreich abgeschlossen');
    },

    // --- 3. BESTENLISTE (LEADERBOARD) SPEICHERUNG & SORTIERUNG ---
    saveHighscore: function(boardKey, scoreValue) {
        let num = Number(scoreValue) || 0;
        if(num <= 0) return;
        localStorage.setItem('pv_best_' + boardKey, Math.max(num, Number(localStorage.getItem('pv_best_' + boardKey)) || 0));
        if(!this.currentUser || !db) return;
        let disp = (this.userData && this.userData.displayName) || this.currentUser;
        let ref = db.ref('playverseLeaderboards/' + boardKey + '/' + this.currentUser);
        ref.once('value').then(s => {
            let prev = (s.exists() && s.val() && Number(s.val().score)) ? Number(s.val().score) : 0;
            if(num > prev) {
                ref.set({
                    name: disp,
                    score: num,
                    updatedAt: Date.now()
                });
            }
        });
    },
    openLeaderboard: function(category) {
        let cat = category || 'tickets';
        document.getElementById('leaderboardModal').classList.add('open');
        ['tickets', 'chase', 'tower'].forEach(c => {
            let btn = document.getElementById('lb-tab-' + c);
            if(btn) btn.classList.toggle('active', c === cat);
        });
        let box = document.getElementById('leaderboardList');
        box.innerHTML = '<div class="muted" style="font-size:13px">Lade und sortiere Bestenliste...</div>';
        if(!db) {
            box.innerHTML = '<div class="muted" style="font-size:13px">Firebase nicht verbunden.</div>';
            return;
        }
        if(cat === 'tickets') {
            db.ref('playverseUsers').once('value').then(s => {
                let users = s.val() || {};
                let rows = Object.keys(users).map(uk => ({
                    name: users[uk].displayName || uk,
                    score: Number(users[uk].arcadeTickets) || 0
                })).sort((a, b) => b.score - a.score);
                this.renderLeaderboardRows(rows, '🎟️ Tickets');
            });
        } else {
            let unit = cat === 'chase' ? 'm Distanz' : 'Etagen';
            db.ref('playverseLeaderboards/' + cat).once('value').then(s => {
                let data = s.val() || {};
                let rows = Object.keys(data).map(uk => ({
                    name: data[uk].name || uk,
                    score: Number(data[uk].score) || 0
                })).sort((a, b) => b.score - a.score);
                this.renderLeaderboardRows(rows, unit);
            });
        }
    },
    renderLeaderboardRows: function(rows, unitLabel) {
        let box = document.getElementById('leaderboardList');
        if(!rows || rows.length === 0) {
            box.innerHTML = '<div class="muted" style="font-size:13px">Noch keine Einträge vorhanden. Spiele eine Runde, um Platz 1 zu erobern!</div>';
            return;
        }
        box.innerHTML = rows.slice(0, 30).map((r, idx) => {
            let medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
            return `
            <div class="list-item">
                <div><strong style="color:var(--gold);margin-right:8px">${medal}</strong> <b>${this.escapeHtml(r.name)}</b></div>
                <span class="pill ticket-pill">${r.score} ${unitLabel}</span>
            </div>`;
        }).join('');
    },
    closeLeaderboard: function() {
        document.getElementById('leaderboardModal').classList.remove('open');
    },

    // --- CHATFENSTER & MODAL RESIZE ---
    toggleModalFullscreen: function(modalId) {
        let el = document.getElementById(modalId || 'mainHubModalBox');
        if(el) el.classList.toggle('fullscreen-modal');
    },
    toggleChatFullscreen: function(chatId) {
        let el = document.getElementById(chatId);
        if(el) el.classList.toggle('chat-expanded');
    },
    sendChatMessage: function(inputId) {
        let inp = document.getElementById(inputId || 'chatInput');
        if(!inp) return;
        let text = inp.value.trim();
        if(!text || !db) return;
        let sender = (this.userData && this.userData.displayName) || this.currentUser || 'Gast';
        db.ref('playverseGlobalChat').push({
            sender: sender,
            text: text,
            time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        });
        inp.value = '';
    },
    renderChatMessages: function(msgsObj) {
        let keys = Object.keys(msgsObj || {}).slice(-40);
        let html = keys.length === 0
            ? '<div class="muted" style="font-size:12px">Noch keine Nachrichten im Chat.</div>'
            : keys.map(k => {
                let m = msgsObj[k];
                return `<div class="chat-msg"><span class="muted" style="font-size:10px">[${this.escapeHtml(m.time||'')}]</span> <b>${this.escapeHtml(m.sender||'Spieler')}:</b> ${this.escapeHtml(m.text||'')}</div>`;
            }).join('');

        ['chatMessages', 'modalChatMessages'].forEach(id => {
            let box = document.getElementById(id);
            if(box) {
                box.innerHTML = html;
                box.scrollTop = box.scrollHeight;
            }
        });
    },
    escapeHtml: function(str) {
        return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
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

        let hn = document.getElementById('hn'), jn = document.getElementById('jn');
        if(hn) hn.value = data.displayName || key;
        if(jn) jn.value = data.displayName || key;

        if(this.userListener) db.ref('playverseUsers/' + key).off('value', this.userListener);
        this.userListener = s => {
            if(!s.exists()) return;
            this.userData = s.val();
            this.renderAccountUI();
            this.checkIncomingInvite(this.userData.invite);
        };
        db.ref('playverseUsers/' + key).on('value', this.userListener);

        if(this.ticketsListener) db.ref('playverseTickets/' + key).off('value', this.ticketsListener);
        this.ticketsListener = s => {
            this.cachedMyTickets = s.val() || {};
            this.renderTicketsList(this.cachedMyTickets);
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
        let tCount = Number(d.arcadeTickets) || 0;
        document.getElementById('headerAccBtn').textContent = '👤 ' + (d.displayName || this.currentUser);
        document.getElementById('profName').textContent = d.displayName || this.currentUser;
        document.getElementById('profArcadeTickets').textContent = tCount;
        document.getElementById('headerTickets').textContent = tCount;
        document.getElementById('ticketPaneCount').textContent = tCount;

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
                    <span><b>${this.escapeHtml(reqs[rk])}</b> möchte dein Freund sein</span>
                    <div class="row">
                        <button class="btn success" style="padding:6px 10px;font-size:12px" onclick="app.respondFriend('${rk}','${this.escapeHtml(reqs[rk])}',true)">✓ Annehmen</button>
                        <button class="btn danger" style="padding:6px 10px;font-size:12px" onclick="app.respondFriend('${rk}','',false)">✕</button>
                    </div>
                </div>
            `).join('');
        }

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
                    <div><span class="${isOn?'badge-online':'badge-offline'}"></span><b>${this.escapeHtml(frs[fk])}</b> <span class="muted" style="font-size:11px">(${isOn?'Online':'Offline'})</span></div>
                    <div class="row">
                        ${canInvite ? `<button class="btn primary" style="padding:6px 12px;font-size:12px" onclick="app.sendInvite('${fk}')">📩 In Raum einladen</button>` : `<span class="muted" style="font-size:11px">Öffne ein Spiel zum Einladen</span>`}
                    </div>
                </div>`;
            }).join('');
        }

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

    // --- SUPPORT TICKET SYSTEM (INKL. GROSSANSICHT & LÖSCHEN) ---
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
                    <strong>#${this.escapeHtml(t.id)} · ${this.escapeHtml(t.subj)}</strong>
                    <span class="ticket-status ${isOpen?'open':'closed'}">${this.escapeHtml(t.status)}</span>
                </div>
                <div class="muted" style="font-size:12px;margin-bottom:6px">${this.escapeHtml(t.cat)} · ${this.escapeHtml(t.createdAt)}</div>
                <div style="font-size:13px;margin-bottom:8px">${this.escapeHtml(t.msg)}</div>
                ${t.reply ? `<div style="background:#1c2940;border-left:3px solid var(--cyan);padding:8px;border-radius:6px;font-size:12px;margin-bottom:8px"><b>👑 Admin-Antwort:</b> ${this.escapeHtml(t.reply)}</div>` : ''}
                <div class="row" style="justify-content:flex-start">
                    <button class="btn" style="padding:5px 10px;font-size:11px" onclick="app.openTicketDetail('${this.currentUser}','${k}',false)">🔍 Großansicht</button>
                    ${isOpen ? `<button class="btn success" style="padding:5px 10px;font-size:11px" onclick="app.closeSupportTicket('${k}')">✓ Als erledigt markieren</button>` : ''}
                </div>
            </div>`;
        }).join('');
    },
    openTicketDetail: function(uKey, tKey, isAdmin) {
        let source = isAdmin ? (this.cachedAllTickets[uKey] || {}) : this.cachedMyTickets;
        let t = source[tKey];
        if(!t) return;

        document.getElementById('tdTitle').textContent = `Ticket #${t.id} — ${t.subj}`;
        document.getElementById('tdMeta').innerHTML = `👤 Spieler: <b>${this.escapeHtml(uKey)}</b> &nbsp;|&nbsp; 📂 Kategorie: <b>${this.escapeHtml(t.cat)}</b> &nbsp;|&nbsp; 🕒 Erstellt: ${this.escapeHtml(t.createdAt)} &nbsp;|&nbsp; Status: <span class="ticket-status ${t.status==='Offen'?'open':'closed'}">${this.escapeHtml(t.status)}</span>`;
        document.getElementById('tdBody').textContent = t.msg || '';

        let replyBox = document.getElementById('tdReplyBox');
        if(t.reply) {
            replyBox.innerHTML = `<div style="background:#1c2940;border-left:4px solid var(--cyan);padding:12px;border-radius:8px;font-size:14px"><b>👑 Admin-Antwort:</b><br>${this.escapeHtml(t.reply)}</div>`;
        } else {
            replyBox.innerHTML = `<div class="muted" style="font-size:12px">Noch keine Admin-Antwort vorhanden.</div>`;
        }

        let actBox = document.getElementById('tdActions');
        if(isAdmin) {
            actBox.innerHTML = `
                <button class="btn primary" onclick="app.adminReplyTicket('${uKey}','${tKey}',true)">💬 Antworten</button>
                ${t.status === 'Offen' ? `<button class="btn success" onclick="app.adminCloseTicket('${uKey}','${tKey}',true)">✓ Schließen</button>` : ''}
                <button class="btn danger" onclick="app.adminDeleteTicket('${uKey}','${tKey}',true)">🗑️ Ticket löschen</button>
            `;
        } else {
            actBox.innerHTML = t.status === 'Offen'
                ? `<button class="btn success" onclick="app.closeSupportTicket('${tKey}');app.closeTicketDetail()">✓ Als erledigt markieren</button>`
                : '';
        }

        document.getElementById('ticketDetailModal').classList.add('open');
    },
    closeTicketDetail: function() {
        document.getElementById('ticketDetailModal').classList.remove('open');
    },
    adminListener: null,
    envPin: null,
    loadEnv: async function() {
        if(this.envPin) return this.envPin;
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
        if(db) {
            try {
                let snap = await db.ref('playverseAdmin/pin').once('value');
                if(snap.exists()) {
                    this.envPin = String(snap.val()).trim();
                    return this.envPin;
                }
            } catch(e) {}
        }
        return "1234";
    },
    verifyPinWithServer: async function(pin) {
        try {
            let res = await fetch('/api/verify-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: pin })
            });
            if(res.status === 200) return true;
            if(res.status === 401) return false;
        } catch(e) {}
        let expectedPin = await this.loadEnv();
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
        if(!isValid) {
            alert("Falscher Admin-PIN!");
            return;
        }
        area.style.display = 'block';
        if(!db) return;
        if(this.adminListener) db.ref('playverseTickets').off('value', this.adminListener);
        this.adminListener = s => {
            let allUsers = s.val() || {};
            this.cachedAllTickets = allUsers;
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
                box.innerHTML = '<div class="muted" style="font-size:13px">Aktuell gibt es keine Tickets.</div>';
                return;
            }
            box.innerHTML = items.map(item => {
                let t = item.t;
                let isOpen = t.status === 'Offen';
                return `
                <div class="ticket-card">
                    <div class="row" style="justify-content:space-between;margin-bottom:6px">
                        <strong>👤 ${this.escapeHtml(item.uKey)} · #${this.escapeHtml(t.id)} (${this.escapeHtml(t.subj)})</strong>
                        <span class="ticket-status ${isOpen?'open':'closed'}">${this.escapeHtml(t.status)}</span>
                    </div>
                    <div class="muted" style="font-size:12px;margin-bottom:6px">${this.escapeHtml(t.cat)} · ${this.escapeHtml(t.createdAt)}</div>
                    <div style="font-size:13px;margin-bottom:8px">${this.escapeHtml(t.msg)}</div>
                    ${t.reply ? `<div style="background:#1c2940;border-left:3px solid var(--cyan);padding:8px;border-radius:6px;font-size:12px;margin-bottom:8px"><b>Antwort:</b> ${this.escapeHtml(t.reply)}</div>` : ''}
                    <div class="row" style="justify-content:flex-start">
                        <button class="btn" style="padding:5px 10px;font-size:11px" onclick="app.openTicketDetail('${item.uKey}','${item.tKey}',true)">🔍 Großansicht</button>
                        <button class="btn primary" style="padding:5px 10px;font-size:11px" onclick="app.adminReplyTicket('${item.uKey}','${item.tKey}',false)">💬 Antworten</button>
                        ${isOpen ? `<button class="btn success" style="padding:5px 10px;font-size:11px" onclick="app.adminCloseTicket('${item.uKey}','${item.tKey}',false)">✓ Schließen</button>` : ''}
                        <button class="btn danger" style="padding:5px 10px;font-size:11px" onclick="app.adminDeleteTicket('${item.uKey}','${item.tKey}',false)">🗑️ Löschen</button>
                    </div>
                </div>`;
            }).join('');
        };
        db.ref('playverseTickets').on('value', this.adminListener);
    },
    adminReplyTicket: function(uKey, tKey, refreshModal) {
        let text = prompt("Deine Antwort an " + uKey + ":");
        if(!text || !db) return;
        db.ref('playverseTickets/' + uKey + '/' + tKey).update({
            reply: text.trim(),
            status: 'Beantwortet'
        }).then(() => {
            if(refreshModal) this.openTicketDetail(uKey, tKey, true);
        });
    },
    adminCloseTicket: function(uKey, tKey, refreshModal) {
        if(!db) return;
        db.ref('playverseTickets/' + uKey + '/' + tKey + '/status').set('Erledigt').then(() => {
            if(refreshModal) this.openTicketDetail(uKey, tKey, true);
        });
    },
    adminDeleteTicket: function(uKey, tKey, fromModal) {
        if(!db) return;
        let t = (this.cachedAllTickets[uKey] || {})[tKey];
        let label = t ? `#${t.id} (${t.subj})` : tKey;
        if(!confirm(`Möchtest du das Ticket ${label} von "${uKey}" wirklich unwiderruflich löschen?`)) return;
        db.ref('playverseTickets/' + uKey + '/' + tKey).remove().then(() => {
            if(fromModal) this.closeTicketDetail();
        });
    }
};

window.addEventListener('DOMContentLoaded', () => {
    if(db) {
        db.ref('playverseOnlineUsers').on('value', s => {
            window.app.onlineUsers = s.val() || {};
            if(window.app.currentUser) window.app.renderAccountUI();
        });
        db.ref('playverseGlobalChat').limitToLast(40).on('value', s => {
            window.app.renderChatMessages(s.val() || {});
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