
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
    onlineUsers: {}, vipUsersMap: {}, myTicketsCache: {}, allTicketsCache: {},
    myTicketFilter: 'all', adminTicketFilter: 'all',
    lastPrizeSubmitTs: 0, submittedNonces: {},

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

    // --- VIP HELPER FUNCTIONS (30 DAYS AUTO-EXPIRATION) ---
    isVip: function(vipUntil) {
        return Boolean(vipUntil && Number(vipUntil) > Date.now());
    },
    getVipBadgeHtml: function(vipUntil) {
        if(!this.isVip(vipUntil)) return '';
        return '<span class="vip-badge" title="Aktiver VIP-Spieler">👑 VIP</span>';
    },
    getUserVipBadge: function(userKey) {
        let until = this.vipUsersMap[userKey] || 0;
        return this.getVipBadgeHtml(until);
    },
    formatVipDaysLeft: function(vipUntil) {
        if(!this.isVip(vipUntil)) return 'Kein aktiver VIP-Rang';
        let diffMs = Number(vipUntil) - Date.now();
        let days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        let dateStr = new Date(Number(vipUntil)).toLocaleDateString('de-DE');
        return `👑 Aktiv bis ${dateStr} (noch ${days} ${days===1?'Tag':'Tage'})`;
    },
    buyVipRank: function() {
        if(!this.currentUser || !db || !this.userData) {
            alert("Bitte logge dich zuerst ein!");
            return;
        }
        const cost = 50;
        let currentTickets = Number(this.userData.arcadeTickets || 0);
        let fb = document.getElementById('vipBuyFeedback');
        if(currentTickets < cost) {
            if(fb) {
                fb.style.color = 'var(--red)';
                fb.textContent = `Nicht genügend Arcade-Tickets! Du hast ${currentTickets} 🎟️, benötigst aber ${cost} 🎟️.`;
            }
            return;
        }
        let now = Date.now();
        let baseTime = (this.userData.vipUntil && Number(this.userData.vipUntil) > now) ? Number(this.userData.vipUntil) : now;
        let newVipUntil = baseTime + (30 * 24 * 60 * 60 * 1000); // +30 Tage
        db.ref('playverseUsers/' + this.currentUser).update({
            arcadeTickets: currentTickets - cost,
            vipUntil: newVipUntil
        }).then(() => {
            if(fb) {
                fb.style.color = 'var(--lime)';
                fb.textContent = `🎉 Glückwunsch! Dein 👑 VIP-Rang ist für 30 Tage aktiviert!`;
            }
        });
    },

    // --- CRYPTO SIGNATURE & ANTI-CHEAT / ANTI-SPAM FOR PRIZE TICKETS ---
    computeRunSignature: function(userKey, game, score, durationSec, actions, nonce) {
        const raw = `${userKey||'guest'}|${game}|${score}|${durationSec}|${actions}|${nonce}|PV_V25_ARCADE_SECRET_991`;
        let h = 2166136261 >>> 0;
        for(let i=0; i<raw.length; i++) {
            h ^= raw.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return 'PVSIG-' + h.toString(16).toUpperCase();
    },
    verifyPrizeProof: function(proof) {
        if(!proof || typeof proof !== 'object') return { ok: false, reason: 'Ungültige Spieldaten' };
        let expectedSig = this.computeRunSignature(proof.userKey || 'guest', proof.game, proof.score, proof.durationSec, proof.actions, proof.nonce);
        if(proof.sig !== expectedSig) return { ok: false, reason: 'Signatur-Fälschung erkannt' };
        if(proof.score <= 0 || proof.durationSec < 2 || proof.actions < 1) return { ok: false, reason: 'Unplausible Spielzeit/Aktionen' };
        if(proof.game === 'Tetris' && proof.score > proof.durationSec * 2500) return { ok: false, reason: 'Unrealistische Tetris-Punktzahl pro Sekunde' };
        if(proof.game === 'Stacker' && proof.score > 5000) return { ok: false, reason: 'Maximalpunktzahl überschritten' };
        return { ok: true, reason: 'Hash & Spielzeit verifiziert' };
    },
    submitPrizeTicket: function(proof, msgElId, btnElId) {
        let msgEl = document.getElementById(msgElId);
        let btnEl = document.getElementById(btnElId);
        if(!this.currentUser || !db || !this.userData) {
            if(msgEl) { msgEl.style.color = 'var(--gold)'; msgEl.textContent = 'Bitte logge dich kurz ein, um deinen Highscore einzureichen!'; }
            this.openModal('acc');
            return;
        }
        // Check single-use nonce per round
        if(this.submittedNonces[proof.nonce]) {
            if(msgEl) { msgEl.style.color = 'var(--red)'; msgEl.textContent = '⚠️ Dieser Durchgang wurde bereits als Preis-Ticket eingereicht!'; }
            return;
        }
        // Check 30s spam cooldown
        let now = Date.now();
        let diffSec = Math.floor((now - this.lastPrizeSubmitTs) / 1000);
        if(this.lastPrizeSubmitTs && diffSec < 30) {
            if(msgEl) { msgEl.style.color = 'var(--red)'; msgEl.textContent = `⏳ Spam-Schutz aktiv: Bitte warte noch ${30 - diffSec}s vor dem nächsten Preis-Ticket.`; }
            return;
        }
        let check = this.verifyPrizeProof(proof);
        if(!check.ok) {
            if(msgEl) { msgEl.style.color = 'var(--red)'; msgEl.textContent = '❌ Sicherheitsprüfung fehlgeschlagen: ' + check.reason; }
            return;
        }
        let rewardTickets = proof.game === 'Tetris'
            ? Math.max(5, Math.min(150, Math.floor(proof.score / 150) * 5 + 5))
            : Math.max(5, Math.min(150, Math.floor(proof.score / 100) * 5));

        this.lastPrizeSubmitTs = now;
        this.submittedNonces[proof.nonce] = true;
        if(btnEl) btnEl.disabled = true;

        let tRef = db.ref('playverseTickets/' + this.currentUser).push();
        tRef.set({
            id: tRef.key.slice(-6).toUpperCase(),
            type: 'prize',
            game: proof.game,
            score: proof.score,
            detail: proof.detail || '',
            durationSec: proof.durationSec,
            actions: proof.actions,
            rewardTickets: rewardTickets,
            verified: true,
            sig: proof.sig,
            cat: `🏆 Preis-Ticket (${proof.game})`,
            subj: `${proof.game}: ${proof.score} Punkte (${proof.detail})`,
            msg: `Automatisch verifizierter Highscore aus ${proof.game}. Spielzeit: ${proof.durationSec}s · Aktionen: ${proof.actions} · Signatur: ${proof.sig}. Vorgeschlagene Belohnung: +${rewardTickets} 🎟️`,
            status: 'Offen',
            createdAt: new Date().toLocaleString('de-DE')
        }).then(() => {
            if(msgEl) {
                msgEl.style.color = 'var(--lime)';
                msgEl.textContent = `✅ Preis-Ticket (#${tRef.key.slice(-6).toUpperCase()}) für +${rewardTickets} 🎟️ erfolgreich eingereicht!`;
            }
        });
    },

    // --- HIGHSCORE LEADERBOARD SYSTEM ---
    saveHighscore: function(gameKey, score, detail) {
        if(!this.currentUser || !db || !this.userData || score <= 0) return;
        let lbRef = db.ref('playverseLeaderboards/' + gameKey + '/' + this.currentUser);
        lbRef.once('value').then(s => {
            let prev = s.exists() ? Number(s.val().score || 0) : 0;
            if(score > prev) {
                lbRef.set({
                    displayName: this.userData.displayName || this.currentUser,
                    score: Number(score),
                    detail: detail || '',
                    ts: Date.now()
                });
            }
        });
    },
    renderLeaderboardBox: function(gameKey, boxId) {
        if(!db) return;
        db.ref('playverseLeaderboards/' + gameKey).on('value', s => {
            let box = document.getElementById(boxId);
            if(!box) return;
            let data = s.val() || {};
            let arr = Object.keys(data).map(uKey => ({
                uKey: uKey,
                name: data[uKey].displayName || uKey,
                score: Number(data[uKey].score || 0),
                detail: data[uKey].detail || ''
            })).sort((a,b) => b.score - a.score).slice(0, 10);

            if(arr.length === 0) {
                box.innerHTML = '<div class="muted" style="font-size:13px">Noch keine Einträge. Sei der Erste!</div>';
                return;
            }
            box.innerHTML = arr.map((item, idx) => {
                let medal = idx===0 ? '🥇' : idx===1 ? '🥈' : idx===2 ? '🥉' : `${idx+1}.`;
                return `
                <div class="list-item">
                    <div><strong>${medal} ${item.name}</strong>${this.getUserVipBadge(item.uKey)} <span class="muted" style="font-size:11px">${item.detail}</span></div>
                    <strong style="color:var(--lime)">${item.score} Pkt.</strong>
                </div>`;
            }).join('');
        });
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
        ['acc','friends','tickets','leaders'].forEach(k => {
            let btn = document.getElementById('st-'+k);
            let pane = document.getElementById('pane-'+k);
            if(btn) btn.classList.toggle('active', k===tab);
            if(pane) pane.style.display = (k===tab) ? 'block' : 'none';
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
                let profile = { displayName: rawName, pass: pass, arcadeTickets: 10, vipUntil: 0, createdAt: Date.now() };
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
            this.myTicketsCache = s.val() || {};
            this.renderTicketsList();
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
        let next = Number(this.userData.arcadeTickets || 0) + Number(amount);
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
            document.getElementById('headerAccBtn').innerHTML = '👤 Login / Account';
            document.getElementById('headerVipPill').style.display = 'none';
            document.getElementById('friendReqBadge').style.display = 'none';
            return;
        }
        let d = this.userData;
        let tCount = Number(d.arcadeTickets || 0);
        let vipActive = this.isVip(d.vipUntil);
        let baseName = d.displayName || this.currentUser;

        // Pre-fill multiplayer lobby names with VIP crown if active
        let lobbyName = vipActive ? `👑 ${baseName}` : baseName;
        let hn = document.getElementById('hn'), jn = document.getElementById('jn');
        if(hn) hn.value = lobbyName;
        if(jn) jn.value = lobbyName;

        document.getElementById('headerAccBtn').innerHTML = `👤 ${baseName}${vipActive ? ' <span class="vip-badge">👑 VIP</span>' : ''}`;
        document.getElementById('headerVipPill').style.display = vipActive ? 'flex' : 'none';
        document.getElementById('profName').textContent = baseName;
        document.getElementById('profVipBadge').innerHTML = this.getVipBadgeHtml(d.vipUntil);
        document.getElementById('profVipStatusText').textContent = this.formatVipDaysLeft(d.vipUntil);
        document.getElementById('vipShopStatus').textContent = this.formatVipDaysLeft(d.vipUntil);
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
                    <span><b>${reqs[rk]}</b>${this.getUserVipBadge(rk)} möchte dein Freund sein</span>
                    <div class="row">
                        <button class="btn success" style="padding:6px 10px;font-size:12px" onclick="app.respondFriend('${rk}','${reqs[rk]}',true)">✓ Annehmen</button>
                        <button class="btn danger" style="padding:6px 10px;font-size:12px" onclick="app.respondFriend('${rk}','',false)">✕</button>
                    </div>
                </div>
            `).join('');
        }

        // Friends List (with VIP badge)
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
                    <div><span class="${isOn?'badge-online':'badge-offline'}"></span><b>${frs[fk]}</b>${this.getUserVipBadge(fk)} <span class="muted" style="font-size:11px">(${isOn?'Online':'Offline'})</span></div>
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
        let senderName = this.userData.displayName || this.currentUser;
        if(this.isVip(this.userData.vipUntil)) senderName = '👑 ' + senderName;
        let inv = {
            fromName: senderName,
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
            let joinName = this.userData.displayName || this.currentUser;
            if(this.isVip(this.userData.vipUntil)) joinName = '👑 ' + joinName;
            window.multi.acceptDirectInvite(inv.game, inv.roomCode, joinName);
        };
        toast.classList.add('show');
    },
    dismissInvite: function() {
        document.getElementById('inviteToast').classList.remove('show');
        if(this.currentUser && db) db.ref('playverseUsers/' + this.currentUser + '/invite').remove();
    },

    // --- SUPPORT & PRIZE TICKET SYSTEM ---
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
            type: 'support',
            cat: cat,
            subj: subj,
            msg: body,
            status: 'Offen',
            createdAt: new Date().toLocaleString('de-DE')
        }).then(() => {
            document.getElementById('tktSubj').value = '';
            document.getElementById('tktMsg').value = '';
            fb.textContent = "✓ Support-Ticket wurde erstellt und gespeichert!";
        });
    },
    closeSupportTicket: function(tKey) {
        if(!this.currentUser || !db) return;
        db.ref('playverseTickets/' + this.currentUser + '/' + tKey + '/status').set('Erledigt');
    },
    setMyTicketFilter: function(flt) {
        this.myTicketFilter = flt;
        this.renderTicketsList();
    },
    renderTicketsList: function() {
        let ticketsObj = this.myTicketsCache || {};
        let box = document.getElementById('myTicketsList');
        if(!box) return;
        let keys = Object.keys(ticketsObj).reverse().filter(k => {
            let t = ticketsObj[k];
            let tType = t.type || 'support';
            if(this.myTicketFilter === 'all') return true;
            return tType === this.myTicketFilter;
        });
        if(keys.length === 0) {
            box.innerHTML = '<div class="muted" style="font-size:13px">Keine Tickets in dieser Ansicht vorhanden.</div>';
            return;
        }
        box.innerHTML = keys.map(k => {
            let t = ticketsObj[k];
            let isPrize = t.type === 'prize';
            let isOpen = t.status === 'Offen';
            return `
            <div class="ticket-card" style="${isPrize?'border-color:#ffc85766':''}">
                <div class="row" style="justify-content:space-between;margin-bottom:6px">
                    <div>
                        <span class="type-badge ${isPrize?'prize':'support'}">${isPrize?'🏆 Preis-Ticket':'🛠️ Support'}</span>
                        <strong style="margin-left:6px">#${t.id} · ${t.subj}</strong>
                    </div>
                    <span class="ticket-status ${isOpen?'open':'closed'}">${t.status}</span>
                </div>
                <div class="muted" style="font-size:12px;margin-bottom:6px">${t.cat} · ${t.createdAt}</div>
                <div style="font-size:13px;margin-bottom:8px">${t.msg}</div>
                ${t.reply ? `<div style="background:#1c2940;border-left:3px solid var(--cyan);padding:8px;border-radius:6px;font-size:12px;margin-bottom:8px"><b>👑 Admin-Antwort:</b> ${t.reply}</div>` : ''}
                ${(isOpen && !isPrize) ? `<button class="btn" style="padding:5px 10px;font-size:11px" onclick="app.closeSupportTicket('${k}')">Als erledigt markieren</button>` : ''}
            </div>`;
        }).join('');
    },

    // --- ADMIN PANEL (FILTER BY PRIZE VS SUPPORT + 1-CLICK APPROVAL) ---
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
    setAdminTicketFilter: function(flt) {
        this.adminTicketFilter = flt;
        ['all','prize','support'].forEach(k => {
            let b = document.getElementById('admFlt-'+k);
            if(b) b.className = (k===flt) ? 'btn primary' : 'btn';
        });
        this.renderAdminTicketsList();
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
            this.allTicketsCache = s.val() || {};
            this.renderAdminTicketsList();
        };
        db.ref('playverseTickets').on('value', this.adminListener);
    },
    renderAdminTicketsList: function() {
        let allUsers = this.allTicketsCache || {};
        let box = document.getElementById('allTicketsList');
        if(!box) return;
        let items = [];
        Object.keys(allUsers).forEach(uKey => {
            let uTickets = allUsers[uKey] || {};
            Object.keys(uTickets).forEach(tKey => {
                let t = uTickets[tKey];
                let tType = t.type || 'support';
                if(this.adminTicketFilter === 'all' || this.adminTicketFilter === tType) {
                    items.push({ uKey: uKey, tKey: tKey, t: t, tType: tType });
                }
            });
        });
        items.reverse();
        if(items.length === 0) {
            box.innerHTML = '<div class="muted" style="font-size:13px">Keine Tickets für diesen Filter gefunden.</div>';
            return;
        }
        box.innerHTML = items.map(item => {
            let t = item.t;
            let isPrize = item.tType === 'prize';
            let isOpen = t.status === 'Offen';
            let reward = Number(t.rewardTickets || 15);
            return `
            <div class="ticket-card" style="${isPrize?'border-color:#ffc85788':''}">
                <div class="row" style="justify-content:space-between;margin-bottom:6px">
                    <div>
                        <span class="type-badge ${isPrize?'prize':'support'}">${isPrize?'🏆 Preis-Ticket':'🛠️ Support'}</span>
                        <strong style="margin-left:6px">👤 ${item.uKey}${this.getUserVipBadge(item.uKey)} · #${t.id} (${t.subj})</strong>
                    </div>
                    <span class="ticket-status ${isOpen?'open':'closed'}">${t.status}</span>
                </div>
                <div class="muted" style="font-size:12px;margin-bottom:6px">${t.cat} · ${t.createdAt}</div>
                ${isPrize ? `<div class="${t.verified?'verify-ok':'verify-warn'}" style="margin-bottom:6px">${t.verified?'✅ Anti-Cheat Signatur & Spielzeit verifiziert':'⚠️ Unverifiziert'} · Belohnungsvorschlag: <b>+${reward} 🎟️</b></div>` : ''}
                <div style="font-size:13px;margin-bottom:8px">${t.msg}</div>
                ${t.reply ? `<div style="background:#1c2940;border-left:3px solid var(--cyan);padding:8px;border-radius:6px;font-size:12px;margin-bottom:8px"><b>Antwort:</b> ${t.reply}</div>` : ''}
                <div class="row" style="justify-content:flex-start">
                    ${(isPrize && !t.approved && isOpen) ? `<button class="btn success" style="padding:6px 12px;font-size:12px" onclick="app.adminApprovePrizeTicket('${item.uKey}','${item.tKey}',${reward})">🎁 Genehmigen (+${reward} 🎟️ gutschreiben)</button>` : ''}
                    <button class="btn primary" style="padding:5px 10px;font-size:11px" onclick="app.adminReplyTicket('${item.uKey}','${item.tKey}')">💬 Antworten</button>
                    ${isOpen ? `<button class="btn danger" style="padding:5px 10px;font-size:11px" onclick="app.adminCloseTicket('${item.uKey}','${item.tKey}')">✕ Schließen</button>` : ''}
                </div>
            </div>`;
        }).join('');
    },
    adminApprovePrizeTicket: function(uKey, tKey, rewardAmount) {
        if(!db) return;
        let bonus = Number(rewardAmount || 15);
        let uRef = db.ref('playverseUsers/' + uKey + '/arcadeTickets');
        uRef.once('value').then(s => {
            let current = Number(s.val() || 0);
            return uRef.set(current + bonus);
        }).then(() => {
            db.ref('playverseTickets/' + uKey + '/' + tKey).update({
                approved: true,
                status: `Genehmigt (+${bonus} 🎟️)`,
                reply: `🎉 Dein Highscore wurde vom Admin bestätigt! Dir wurden +${bonus} Arcade-Tickets gutgeschrieben.`
            });
        });
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

// Track online users, VIP statuses, leaderboards & auto-login on startup
window.addEventListener('DOMContentLoaded', () => {
    if(db) {
        db.ref('playverseOnlineUsers').on('value', s => {
            window.app.onlineUsers = s.val() || {};
            if(window.app.currentUser) window.app.renderAccountUI();
        });
        db.ref('playverseUsers').on('value', s => {
            let allU = s.val() || {};
            let vMap = {};
            Object.keys(allU).forEach(k => {
                if(allU[k] && allU[k].vipUntil) vMap[k] = Number(allU[k].vipUntil);
            });
            window.app.vipUsersMap = vMap;
            if(window.app.currentUser) window.app.renderAccountUI();
        });
        window.app.renderLeaderboardBox('tetris', 'lbTetris');
        window.app.renderLeaderboardBox('stacker', 'lbStacker');

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
