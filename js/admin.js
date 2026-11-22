/* PLAYVERSE – Admin-Dashboard
   Admin wirst du, indem in der Firebase-Konsole unter  playverseAdmins/<benutzername> = true  steht (Benutzername klein geschrieben).
   Kein PIN, kein Login-Fenster: nach dem normalen Anmelden erscheint oben der Knopf „🛠️ Admin“.
   Der Pfad playverseAdmins ist per Regel schreibgeschützt – nur du selbst kannst ihn in der Konsole ändern.

   WICHTIG (Sicherheit): Ohne Firebase-Authentication ist das eine Verwaltungsoberfläche, kein Sicherheitsschloss. Sperren, Stummschalten
   und Admin-Anzeige werden vom Client durchgesetzt. Wer die Datenbank direkt anspricht, kann sie umgehen. Siehe Hinweise in der Antwort. */
(function(){
    const app = window.app;
    if(!app) return;
    const $ = id => document.getElementById(id);
    const esc = s => app.escapeHtml(s);
    const KEY = /^[a-z0-9_-]{1,32}$/, SAFE = /^[A-Za-z0-9_-]{1,40}$/, TAG = /^[A-Z0-9]{2,4}$/;
    const fmtT = ts => new Date(Number(ts)).toLocaleString('de-DE');
    const DURS = { '1h': 36e5, '1d': 864e5, '7d': 7 * 864e5, '30d': 30 * 864e5, perm: 0 };
    const DUR_LABEL = { '1h': '1 Stunde', '1d': '1 Tag', '7d': '7 Tage', '30d': '30 Tage', perm: 'dauerhaft' };
    const truthy = v => v === true || v === 1 || (typeof v === 'string' && v !== '' && v.toLowerCase() !== 'false' && v !== '0') || (!!v && typeof v === 'object');
    const banActive = (b, now) => !!b && typeof b === 'object' && (Number(b.until) === 0 || Number(b.until) > now);
    const cnt = o => o ? Object.keys(o).length : 0;

    // ======================================================  1) Admin erkennen (aus der Datenbank)
    app.isAdmin = false; app.muteMap = {};
    app.updateAdminUi = function(){
        const b = $('adminBtn'); if(b) b.style.display = this.isAdmin ? '' : 'none';
        const v = $('admin'); if(!this.isAdmin && v && v.classList && v.classList.contains('active')) this.home();
    };
    app.watchAdmin = function(key){
        this.unwatchAdmin(); if(!db || !KEY.test(key)) return;
        const ref = db.ref('playverseAdmins/' + key);
        const cb = s => { const was = this.isAdmin; this.isAdmin = truthy(s.val()); this.updateAdminUi(); if(this.isAdmin && !was) this.toast('🛠️ Admin-Rechte aktiv – Knopf „Admin“ oben.'); if(!this.isAdmin) this._admStop(); };
        ref.on('value', cb, err => console.warn('[PLAYVERSE] Admin-Liste:', err)); this._adm = { ref, cb };
    };
    app.unwatchAdmin = function(){ if(this._adm){ this._adm.ref.off('value', this._adm.cb); this._adm = null; } this.isAdmin = false; this._admStop(); this.updateAdminUi(); };
    app._admStop = function(){ if(this._admTicketCb){ db.ref('playverseTickets').off('value', this._admTicketCb); this._admTicketCb = null; } };
    app.isTargetAdmin = key => db.ref('playverseAdmins/' + key).once('value').then(s => truthy(s.val()));

    // ======================================================  2) Sperren: Anmeldung, Registrierung und laufende Sitzung
    app.checkBan = function(key){
        if(!db || !KEY.test(key)) return Promise.resolve(null);
        return db.ref('playverseBans/' + key).once('value').then(s => { const b = s.val(); return banActive(b, this.now()) ? b : null; }).catch(() => null);
    };
    app.banText = b => 'Dein Account ist ' + (Number(b.until) ? 'bis ' + fmtT(b.until) : 'dauerhaft') + ' gesperrt.' + (b.reason ? ' Grund: ' + b.reason : '');
    app.onBanned = function(b){
        try { localStorage.removeItem('pv_user'); localStorage.removeItem('pv_pass'); } catch(e) {}
        this.toast('🚫 ' + this.banText(b), 'err'); alert(this.banText(b));
    };
    const _login = app.completeLogin;
    app.completeLogin = function(key, data){
        const self = this;
        return this.checkBan(key).then(b => {
            if(b){ self.onBanned(b); return; }
            self._sanityFor = null; _login.call(self, key, data); self.watchAdmin(key); self.watchBan(key); self.clearGone();
        });
    };
    app.watchBan = function(key){
        this.unwatchBan(); if(!db || !KEY.test(key)) return;
        const ref = db.ref('playverseBans/' + key);
        const cb = s => { const b = s.val(); if(banActive(b, this.now()) && this.currentUser === key){ const t = this.banText(b); this.logout(); this.toast('🚫 ' + t, 'err'); alert(t); } };
        ref.on('value', cb, () => {}); this._ban = { ref, cb };
    };
    app.unwatchBan = function(){ if(this._ban){ this._ban.ref.off('value', this._ban.cb); this._ban = null; } };
    const _logout = app.logout;
    app.logout = function(){ this.unwatchAdmin(); this.unwatchBan(); return _logout.apply(this, arguments); };
    // Konto wurde gelöscht, während man angemeldet war
    app.clearGone = function(){ this._gone = false; };
    app.onAccountGone = function(){
        const key = this.currentUser; if(!key || this._gone || !db) return;
        this._gone = true;
        db.ref('playverseUsers/' + key).once('value').then(s => {                    // erst beim Server nachfragen, dann abmelden
            if(s.exists() || this.currentUser !== key){ this._gone = false; return; }
            alert('Dein Account wurde gelöscht oder existiert nicht mehr.'); this.logout();
        }).catch(() => { this._gone = false; });
    };

    // ======================================================  3) Chat-Stummschaltung
    app.isMuted = function(){
        const m = this.muteMap && this.muteMap[this.currentUser];
        if(m && Number(m.until) > this.now()){ this.toast('🔇 Du bist im Chat stummgeschaltet bis ' + fmtT(m.until) + (m.reason ? ' – ' + m.reason : ''), 'err'); return true; }
        return false;
    };

    // ======================================================  4) Admin-Aktionen (immer nur mit Admin-Recht, alle werden protokolliert)
    app.admOk = function(){ if(!this.isAdmin || !db){ this.toast('Nur für Admins.', 'err'); return false; } return true; };
    app.admLog = function(action, target, detail){
        if(!db) return;
        db.ref('playverseAdminLog').push({ by: this.currentUser, action, target: target || '', detail: String(detail || '').slice(0, 200), ts: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
    };
    const guardTarget = (self, key) => {
        if(!self.admOk() || !KEY.test(key)) return Promise.resolve(false);
        if(key === self.currentUser){ self.toast('Das geht nicht bei dir selbst.', 'err'); return Promise.resolve(false); }
        return self.isTargetAdmin(key).then(isA => { if(isA){ self.toast('Admins können nicht bearbeitet werden (erst in der Konsole entfernen).', 'err'); return false; } return true; });
    };
    app.admBan = function(key, durKey, reason){
        return guardTarget(this, key).then(ok => {
            if(!ok || DURS[durKey] === undefined) return;
            const ms = DURS[durKey], rec = { until: ms ? this.now() + ms : 0, reason: String(reason || '').trim().slice(0, 120), by: this.currentUser, ts: this.now() };
            return db.ref('playverseBans/' + key).set(rec).then(() => { this.toast('🚫 ' + key + ' gesperrt (' + DUR_LABEL[durKey] + ')'); this.admLog('sperren', key, DUR_LABEL[durKey] + (rec.reason ? ' – ' + rec.reason : '')); this.admRefreshUser(key); });
        }).catch(e => this.dbErr('Sperren', e));
    };
    app.admUnban = function(key){
        if(!this.admOk() || !KEY.test(key)) return Promise.resolve();
        return db.ref('playverseBans/' + key).remove().then(() => { this.toast('✓ ' + key + ' entsperrt'); this.admLog('entsperren', key, ''); this.admRefreshUser(key); }).catch(e => this.dbErr('Entsperren', e));
    };
    app.admMute = function(key, minutes, reason){
        return guardTarget(this, key).then(ok => {
            minutes = Number(minutes); if(!ok || !(minutes > 0)) return;
            return db.ref('playverseMutes/' + key).set({ until: this.now() + minutes * 6e4, reason: String(reason || '').slice(0, 120), by: this.currentUser, ts: this.now() })
                .then(() => { this.toast('🔇 ' + key + ' stummgeschaltet'); this.admLog('stummschalten', key, minutes + ' Min.'); this.admRefreshUser(key); });
        }).catch(e => this.dbErr('Stummschalten', e));
    };
    app.admUnmute = function(key){
        if(!this.admOk() || !KEY.test(key)) return Promise.resolve();
        return db.ref('playverseMutes/' + key).remove().then(() => { this.toast('🔊 ' + key + ' darf wieder schreiben'); this.admLog('entstummen', key, ''); this.admRefreshUser(key); }).catch(e => this.dbErr('Entstummen', e));
    };
    app.admTickets = function(key, delta){
        if(!this.admOk() || !KEY.test(key)) return Promise.resolve();
        delta = Math.round(Number(delta)); if(!delta || Math.abs(delta) > 100000) return Promise.resolve();
        let ok = false;
        return db.ref('playverseUsers/' + key).transaction(cur => { ok = false; if(cur === null) return cur; cur.arcadeTickets = Math.max(0, Number(cur.arcadeTickets || 0) + delta); ok = true; return cur; })
            .then(r => { if(r.committed && ok){ this.toast((delta > 0 ? '+' : '') + delta + ' 🎟️ für ' + key); this.admLog('tickets', key, (delta > 0 ? '+' : '') + delta); this.admRefreshUser(key); } else this.toast('Konto nicht gefunden.', 'err'); })
            .catch(e => this.dbErr('Tickets', e));
    };
    app.admVip = function(key, days){
        if(!this.admOk() || !KEY.test(key)) return Promise.resolve();
        days = Number(days); let until = 0, ok = false;
        return db.ref('playverseUsers/' + key).transaction(cur => {
            ok = false; if(cur === null) return cur;
            cur.vipUntil = days > 0 ? Math.max(Number(cur.vipUntil || 0), this.now()) + days * 864e5 : 0; until = cur.vipUntil; ok = true; return cur;
        }).then(r => {
            if(!(r.committed && ok)){ this.toast('Konto nicht gefunden.', 'err'); return; }
            const mir = until ? db.ref('playverseVip/' + key).set(until) : db.ref('playverseVip/' + key).remove();
            return mir.then(() => { this.toast(days > 0 ? '★ VIP für ' + key + ' verlängert' : 'VIP entfernt'); this.admLog('vip', key, days > 0 ? '+' + days + ' Tage' : 'entfernt'); this.admRefreshUser(key); });
        }).catch(e => this.dbErr('VIP', e));
    };
    // Aus einem Clan entfernen (ohne Besitzer-Prüfung – nur intern für Admin/Löschung). Löscht den Clan, wenn er leer wird.
    function clanRemove(tag, key){
        if(!TAG.test(tag)) return Promise.resolve();
        return db.ref('playverseClans/' + tag).transaction(cur => {
            if(cur === null) return cur;
            cur.members = cur.members || {}; delete cur.members[key];
            const left = Object.keys(cur.members);
            if(!left.length) return null;
            cur.n = left.length; if(cur.owner === key) cur.owner = left[0];
            return cur;
        });
    }
    // Konto löschen: alle Spuren entfernen
    app.admDelete = function(key, blockName){
        return guardTarget(this, key).then(ok => {
            if(!ok) return;
            const typed = prompt('Konto „' + key + '“ endgültig löschen?\nZur Bestätigung den Benutzernamen eintippen:');
            if(typed !== key){ this.toast('Löschen abgebrochen.'); return; }
            return db.ref('playverseUsers/' + key).once('value').then(s => {
                const u = s.val();
                if(!u){ this.toast('Konto nicht gefunden.', 'err'); return; }
                const upd = {}, rm = p => { upd[p] = null; };
                rm('playverseUsers/' + key);
                ['playverseProfiles/', 'playverseCosmetics/', 'playverseVip/', 'playverseTickets/', 'playverseOnlineUsers/', 'playverseMutes/'].forEach(p => rm(p + key));
                Object.keys(this.LB_GAMES).forEach(g => rm('playverseLeaderboards/' + g + '/' + key));
                const wk = this.weekIdx ? this.weekIdx(this.now()) : 0; [0, 1, 2].forEach(i => rm('playverseTournament/w' + (wk - i) + '/' + key));
                Object.keys(u.friends || {}).forEach(f => { if(KEY.test(f)){ rm('playverseUsers/' + f + '/friends/' + key); rm('playverseUsers/' + f + '/requests/' + key); } });
                const tag = u.clan;
                return (tag && TAG.test(tag) ? clanRemove(tag, key) : Promise.resolve()).then(() => db.ref().update(upd)).then(() => {
                    if(blockName) return db.ref('playverseBans/' + key).set({ until: 0, reason: 'Name gesperrt (Konto gelöscht)', by: this.currentUser, ts: this.now() });
                }).then(() => { this.toast('🗑️ Konto „' + key + '“ gelöscht'); this.admLog('konto-löschen', key, blockName ? 'Name gesperrt' : ''); this._admKeys = null; this.admSearch(); const c = $('admUserCard'); if(c) c.innerHTML = ''; });
            });
        }).catch(e => this.dbErr('Löschen', e));
    };

    // ======================================================  5) Listen & Hilfen
    app.admListKeys = function(force){
        if(!force && this._admKeys && Date.now() - this._admKeysT < 60000) return Promise.resolve(this._admKeys);
        const fin = keys => { this._admKeys = keys.filter(k => KEY.test(k)).sort(); this._admKeysT = Date.now(); return this._admKeys; };
        let url = ''; try { url = window.firebase.app().options.databaseURL || ''; } catch(e) {}
        const fallback = () => db.ref('playverseProfiles').once('value').then(s => fin(Object.keys(s.val() || {})));
        if(url && typeof fetch === 'function') return fetch(url.replace(/\/$/, '') + '/playverseUsers.json?shallow=true').then(r => r.json()).then(o => fin(Object.keys(o || {}))).catch(fallback);   // nur die Namen, ohne Passwörter zu laden
        return fallback();
    };
    const row = (inner, extra) => `<div class="list-item"${extra || ''}>${inner}</div>`;
    const card = (title, body) => `<div class="adm-card"><div class="adm-card-t">${title}</div>${body}</div>`;
    const stat = (ico, label, val) => `<div class="adm-stat"><div style="font-size:22px">${ico}</div><div class="adm-stat-n">${val}</div><div class="muted" style="font-size:12px">${label}</div></div>`;

    // ======================================================  6) Dashboard
    const TABS = [['over', '📊 Übersicht'], ['users', '👥 Spieler'], ['support', '🎫 Support'], ['news', '📰 News'], ['events', '🎉 Events'], ['clans', '🛡️ Clans'], ['chat', '💬 Chat'], ['log', '🧾 Protokoll']];
    app.openAdmin = function(tab){
        if(!this.isAdmin){ this.toast('Nur für Admins.', 'err'); return; }
        this.showView('admin');
        const t = $('admTabs'); if(t && !t.innerHTML) t.innerHTML = TABS.map(([k, l]) => `<button class="subtab" id="admTab-${k}" onclick="app.admTab('${k}')">${l}</button>`).join('');
        this.admTab(tab || 'over');
    };
    app.admTab = function(tab){
        if(!this.isAdmin) return;
        this._admStop();
        TABS.forEach(([k]) => { const b = $('admTab-' + k); if(b) b.classList.toggle('active', k === tab); });
        const f = this['admRender_' + tab]; if(f) f.call(this);
    };
    const body = () => $('admBody');

    app.admRender_over = function(){
        body().innerHTML = '<div class="muted">Lade …</div>';
        Promise.all([this.admListKeys(true), db.ref('playverseBans').once('value'), db.ref('playverseTickets').once('value'), db.ref('playverseClans').once('value'),
            db.ref('playverseAdmins').once('value'), db.ref('playverseAdminLog').orderByChild('ts').limitToLast(8).once('value')]).then(([keys, bans, tix, clans, admins, log]) => {
            const now = this.now(); let openT = 0, banN = 0; const b = bans.val() || {};
            Object.keys(b).forEach(k => { if(banActive(b[k], now)) banN++; });
            const t = tix.val() || {}; Object.keys(t).forEach(u => Object.keys(t[u] || {}).forEach(k => { if((t[u][k] || {}).status === 'Offen') openT++; }));
            const ev = this.eventNow && Number(this.eventNow.until) > now ? this.eventNow : null;
            const logRows = []; log.forEach(c => { logRows.unshift(c.val()); });
            const adminNames = Object.keys(admins.val() || {}).filter(k => truthy(admins.val()[k]));
            body().innerHTML = `<div class="adm-grid">${stat('👥', 'Konten', keys.length)}${stat('🟢', 'Online jetzt', cnt(this.onlineUsers))}${stat('🚫', 'Gesperrt', banN)}${stat('🎫', 'Offene Tickets', openT)}${stat('🛡️', 'Clans', cnt(clans.val()))}${stat('🎉', 'Event', ev ? 'läuft' : '–')}</div>
        ${card('🛠️ Admin-Zugang', `<div style="font-size:13px;line-height:1.5">Admins werden in der <b>Firebase-Konsole</b> festgelegt: Pfad <code>playverseAdmins</code> → neuer Eintrag mit dem <b>kleingeschriebenen Benutzernamen</b> als Schlüssel und dem Wert <code>true</code>. Löschen des Eintrags nimmt die Rechte wieder weg.<br>Aktuelle Admins: <b>${adminNames.map(esc).join(', ') || '–'}</b></div>`)}
        ${card('🧾 Letzte Aktionen', logRows.length ? logRows.map(l => row(`<span><b>${esc(l.by)}</b> · ${esc(l.action)} ${l.target ? '→ ' + esc(l.target) : ''}${l.detail ? ' <span class="muted">(' + esc(l.detail) + ')</span>' : ''}</span><span class="muted" style="font-size:11px">${fmtT(l.ts)}</span>`)).join('') : '<div class="muted" style="font-size:13px">Noch keine Aktionen.</div>')}`;
        }).catch(e => { body().innerHTML = '<div style="color:var(--red,#ff526f)">Übersicht nicht ladbar.</div>'; this.dbErr('Admin-Übersicht', e); });
    };

    // ---- Spieler
    app.admRender_users = function(){
        body().innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><input id="admUserQ" placeholder="Benutzername suchen …" style="flex:1;min-width:180px" onkeydown="if(event.key==='Enter')app.admSearch()"><button class="btn primary" onclick="app.admSearch()">🔍 Suchen</button><button class="btn" onclick="app.admSearch(true)">↻ Neu laden</button></div>
      <div id="admUserList" class="list-box"></div><div id="admUserCard" style="margin-top:12px"></div>`;
        this.admSearch();
    };
    app.admSearch = function(reload){
        const box = $('admUserList'); if(!box) return;
        const q = (($('admUserQ') || {}).value || '').trim().toLowerCase();
        box.innerHTML = '<div class="muted" style="font-size:13px">Lade …</div>';
        this.admListKeys(!!reload).then(keys => {
            const hit = keys.filter(k => !q || k.indexOf(q) >= 0), shown = hit.slice(0, 30);
            box.innerHTML = (shown.length ? shown.map(k => row(`<span>👤 <b>${esc(k)}</b> <span class="muted" id="admRow-${k}" style="font-size:12px"></span></span><button class="btn" style="font-size:12px;padding:3px 10px" onclick="app.admOpenUser('${k}')">Öffnen</button>`)).join('') : '<div class="muted" style="font-size:13px">Keine Treffer.</div>') +
                `<div class="muted" style="font-size:11px;margin-top:6px">${hit.length} Treffer${hit.length > 30 ? ' (die ersten 30 – Suche eingrenzen)' : ''} · ${keys.length} Konten gesamt</div>`;
            shown.forEach(k => db.ref('playverseProfiles/' + k).once('value').then(s => { const p = s.val() || {}, el = $('admRow-' + k); if(el) el.textContent = p.name ? '(' + p.name + ' · Lv ' + (p.lvl || 1) + ')' : ''; }).catch(() => {}));
        }).catch(e => { box.innerHTML = '<div style="color:var(--red,#ff526f)">Spielerliste nicht ladbar.</div>'; this.dbErr('Spielerliste', e); });
    };
    app.admRefreshUser = function(key){ if(this._admOpen === key) this.admOpenUser(key); };
    app.admOpenUser = function(key){
        if(!this.isAdmin || !KEY.test(key) || !$('admUserCard')) return;
        this._admOpen = key;
        Promise.all([db.ref('playverseUsers/' + key).once('value'), db.ref('playverseBans/' + key).once('value'), db.ref('playverseMutes/' + key).once('value'), this.isTargetAdmin(key)]).then(([us, bs, ms, isA]) => {
            const u = us.val(), now = this.now(), c = $('admUserCard'); if(!c || this._admOpen !== key) return;
            if(!u){ c.innerHTML = card('Konto nicht gefunden', `<div class="muted">„${esc(key)}“ existiert nicht (mehr).</div>`); return; }
            const ban = banActive(bs.val(), now) ? bs.val() : null, mute = (ms.val() && Number(ms.val().until) > now) ? ms.val() : null, vip = Number(u.vipUntil) > now;
            const created = u.createdAt || u.since;
            const durOpts = Object.keys(DURS).map(k => `<option value="${k}">${DUR_LABEL[k]}</option>`).join('');
            c.innerHTML = card(`👤 ${esc(u.displayName || key)} <span class="muted" style="font-size:12px">(${esc(key)})</span> ${isA ? '<span class="pill" style="display:inline;font-size:10px">ADMIN</span>' : ''}${ban ? ' <span class="pill" style="display:inline;font-size:10px;background:#ff526f;color:#fff">GESPERRT</span>' : ''}${mute ? ' <span class="pill" style="display:inline;font-size:10px">STUMM</span>' : ''}`, `
        <div class="chips" style="margin-bottom:10px"><span class="chip">🎟️ ${Number(u.arcadeTickets || 0)} Tickets</span><span class="chip">⭐ Level ${Number(u.lvl || 1)} · ${Number(u.xp || 0)} XP${u.prestige ? ' · ✦' + Number(u.prestige) : ''}</span>
          <span class="chip">${vip ? '★ VIP bis ' + fmtT(u.vipUntil) : 'kein VIP'}</span><span class="chip">${u.clan ? '🛡️ [' + esc(u.clan) + ']' : 'kein Clan'}</span><span class="chip">${this.onlineUsers[key] ? '🟢 online' : '⚫ offline'}</span>
          ${created ? `<span class="chip">📅 seit ${fmtT(created).split(',')[0]}</span>` : ''}<span class="chip">⚔️ ${Number((u.stats || {}).wins || 0)} Siege</span></div>
        ${ban ? `<div class="note" style="margin-bottom:8px">🚫 Gesperrt ${Number(ban.until) ? 'bis ' + fmtT(ban.until) : 'dauerhaft'}${ban.reason ? ' – ' + esc(ban.reason) : ''} <span class="muted">(von ${esc(ban.by)})</span> <button class="btn" style="font-size:11px" onclick="app.admUnban('${key}')">Entsperren</button></div>` : ''}
        ${mute ? `<div class="note" style="margin-bottom:8px">🔇 Stumm bis ${fmtT(mute.until)} <button class="btn" style="font-size:11px" onclick="app.admUnmute('${key}')">Entstummen</button></div>` : ''}
        <div class="adm-actions">
          <div><b>🎟️ Tickets</b><div class="adm-row"><input id="admTk" type="number" value="100" style="width:90px"><button class="btn" onclick="app.admTickets('${key}', Number(document.getElementById('admTk').value)||0)">Geben</button><button class="btn" onclick="app.admTickets('${key}', -(Number(document.getElementById('admTk').value)||0))">Abziehen</button></div></div>
          <div><b>★ VIP</b><div class="adm-row"><button class="btn" onclick="app.admVip('${key}', 30)">+30 Tage</button><button class="btn" onclick="app.admVip('${key}', 0)">VIP entfernen</button></div></div>
          <div><b>🔇 Chat-Stummschaltung</b><div class="adm-row"><select id="admMuteMin"><option value="10">10 Min.</option><option value="60">1 Std.</option><option value="1440">1 Tag</option><option value="10080">7 Tage</option></select><button class="btn" onclick="app.admMute('${key}', Number(document.getElementById('admMuteMin').value))">Stumm schalten</button></div></div>
          <div><b>🚫 Account sperren</b><div class="adm-row"><select id="admBanDur">${durOpts}</select><input id="admBanReason" placeholder="Grund (optional)" maxlength="120" style="flex:1;min-width:120px"><button class="btn danger" onclick="app.admBan('${key}', document.getElementById('admBanDur').value, document.getElementById('admBanReason').value)">Sperren</button></div></div>
          <div><b>🗑️ Konto löschen</b><div class="adm-row"><label style="font-size:12px"><input type="checkbox" id="admBlockName"> Namen danach sperren</label><button class="btn danger" onclick="app.admDelete('${key}', document.getElementById('admBlockName').checked)">Konto löschen …</button></div></div>
          <div><button class="btn" onclick="app.openProfile('${key}')">🙂 Profil ansehen</button></div></div>`);
        }).catch(e => this.dbErr('Spieler laden', e));
    };

    // ---- Support-Tickets (Live)
    app.admRender_support = function(){
        body().innerHTML = '<div id="admTickets" class="muted">Lade …</div>';
        this._admTicketCb = s => {
            const all = s.val() || {}; this.cachedAllTickets = all; const box = $('admTickets'); if(!box) return;
            const items = []; Object.keys(all).forEach(u => { if(!SAFE.test(u)) return; Object.keys(all[u] || {}).forEach(k => { if(SAFE.test(k)) items.push({ u, k, t: all[u][k] || {} }); }); });
            items.sort((a, b) => (a.t.status === 'Offen' ? 0 : 1) - (b.t.status === 'Offen' ? 0 : 1));
            box.className = ''; box.innerHTML = `<div class="muted" style="font-size:12px;margin-bottom:8px">${items.filter(i => i.t.status === 'Offen').length} offen · ${items.length} gesamt</div>` + (items.length ? items.map(({ u, k, t }) => {
                const open = t.status === 'Offen';
                return `<div class="ticket-card"><div class="row" style="justify-content:space-between;margin-bottom:6px"><strong>👤 ${esc(u)} · #${esc(t.id)} (${esc(t.subj)})</strong><span class="ticket-status ${open ? 'open' : 'closed'}">${esc(t.status)}</span></div>
          <div class="muted" style="font-size:12px;margin-bottom:6px">${esc(t.cat)} · ${esc(t.createdAt)}</div><div style="font-size:13px;margin-bottom:8px">${esc(t.msg)}</div>
          ${t.reply ? `<div style="background:#1c2940;border-left:3px solid var(--cyan);padding:8px;border-radius:6px;font-size:12px;margin-bottom:8px"><b>Antwort:</b> ${esc(t.reply)}</div>` : ''}
          <div class="row" style="justify-content:flex-start"><button class="btn" style="padding:5px 10px;font-size:11px" onclick="app.openTicketDetail('${u}','${k}',true)">🔍 Großansicht</button>
            <button class="btn primary" style="padding:5px 10px;font-size:11px" onclick="app.adminReplyTicket('${u}','${k}',false)">💬 Antworten</button>
            ${open ? `<button class="btn success" style="padding:5px 10px;font-size:11px" onclick="app.adminCloseTicket('${u}','${k}',false)">✓ Schließen</button>` : ''}
            <button class="btn danger" style="padding:5px 10px;font-size:11px" onclick="app.adminDeleteTicket('${u}','${k}',false)">🗑️ Löschen</button></div></div>`;
            }).join('') : '<div class="muted" style="font-size:13px">Aktuell gibt es keine Tickets.</div>');
        };
        db.ref('playverseTickets').on('value', this._admTicketCb);
    };

    // ---- News
    app.admRender_news = function(){
        body().innerHTML = `${card('📰 Neue News veröffentlichen', `<div class="field"><label>Titel</label><input id="admNewsTitle" maxlength="80" placeholder="Überschrift"></div>
      <div class="field"><label>Text</label><textarea id="admNewsText" maxlength="1500" rows="4" style="width:100%" placeholder="Was gibt es Neues?"></textarea></div>
      <div class="field"><label>Kategorie</label><select id="admNewsTag"><option>NEU</option><option>UPDATE</option><option>FIX</option><option>VIP</option><option>EVENT</option><option>INFO</option></select></div>
      <button class="btn primary" onclick="app.admPostNews()">📣 Veröffentlichen</button>`)}
      ${card('Veröffentlichte News (Datenbank)', '<div id="admNewsList" class="muted">Lade …</div>')}`;
        this.admLoadNews();
    };
    app.admLoadNews = function(){
        db.ref('playverseNews').limitToLast(30).once('value').then(s => {
            const rows = []; s.forEach(c => { const v = c.val() || {}; if(SAFE.test(c.key)) rows.unshift({ id: c.key, v }); });
            const el = $('admNewsList'); if(!el) return; el.className = '';
            el.innerHTML = rows.length ? rows.map(({ id, v }) => row(`<span><b>${esc(v.title)}</b> <span class="muted" style="font-size:11px">${esc(v.tag || '')} · ${v.ts ? fmtT(v.ts) : ''}</span></span><button class="btn danger" style="font-size:11px;padding:3px 9px" onclick="app.admDeleteNews('${id}')">🗑️</button>`)).join('') : '<div class="muted" style="font-size:13px">Noch keine News in der Datenbank.</div>';
        }).catch(e => this.dbErr('News', e));
    };
    app.admPostNews = function(){
        if(!this.admOk()) return;
        const t = $('admNewsTitle'), x = $('admNewsText'), g = $('admNewsTag');
        const title = (t.value || '').trim().slice(0, 80), text = (x.value || '').trim().slice(0, 1500);
        if(!title || !text){ this.toast('Bitte Titel und Text ausfüllen.', 'err'); return; }
        db.ref('playverseNews').push({ title, text, tag: g.value || 'INFO', ts: firebase.database.ServerValue.TIMESTAMP })
            .then(() => { t.value = ''; x.value = ''; this.toast('📰 News veröffentlicht!'); this.admLog('news', '', title); this.admLoadNews(); }).catch(e => this.dbErr('News veröffentlichen', e));
    };
    app.admDeleteNews = function(id){
        if(!this.admOk() || !SAFE.test(id) || !confirm('Diese News wirklich löschen?')) return;
        db.ref('playverseNews/' + id).remove().then(() => { this.admLog('news-löschen', id, ''); this.admLoadNews(); }).catch(e => this.dbErr('News löschen', e));
    };

    // ---- Events
    app.admRender_events = function(){
        const ET = this.EVENT_TYPES || {}, e = this.eventNow, live = e && Number(e.until) > this.now();
        body().innerHTML = `${card('🎉 Aktuelles Event', live ? `<div class="event-banner" style="display:flex"><span style="font-size:28px">${(ET[e.type] || {}).ico || '📣'}</span><div style="flex:1"><b>${esc(e.title || (ET[e.type] || {}).name || e.type)}</b><div style="font-size:13px">${esc(e.text || '')}</div><div class="muted" style="font-size:12px">Läuft bis ${fmtT(e.until)}</div></div><button class="btn danger" onclick="app.admEndEvent()">⏹ Beenden</button></div>` : '<div class="muted" style="font-size:13px">Aktuell läuft kein Event.</div>')}
      ${card('🚀 Event starten', `<div class="field"><label>Art</label><select id="admEvType">${Object.keys(ET).map(k => `<option value="${k}">${ET[k].ico} ${esc(ET[k].name)}</option>`).join('')}</select></div>
        <div class="field"><label>Titel (optional)</label><input id="admEvTitle" maxlength="60" placeholder="z. B. Wochenend-Spaß"></div><div class="field"><label>Text (optional)</label><input id="admEvText" maxlength="140" placeholder="Kurze Beschreibung"></div>
        <div class="field"><label>Dauer</label><select id="admEvHours"><option value="1">1 Stunde</option><option value="6">6 Stunden</option><option value="24" selected>24 Stunden</option><option value="72">3 Tage</option><option value="168">7 Tage</option></select></div>
        <button class="btn primary" onclick="app.admStartEvent()">🚀 Starten</button>`)}`;
    };
    app.admStartEvent = function(){
        if(!this.admOk()) return;
        const ET = this.EVENT_TYPES || {}, type = $('admEvType').value, hours = Number($('admEvHours').value) || 24;
        if(!ET[type]) return;
        db.ref('playverseEvents/current').set({ type, title: ($('admEvTitle').value || '').trim().slice(0, 60), text: ($('admEvText').value || '').trim().slice(0, 140), until: this.now() + hours * 36e5, ts: firebase.database.ServerValue.TIMESTAMP })
            .then(() => { this.toast('🚀 Event gestartet!'); this.admLog('event-start', type, hours + ' Std.'); setTimeout(() => this.admRender_events(), 200); }).catch(e => this.dbErr('Event', e));
    };
    app.admEndEvent = function(){
        if(!this.admOk()) return;
        db.ref('playverseEvents/current').remove().then(() => { this.toast('Event beendet.'); this.admLog('event-ende', '', ''); setTimeout(() => this.admRender_events(), 200); }).catch(e => this.dbErr('Event', e));
    };

    // ---- Clans
    app.admRender_clans = function(){
        body().innerHTML = '<div class="muted">Lade …</div>';
        db.ref('playverseClans').once('value').then(s => {
            const all = s.val() || {}, tags = Object.keys(all).filter(t => TAG.test(t));
            body().innerHTML = tags.length ? tags.map(t => { const c = all[t] || {}, mem = Object.keys(c.members || {}).filter(k => KEY.test(k)), bans = Object.keys(c.bans || {}).filter(k => KEY.test(k));
                return card(`<span class="nm-clan">[${esc(t)}]</span> ${esc(c.name)} <span class="muted" style="font-size:12px">· ${mem.length} Mitglieder</span>`,
                    mem.map(k => row(`<span>${k === c.owner ? '👑 ' : ''}<b>${esc(c.members[k])}</b> <span class="muted" style="font-size:11px">(${esc(k)})</span></span><span style="display:inline-flex;gap:4px">${k !== c.owner ? `<button class="btn" style="font-size:11px;padding:2px 7px" onclick="app.admClanTransfer('${t}','${k}')">👑 Zum Besitzer</button><button class="btn" style="font-size:11px;padding:2px 7px" onclick="app.admClanKick('${t}','${k}')">🚪 Kicken</button>` : ''}</span>`)).join('') +
                    (bans.length ? `<div class="muted" style="font-size:12px;margin-top:6px">Clan-Banns: ${bans.map(k => esc(c.bans[k])).join(', ')}</div>` : '') +
                    `<div style="margin-top:8px"><button class="btn danger" onclick="app.admClanDelete('${t}')">🗑️ Clan auflösen</button></div>`); }).join('') : '<div class="muted" style="font-size:13px">Es gibt noch keine Clans.</div>';
        }).catch(e => { body().innerHTML = '<div style="color:var(--red,#ff526f)">Clans nicht ladbar.</div>'; this.dbErr('Clans', e); });
    };
    const detachUser = (tag, key) => db.ref('playverseUsers/' + key + '/clan').transaction(c => (c === tag ? null : c)).then(() => db.ref('playverseProfiles/' + key + '/clan').set('').catch(() => {}));
    app.admClanKick = function(tag, key){
        if(!this.admOk() || !TAG.test(tag) || !KEY.test(key) || !confirm('Spieler aus dem Clan [' + tag + '] werfen?')) return;
        clanRemove(tag, key).then(() => detachUser(tag, key)).then(() => { this.toast('🚪 ' + key + ' aus [' + tag + '] entfernt'); this.admLog('clan-kick', key, tag); this.admRender_clans(); }).catch(e => this.dbErr('Clan', e));
    };
    app.admClanTransfer = function(tag, key){
        if(!this.admOk() || !TAG.test(tag) || !KEY.test(key) || !confirm('Besitz von [' + tag + '] an ' + key + ' übertragen?')) return;
        let ok = false;
        db.ref('playverseClans/' + tag).transaction(cur => { ok = false; if(cur === null || !(cur.members || {})[key]) return cur === null ? cur : undefined; cur.owner = key; ok = true; return cur; })
            .then(r => { if(r.committed && ok){ this.toast('👑 Besitzer geändert'); this.admLog('clan-besitzer', key, tag); } this.admRender_clans(); }).catch(e => this.dbErr('Clan', e));
    };
    app.admClanDelete = function(tag){
        if(!this.admOk() || !TAG.test(tag) || !confirm('Clan [' + tag + '] wirklich auflösen? Alle Mitglieder verlieren den Clan.')) return;
        db.ref('playverseClans/' + tag).once('value').then(s => {
            const c = s.val() || {}; const keys = Object.keys(c.members || {}).filter(k => KEY.test(k));
            return Promise.all(keys.map(k => detachUser(tag, k))).then(() => db.ref('playverseClans/' + tag).remove());
        }).then(() => { this.toast('🗑️ Clan [' + tag + '] aufgelöst'); this.admLog('clan-löschen', tag, ''); this.admRender_clans(); }).catch(e => this.dbErr('Clan', e));
    };

    // ---- Chat-Moderation
    app.admRender_chat = function(){
        body().innerHTML = '<div class="muted">Lade …</div>';
        db.ref('playverseGlobalChat').limitToLast(40).once('value').then(s => {
            const rows = []; s.forEach(c => { if(SAFE.test(c.key)) rows.unshift({ id: c.key, m: c.val() || {} }); });
            body().innerHTML = `<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap"><button class="btn" onclick="app.admRender_chat()">↻ Aktualisieren</button><button class="btn danger" onclick="app.admChatClear()">🧹 Gesamten Chat leeren</button></div>` +
                `<div class="list-box">` + (rows.length ? rows.map(({ id, m }) => row(`<span style="min-width:0"><span class="muted" style="font-size:11px">${esc(m.time || '')}</span> <b>${esc(m.sender)}</b>${m.uid && KEY.test(m.uid) ? ` <span class="muted" style="font-size:11px">(${esc(m.uid)})</span>` : ''}: ${esc(m.text)}</span>
          <span style="display:inline-flex;gap:4px">${m.uid && KEY.test(m.uid) ? `<button class="btn" style="font-size:11px;padding:2px 7px" title="10 Minuten stummschalten" onclick="app.admMute('${m.uid}',10)">🔇</button>` : ''}<button class="btn danger" style="font-size:11px;padding:2px 7px" onclick="app.admChatDelete('${id}')">🗑️</button></span>`)).join('') : '<div class="muted" style="font-size:13px">Der Chat ist leer.</div>') + '</div>';
        }).catch(e => this.dbErr('Chat', e));
    };
    app.admChatDelete = function(id){
        if(!this.admOk() || !SAFE.test(id)) return;
        db.ref('playverseGlobalChat/' + id).remove().then(() => { this.admLog('chat-löschen', id, ''); this.admRender_chat(); }).catch(e => this.dbErr('Chat', e));
    };
    app.admChatClear = function(){
        if(!this.admOk() || !confirm('Den gesamten Chat wirklich leeren?')) return;
        db.ref('playverseGlobalChat').remove().then(() => { this.toast('🧹 Chat geleert'); this.admLog('chat-leeren', '', ''); this.admRender_chat(); }).catch(e => this.dbErr('Chat', e));
    };

    // ---- Protokoll
    app.admRender_log = function(){
        body().innerHTML = '<div class="muted">Lade …</div>';
        db.ref('playverseAdminLog').orderByChild('ts').limitToLast(80).once('value').then(s => {
            const rows = []; s.forEach(c => { rows.unshift(c.val() || {}); });
            body().innerHTML = `<div class="muted" style="font-size:12px;margin-bottom:8px">Alle Admin-Aktionen, neueste zuerst. Einträge können nicht nachträglich geändert werden (Regel „nur anhängen“).</div><div class="list-box">` +
                (rows.length ? rows.map(l => row(`<span><b>${esc(l.by)}</b> · ${esc(l.action)}${l.target ? ' → <b>' + esc(l.target) + '</b>' : ''}${l.detail ? ' <span class="muted">(' + esc(l.detail) + ')</span>' : ''}</span><span class="muted" style="font-size:11px;white-space:nowrap">${l.ts ? fmtT(l.ts) : ''}</span>`)).join('') : '<div class="muted" style="font-size:13px">Noch keine Einträge.</div>') + '</div>';
        }).catch(e => this.dbErr('Protokoll', e));
    };

    // ======================================================  7) Start
    function listen(){
        if(typeof db === 'undefined' || !db) return;
        db.ref('playverseMutes').on('value', s => { app.muteMap = s.val() || {}; }, () => {});
    }
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', listen); else listen();
})();