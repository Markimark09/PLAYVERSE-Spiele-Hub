
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
  db.ref('.info/serverTimeOffset').on('value', s => {
     window.__pvOffset = Number(s.val()) || 0;
     if(window.app) window.app.serverOffset = window.__pvOffset;
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
    claimTimeout: null, claimInterval: null, claimSecondsLeft: 0, canClaimBonus: false,

    // ===== EINSTELLUNGEN (hier kannst du Preise & Limits anpassen) =====
    VIP_PRICE: 100,            // Tickets für 30 Tage VIP
    VIP_DAYS: 30,
    CLAIM_AMOUNT: 5,           // Tickets pro Abschluss-Bonus
    CLAIM_COOLDOWN_MS: 60000,  // Spam-Schutz: mindestens 60 s zwischen zwei Gutschriften
    CLAIM_DAILY_MAX: 20,       // Spam-Schutz: max. 20 Gutschriften pro Tag (UTC)
    CLAIM_VISIBLE_SEC: 120,    // so lange bleibt das Banner sichtbar
    // ====================================================================
    serverOffset: window.__pvOffset || 0,
    claimBusy: false, claimDeadline: 0, vipBusy: false,
    vipMap: {}, lastChat: null, lastChatAt: 0,
    lbCat: 'tickets', lbRows: null, lbLocalBest: {}, lbTimers: {}, pendingScores: {},

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

    // --- 2. TICKET-BELOHNUNG (manueller Button, per Transaktion abgesichert: Cooldown + Tageslimit) ---
    now: function() { return Date.now() + (this.serverOffset || 0); },
    toast: function(msg, kind) {
        let el = document.getElementById('pvToast');
        if(!el) { el = document.createElement('div'); el.id = 'pvToast'; document.body.appendChild(el); }
        el.textContent = msg;
        el.className = 'pv-toast show' + (kind ? ' ' + kind : '');
        clearTimeout(this._toastT);
        this._toastT = setTimeout(() => el.classList.remove('show'), kind === 'err' ? 6500 : 3500);
    },
    dbErr: function(where, err) {
        console.error('[PLAYVERSE] ' + where + ':', err);
        let raw = ((err && err.code) || '') + ' ' + ((err && err.message) || '');
        let hint = /PERMISSION_DENIED/i.test(raw)
            ? 'Firebase verweigert den Zugriff (Datenbank-Regeln prüfen)'
            : ((err && err.message) || String(err));
        this.toast('⚠️ ' + where + ': ' + hint, 'err');
    },
    addArcadeTickets: function(ignoredAmount, reason) {
        this.offerCompletionBonus(reason || 'Spiel erfolgreich abgeschlossen!');
    },
    claimCooldownLeft: function() {
        let last = Number((this.userData && this.userData.lastClaimAt) || 0);
        return Math.max(0, Math.ceil((last + this.CLAIM_COOLDOWN_MS - this.now()) / 1000));
    },
    offerCompletionBonus: function(label) {
        let bar = document.getElementById('claimTicketBar');
        if(!bar) return;
        this.canClaimBonus = true;
        this.claimBusy = false;
        this.claimDeadline = Date.now() + this.CLAIM_VISIBLE_SEC * 1000;
        let txt = document.getElementById('claimTicketText');
        if(txt) txt.textContent = (label ? label + ' — ' : '') + '+' + this.CLAIM_AMOUNT + ' Tickets Abschluss-Bonus bereit!';
        bar.classList.add('show');
        if(this.claimTimeout) clearTimeout(this.claimTimeout);
        if(this.claimInterval) clearInterval(this.claimInterval);
        this.tickClaimBar();
        this.claimInterval = setInterval(() => this.tickClaimBar(), 1000);
        this.claimTimeout = setTimeout(() => this.hideClaimBar(), this.CLAIM_VISIBLE_SEC * 1000);
    },
    tickClaimBar: function() {
        if(!this.canClaimBonus) return;
        let btn = document.getElementById('claimTicketBtn');
        let tmr = document.getElementById('claimTicketTimer');
        let left = Math.max(0, Math.ceil((this.claimDeadline - Date.now()) / 1000));
        let cd = this.claimCooldownLeft();
        if(btn && !this.claimBusy) {
            btn.disabled = cd > 0;
            btn.textContent = cd > 0 ? '⏳ Noch ' + cd + 's Wartezeit' : '🎟️ +' + this.CLAIM_AMOUNT + ' Tickets gutschreiben';
        }
        if(tmr) tmr.textContent = 'Button bleibt noch ' + left + 's sichtbar';
    },
    claimCompletionTickets: function() {
        if(!this.canClaimBonus || this.claimBusy) return;
        let btn = document.getElementById('claimTicketBtn');
        let tmr = document.getElementById('claimTicketTimer');

        if(!this.currentUser || !db || !this.userData) {
            alert("Bitte logge dich oben rechts unter '👤 Login / Account' ein, damit dir die +" + this.CLAIM_AMOUNT + " Tickets auf dein Konto gutgeschrieben werden können!");
            this.openModal('acc');
            return;
        }
        if(this.claimCooldownLeft() > 0) { this.tickClaimBar(); return; }

        this.claimBusy = true;
        if(btn) { btn.disabled = true; btn.textContent = '⏳ Wird gutgeschrieben ...'; }

        let self = this, result = { ok: false, reason: '' };
        db.ref('playverseUsers/' + this.currentUser).transaction(cur => {
            result = { ok: false, reason: '' };
            if(cur === null) return cur;                       // lokaler Cache leer -> Server-Wert abwarten
            let now = self.now();
            let last = Number(cur.lastClaimAt || 0);
            if(now - last < self.CLAIM_COOLDOWN_MS) {
                result = { ok: false, reason: 'cooldown' };
                return;                                         // Abbruch ohne Änderung
            }
            let day = new Date(now).toISOString().slice(0, 10);
            let cnt = cur.claimDay === day ? Number(cur.claimCount || 0) : 0;
            if(cnt >= self.CLAIM_DAILY_MAX) {
                result = { ok: false, reason: 'daily' };
                return;
            }
            cur.arcadeTickets = Number(cur.arcadeTickets || 0) + self.CLAIM_AMOUNT;
            cur.lastClaimAt = now;
            cur.claimDay = day;
            cur.claimCount = cnt + 1;
            result = { ok: true, reason: '' };
            return cur;
        }).then(res => {
            if(res.committed && result.ok) {
                this.canClaimBonus = false;
                if(this.claimInterval) clearInterval(this.claimInterval);
                let total = Number((res.snapshot.val() || {}).arcadeTickets || 0);
                if(btn) { btn.disabled = true; btn.textContent = '✅ +' + this.CLAIM_AMOUNT + ' Tickets gutgeschrieben!'; }
                if(tmr) tmr.textContent = 'Neuer Kontostand: ' + total + ' 🎟️';
                setTimeout(() => this.hideClaimBar(), 4000);
            } else if(result.reason === 'daily') {
                this.toast('Tageslimit erreicht (' + this.CLAIM_DAILY_MAX + ' Bonus-Gutschriften). Morgen geht es weiter!', 'err');
                this.hideClaimBar();
            } else if(result.reason === 'cooldown') {
                this.toast('Bitte kurz warten – der nächste Bonus ist gleich verfügbar.');
            } else {
                this.toast('Gutschrift nicht möglich (Konto nicht gefunden?).', 'err');
            }
        }).catch(err => {
            this.dbErr('Ticket-Gutschrift', err);
        }).then(() => {
            this.claimBusy = false;
            this.tickClaimBar();
        });
    },
    hideClaimBar: function() {
        this.canClaimBonus = false;
        if(this.claimTimeout) clearTimeout(this.claimTimeout);
        if(this.claimInterval) clearInterval(this.claimInterval);
        let bar = document.getElementById('claimTicketBar');
        if(bar) bar.classList.remove('show');
    },

    // --- VIP-SYSTEM ---
    vipUntilOf: function(key) {
        if(!key) return 0;
        let v = Number(this.vipMap[key] || 0);
        if(key === this.currentUser && this.userData) v = Math.max(v, Number(this.userData.vipUntil || 0));
        return v;
    },
    isVipKey: function(key) { return this.vipUntilOf(key) > this.now(); },
    vipBadgeHtml: function() { return '<span class="vip-badge" title="VIP-Mitglied">★ VIP</span>'; },
    nameHtml: function(name, key) {
        return this.escapeHtml(name) + (this.isVipKey(key) ? ' ' + this.vipBadgeHtml() : '');
    },
    renderVipBox: function() {
        let st = document.getElementById('vipStatus'), btn = document.getElementById('vipBuyBtn');
        if(!st || !btn) return;
        let until = this.vipUntilOf(this.currentUser);
        let active = until > this.now();
        if(active) {
            let days = Math.ceil((until - this.now()) / 864e5);
            st.innerHTML = this.vipBadgeHtml() + ' <b>aktiv</b> bis ' + new Date(until).toLocaleDateString('de-DE') +
                ' <span class="muted">(noch ' + days + (days === 1 ? ' Tag' : ' Tage') + ')</span>';
        } else {
            st.innerHTML = '<span class="muted">' + (until ? 'Dein VIP ist abgelaufen.' : 'Du bist aktuell kein VIP.') + '</span>';
        }
        let tickets = Number((this.userData && this.userData.arcadeTickets) || 0);
        btn.textContent = (active ? '★ VIP verlängern (+' + this.VIP_DAYS + ' Tage)' : '★ VIP kaufen (' + this.VIP_DAYS + ' Tage)') + ' – ' + this.VIP_PRICE + ' 🎟️';
        btn.disabled = this.vipBusy || tickets < this.VIP_PRICE;
    },
    buyVip: function() {
        let fb = document.getElementById('vipMsg');
        let say = (t, bad) => { if(fb) { fb.textContent = t; fb.style.color = bad ? 'var(--red, #ff526f)' : 'var(--lime)'; } };
        if(!this.currentUser || !db || !this.userData) { this.openModal('acc'); return; }
        if(this.vipBusy) return;
        this.vipBusy = true;
        this.renderVipBox();
        let self = this, key = this.currentUser, tooFew = false;
        db.ref('playverseUsers/' + key).transaction(cur => {
            tooFew = false;
            if(cur === null) return cur;
            let t = Number(cur.arcadeTickets || 0);
            if(t < self.VIP_PRICE) { tooFew = true; return; }
            let base = Math.max(Number(cur.vipUntil || 0), self.now());   // Verlängerung hängt hinten an
            cur.arcadeTickets = t - self.VIP_PRICE;
            cur.vipUntil = base + self.VIP_DAYS * 864e5;
            return cur;
        }).then(res => {
            if(res.committed && res.snapshot.val()) {
                let until = Number(res.snapshot.val().vipUntil);
                self.vipMap[key] = until;
                db.ref('playverseVip/' + key).set(until).catch(err => self.dbErr('VIP-Anzeige', err));
                say('✓ VIP aktiv bis ' + new Date(until).toLocaleDateString('de-DE') + '!');
            } else if(tooFew) {
                say('Nicht genug Tickets – du brauchst ' + self.VIP_PRICE + ' 🎟️.', true);
            } else {
                say('Kauf nicht möglich.', true);
            }
        }).catch(err => {
            self.dbErr('VIP-Kauf', err);
            say('Kauf fehlgeschlagen.', true);
        }).then(() => {
            self.vipBusy = false;
            self.renderAccountUI();
        });
    },
    refreshVipViews: function() {
        if(this.currentUser && this.userData) this.renderAccountUI();
        if(this.lastChat) this.renderChatMessages(this.lastChat);
        if(this.lbRows) this.renderLeaderboardRows();
    },

    // --- 3. CHATFENSTER & MODAL RESIZE / GROSSFORMAT ---
    toggleModalFullscreen: function(modalId) {
        let el = document.getElementById(modalId || 'mainHubModalBox');
        if(el) el.classList.toggle('fullscreen-modal');
    },
    toggleChatFullscreen: function(chatId) {
        let el = document.getElementById(chatId);
        if(el) el.classList.toggle('chat-expanded');
    },
    changeChatSize: function(chatId, deltaPx) {
        let el = document.getElementById(chatId);
        if(!el) return;
        el.classList.remove('chat-expanded');
        let currentH = el.offsetHeight || 300;
        let nextH = Math.max(200, Math.min(window.innerHeight * 0.78, currentH + deltaPx));
        el.style.height = nextH + 'px';
    },
    sendChatMessage: function(inputId) {
        let inp = document.getElementById(inputId || 'chatInput');
        if(!inp) return;
        let text = inp.value.trim().slice(0, 200);
        if(!text) return;
        if(!db) { this.toast('Chat nicht verfügbar: Firebase ist nicht erreichbar.', 'err'); return; }
        if(Date.now() - this.lastChatAt < 1500) { this.toast('Bitte kurz warten, bevor du die nächste Nachricht sendest.'); return; }
        this.lastChatAt = Date.now();
        let sender = String((this.userData && this.userData.displayName) || this.currentUser || 'Gast').slice(0, 40);
        let msg = {
            sender: sender,
            text: text,
            ts: firebase.database.ServerValue.TIMESTAMP,
            time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        };
        if(this.currentUser) msg.uid = this.currentUser;
        inp.value = '';
        db.ref('playverseGlobalChat').push(msg).catch(err => {
            inp.value = text;                 // Nachricht nicht verlieren
            this.dbErr('Chat senden', err);
        });
    },
    renderChatMessages: function(src) {
        this.lastChat = src;
        let list = Array.isArray(src) ? src : Object.keys(src || {}).map(k => Object.assign({ _k: k }, src[k]));
        list = list.slice(-40);
        let html = list.length === 0
            ? '<div class="muted" style="font-size:12px">Noch keine Nachrichten im Chat.</div>'
            : list.map(m => `<div class="chat-msg"><span class="muted" style="font-size:10px">[${this.escapeHtml(m.time||'')}]</span> <b>${this.nameHtml(m.sender||'Spieler', m.uid)}:</b> ${this.escapeHtml(m.text||'')}</div>`).join('');
        ['chatMessages', 'modalChatMessages'].forEach(id => {
            let box = document.getElementById(id);
            if(box) {
                box.innerHTML = html;
                box.scrollTop = box.scrollHeight;
            }
        });
    },
    chatError: function(err) {
        let html = '<div class="chat-msg" style="color:var(--red,#ff526f)">⚠️ Chat nicht erreichbar: ' +
            this.escapeHtml((err && err.code === 'PERMISSION_DENIED') || /permission/i.test((err && err.message) || '')
                ? 'Firebase verweigert das Lesen von "playverseGlobalChat" – bitte die Datenbank-Regeln prüfen.'
                : ((err && err.message) || err)) + '</div>';
        ['chatMessages', 'modalChatMessages'].forEach(id => {
            let box = document.getElementById(id);
            if(box) box.innerHTML = html;
        });
        console.error('[PLAYVERSE] Chat-Listener:', err);
    },
    escapeHtml: function(str) {
        return String(str || '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
    },

    // --- 4. BESTENLISTEN (pro Spiel, Firebase: playverseLeaderboards/<spiel>/<benutzer> = {name, score, ts}) ---
    LB_GAMES: {
        tickets:  { name: 'Tickets (gesamt)',   ico: '🎟️', dir: 'desc', fmt: 'n',   unit: 'Tickets' },
        wins:     { name: 'Online-Siege',       ico: '⚔️', dir: 'desc', fmt: 'n',   unit: 'Siege' },
        tetris:   { name: 'Tetris',             ico: '🧱', dir: 'desc', fmt: 'n',   unit: 'Pkt' },
        g2048:    { name: '2048',               ico: '🔢', dir: 'desc', fmt: 'n',   unit: 'Pkt' },
        breakout: { name: 'Breakout Arcade',    ico: '🏓', dir: 'desc', fmt: 'n',   unit: 'Pkt' },
        invaders: { name: 'Space Invaders',     ico: '👾', dir: 'desc', fmt: 'n',   unit: 'Pkt' },
        highway:  { name: 'Highway Police Chase', ico: '🚓', dir: 'desc', fmt: 'n', unit: 'm' },
        tower:    { name: 'Turmbau',            ico: '🏗️', dir: 'desc', fmt: 'n',   unit: 'Etagen' },
        snake:    { name: 'Snake',              ico: '🐍', dir: 'desc', fmt: 'n',   unit: 'Pkt' },
        flappy:   { name: 'Flappy Block',       ico: '🐤', dir: 'desc', fmt: 'n',   unit: 'Pkt' },
        catch:    { name: 'Catch it',           ico: '🧺', dir: 'desc', fmt: 'n',   unit: 'Pkt' },
        mole:     { name: 'Maulwurf-Jagd',      ico: '🐹', dir: 'desc', fmt: 'n',   unit: 'Treffer' },
        aim:      { name: 'Aim Trainer',        ico: '🎯', dir: 'desc', fmt: 'n',   unit: 'Treffer' },
        odd:      { name: 'Farbfinder',         ico: '🎨', dir: 'desc', fmt: 'n',   unit: 'Level' },
        stroop:   { name: 'Stroop-Test',        ico: '🧠', dir: 'desc', fmt: 'n',   unit: 'Pkt' },
        memmat:   { name: 'Memory-Matrix',      ico: '🔲', dir: 'desc', fmt: 'n',   unit: 'Runden' },
        type:     { name: 'Tipp-Speed',         ico: '⌨️', dir: 'desc', fmt: 'n',   unit: 'Zeichen/Min' },
        speed:    { name: 'Speed Klicker (30 Klicks)', ico: '🖱️', dir: 'asc', fmt: 'sec' },
        reaction: { name: 'Reaktionstest',      ico: '⚡', dir: 'asc',  fmt: 'ms' },
        timer:    { name: '10s Timer (Abweichung)', ico: '⏱️', dir: 'asc', fmt: 'ms' },
        memory:   { name: 'Memory',             ico: '🃏', dir: 'asc',  fmt: 'n',   unit: 'Züge' },
        guess:    { name: 'Zahlenjagd',         ico: '🔍', dir: 'asc',  fmt: 'n',   unit: 'Versuche' }
    },
    fmtScore: function(cat, v) {
        let cfg = this.LB_GAMES[cat] || {};
        v = Number(v) || 0;
        if(cfg.fmt === 'sec') return (v / 1000).toFixed(2) + ' s';
        if(cfg.fmt === 'ms') return v + ' ms';
        return v.toLocaleString('de-DE') + (cfg.unit ? ' ' + cfg.unit : '');
    },
    // Wird von den Spielen aufgerufen: app.submitScore('tetris', 1234)
    submitScore: function(gameId, score) {
        let cfg = this.LB_GAMES[gameId];
        score = Math.round(Number(score));
        if(!cfg || !isFinite(score)) return;
        let asc = cfg.dir === 'asc';
        if(asc ? score < 0 : score <= 0) return;
        if(!this.currentUser || !db) {
            if(!this._guestHint) { this._guestHint = true; this.toast('💡 Logge dich ein, damit dein Highscore in der Bestenliste landet.'); }
            return;
        }
        let ck = this.currentUser + '|' + gameId;
        let prev = this.lbLocalBest[ck];
        if(prev !== undefined && (asc ? score >= prev : score <= prev)) return;   // nicht besser als zuletzt gemeldet
        this.lbLocalBest[ck] = score;
        let pend = this.pendingScores[gameId];
        if(!pend || pend.user !== this.currentUser || (asc ? score < pend.score : score > pend.score)) {
            this.pendingScores[gameId] = {
                user: this.currentUser,
                name: (this.userData && this.userData.displayName) || this.currentUser,
                score: score
            };
        }
        clearTimeout(this.lbTimers[gameId]);
        // gebündelt senden (z.B. 2048 meldet bei jedem Zug) – setTimeout bewusst NICHT über stTo, damit clrAll() es nicht löscht
        this.lbTimers[gameId] = setTimeout(() => this.flushScore(gameId), 1200);
    },
    flushScore: function(gameId) {
        let p = this.pendingScores[gameId];
        delete this.pendingScores[gameId];
        let cfg = this.LB_GAMES[gameId];
        if(!p || !db || !cfg) return;
        let asc = cfg.dir === 'asc', improved = false, self = this;
        db.ref('playverseLeaderboards/' + gameId + '/' + p.user).transaction(cur => {
            improved = false;
            let old = (cur && cur.score !== undefined) ? Number(cur.score) : NaN;
            if(isFinite(old) && (asc ? p.score >= old : p.score <= old)) return;   // alter Wert ist besser -> Abbruch
            improved = true;
            return { name: p.name, score: p.score, ts: firebase.database.ServerValue.TIMESTAMP };
        }).then(res => {
            if(res.committed && improved) self.toast('🏆 Neuer Bestwert in ' + cfg.name + ': ' + self.fmtScore(gameId, p.score));
        }).catch(err => {
            delete self.lbLocalBest[p.user + '|' + gameId];
            self.dbErr('Highscore speichern', err);
        });
    },
    recordWin: function() {
        if(!this.currentUser || !db) return;
        let name = (this.userData && this.userData.displayName) || this.currentUser;
        db.ref('playverseLeaderboards/wins/' + this.currentUser).transaction(cur => ({
            name: name,
            score: Number((cur && cur.score) || 0) + 1,
            ts: firebase.database.ServerValue.TIMESTAMP
        })).then(() => this.toast('⚔️ Online-Sieg gezählt!')).catch(err => this.dbErr('Sieg speichern', err));
    },
    // öffentliches Mini-Profil für die Ticket-Rangliste + VIP-Anzeige (kein Passwort!)
    syncPublicProfile: function(d) {
        let key = this.currentUser;
        if(!key || !db || !d) return;
        let t = Number(d.arcadeTickets || 0), name = d.displayName || key;
        let sig = key + '|' + t + '|' + name;
        if(this._pubSig !== sig) {
            this._pubSig = sig;
            db.ref('playverseLeaderboards/tickets/' + key).set({ name: name, score: t, ts: firebase.database.ServerValue.TIMESTAMP })
                .catch(err => { this._pubSig = null; this.dbErr('Bestenliste (Tickets)', err); });
        }
        let vu = Number(d.vipUntil || 0);
        if(vu > 0 && Number(this.vipMap[key] || 0) !== vu && this._vipSig !== key + '|' + vu) {
            this._vipSig = key + '|' + vu;
            db.ref('playverseVip/' + key).set(vu).catch(err => this.dbErr('VIP-Anzeige', err));
        }
    },
    buildLbSelect: function() {
        let sel = document.getElementById('lbGameSelect');
        if(!sel) return;
        if(!sel.options.length) {
            Object.keys(this.LB_GAMES).forEach(id => {
                let o = document.createElement('option');
                o.value = id;
                o.textContent = this.LB_GAMES[id].ico + ' ' + this.LB_GAMES[id].name;
                sel.appendChild(o);
            });
        }
        sel.value = this.lbCat;
    },
    loadLeaderboard: function(cat) {
        if(typeof cat === 'string' && this.LB_GAMES[cat]) this.lbCat = cat;
        let box = document.getElementById('leaderboardList');
        if(!box) return;
        this.buildLbSelect();
        if(!db) { box.innerHTML = '<div class="muted" style="font-size:13px">Firebase nicht erreichbar.</div>'; return; }
        let cat0 = this.lbCat, cfg = this.LB_GAMES[cat0], asc = cfg.dir === 'asc';
        box.innerHTML = '<div class="muted" style="font-size:13px">Lade Bestenliste ...</div>';
        let q = db.ref('playverseLeaderboards/' + cat0).orderByChild('score');
        q = asc ? q.limitToFirst(50) : q.limitToLast(50);
        q.once('value').then(s => {
            if(cat0 !== this.lbCat) return;          // Kategorie wurde inzwischen gewechselt
            let rows = [];
            s.forEach(c => {
                let v = c.val() || {};
                let sc = Number(v.score);              // immer numerisch, auch wenn früher als Text gespeichert
                if(isFinite(sc)) rows.push({ key: c.key, name: v.name || c.key, score: sc });
            });
            rows.sort((a, b) => asc ? a.score - b.score : b.score - a.score);
            this.lbRows = rows;
            this.renderLeaderboardRows();
        }).catch(err => {
            box.innerHTML = '<div style="color:var(--red,#ff526f);font-size:13px">⚠️ Bestenliste konnte nicht geladen werden.</div>';
            this.dbErr('Bestenliste', err);
        });
    },
    renderLeaderboardRows: function() {
        let box = document.getElementById('leaderboardList');
        if(!box) return;
        let rows = this.lbRows || [];
        let cfg = this.LB_GAMES[this.lbCat];
        if(rows.length === 0) {
            box.innerHTML = '<div class="muted" style="font-size:13px">Noch keine Einträge für „' + this.escapeHtml(cfg.name) + '“ – spiel eine Runde und sei der Erste!</div>';
            return;
        }
        box.innerHTML = rows.map((u, idx) => {
            let medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
            let isMe = u.key === this.currentUser;
            return `
            <div class="list-item" style="${isMe ? 'background:#1c2948;border-radius:10px' : ''}">
                <div><strong style="display:inline-block;width:36px;color:var(--gold)">${medal}</strong> <b>${this.nameHtml(u.name, u.key)}</b> ${isMe ? '<span class="pill" style="display:inline;padding:2px 7px;font-size:10px">Du</span>' : ''}</div>
                <span class="pill ticket-pill">${cfg.ico} ${this.escapeHtml(this.fmtScore(this.lbCat, u.score))}</span>
            </div>`;
        }).join('');
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
        ['acc','friends','tickets','leaderboard'].forEach(k => {
            let st = document.getElementById('st-'+k);
            let pn = document.getElementById('pane-'+k);
            if(st) st.classList.toggle('active', k===tab);
            if(pn) pn.style.display = (k===tab) ? 'block' : 'none';
        });
        if(tab === 'leaderboard') this.loadLeaderboard();
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
            this.syncPublicProfile(this.userData);
            if(this.canClaimBonus) this.tickClaimBar();
        };
        db.ref('playverseUsers/' + key).on('value', this.userListener, err => this.dbErr('Konto', err));

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
        this._pubSig = null; this._vipSig = null;
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
        let tCount = d.arcadeTickets || 0;
        document.getElementById('headerAccBtn').innerHTML = '👤 ' + this.nameHtml(d.displayName || this.currentUser, this.currentUser);
        document.getElementById('profName').innerHTML = this.nameHtml(d.displayName || this.currentUser, this.currentUser);
        document.getElementById('profArcadeTickets').textContent = tCount;
        document.getElementById('headerTickets').textContent = tCount;
        document.getElementById('ticketPaneCount').textContent = tCount;
        this.renderVipBox();

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
                    <span><b>${this.nameHtml(reqs[rk], rk)}</b> möchte dein Freund sein</span>
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
                    <div><span class="${isOn?'badge-online':'badge-offline'}"></span><b>${this.nameHtml(frs[fk], fk)}</b> <span class="muted" style="font-size:11px">(${isOn?'Online':'Offline'})</span></div>
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

    // --- 5. SUPPORT TICKET SYSTEM (INKL. GROSSANSICHT & ADMIN-LÖSCHFUNKTION) ---
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
        document.getElementById('tdMeta').innerHTML = `👤 Spieler: <b>${this.escapeHtml(uKey)}</b> &nbsp;|&nbsp; 📂 Kategorie: <b>${this.escapeHtml(t.cat)}</b> &nbsp;|&nbsp; 🕒 ${this.escapeHtml(t.createdAt)} &nbsp;|&nbsp; Status: <span class="ticket-status ${t.status==='Offen'?'open':'closed'}">${this.escapeHtml(t.status)}</span>`;
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
        return null;
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
            alert("Kein ADMIN_PIN gefunden! Bitte prüfe deine .env Datei oder 'playverseAdmin/pin' in Firebase.");
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
                box.innerHTML = '<div class="muted" style="font-size:13px">Aktuell gibt es überhaupt keine Tickets.</div>';
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
            let arr = [];
            s.forEach(c => {
                let v = c.val();
                if(v && typeof v === 'object') arr.push(Object.assign({ _k: c.key }, v));
            });
            window.app.renderChatMessages(arr);
        }, err => window.app.chatError(err));
        db.ref('playverseVip').on('value', s => {
            window.app.vipMap = s.val() || {};
            window.app.refreshVipViews();
        }, err => console.warn('[PLAYVERSE] VIP-Liste:', err));
        setInterval(() => window.app.refreshVipViews(), 60000);   // Ablauf live nachziehen
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
