/* PLAYVERSE – Paket 8: Clan-Bosse
   Jede Woche (Mo 00:00 UTC) wartet auf jeden Clan ein Boss. Sein Schaden = alle XP, die die Clan-Mitglieder in dieser Woche sammeln.
   Die Lebenspunkte wachsen mit der Clan-Größe (600 XP pro Mitglied). Ist der Boss besiegt, holt sich jedes Mitglied mit
   mindestens 50 XP Beitrag eine Belohnung ab (auch noch in der Folgewoche). Es gibt keinen Zeitdruck und keine Strafen.
   Datenbasis: users/<name>/wxp {w, x, pw, px} (XP dieser und der letzten Woche), gespiegelt nach playverseProfiles/<name>/wxp. */
(function(){
    const app = window.app;
    if(!app) return;
    const $ = id => document.getElementById(id);
    const esc = s => app.escapeHtml(s);

    // ======================================================  KONFIGURATION
    const HP_PER_MEMBER = 600, MIN_CONTRIB = 50;
    const REWARD_TK = 100, TOP_BONUS_TK = 50, REWARD_XP = 50, ITEM = 't_boss';
    const WEEK = 7 * 864e5, MON0 = Date.UTC(1970, 0, 5);
    const BOSSES = [
        { name: 'Pixel-Drache', ico: '🐉' }, { name: 'Glitch-Geist', ico: '👻' }, { name: 'Neon-Krake', ico: '🐙' }, { name: 'Turbo-Roboter', ico: '🤖' },
        { name: 'Retro-Rex', ico: '🦖' }, { name: 'Bit-Alien', ico: '👽' }, { name: 'Zombie-Zocker', ico: '🧟' }, { name: 'Skorpion-Syndikat', ico: '🦂' }
    ];
    const weekIdx = ts => Math.floor((ts - MON0) / WEEK);
    const bossOf = idx => BOSSES[((idx % BOSSES.length) + BOSSES.length) % BOSSES.length];
    const hpFor = n => HP_PER_MEMBER * Math.max(1, n);
    app.weekIdx = weekIdx; app.bossOf = bossOf; app.bossHp = hpFor;

    // XP dieser (oder der vorigen) Woche aus einem wxp-Eintrag
    function xpOf(w, idx){
        if(!w) return 0;
        if(Number(w.w) === idx) return Number(w.x) || 0;
        if(Number(w.pw) === idx) return Number(w.px) || 0;
        return 0;
    }
    // Auswertung für eine Woche: { sum, hp, defeated, rows:[{key,name,xp}] }
    function evaluate(clan, wxps, idx){
        const keys = Object.keys(clan.members || {});
        const rows = keys.map(k => ({ key: k, name: clan.members[k], xp: xpOf(wxps[k], idx) })).sort((a, b) => b.xp - a.xp);
        const sum = rows.reduce((a, r) => a + r.xp, 0), hp = hpFor(keys.length);
        return { idx, boss: bossOf(idx), sum, hp, defeated: sum >= hp, rows, top: rows.length && rows[0].xp >= MIN_CONTRIB ? rows[0].key : '' };
    }
    app._bossEval = evaluate;

    // ======================================================  Belohnung abholen
    app.claimBoss = function(idx){
        const key = this.currentUser, info = this._bossInfo && this._bossInfo[idx];
        if(!key || !db || !info || !info.defeated || this._bossBusy) return;
        const mine = info.rows.find(r => r.key === key);
        if(!mine || mine.xp < MIN_CONTRIB) return;
        this._bossBusy = true;
        const self = this, wk = 'w' + idx, top = info.top === key, tk = REWARD_TK + (top ? TOP_BONUS_TK : 0); let ok = false;
        db.ref('playverseUsers/' + key).transaction(cur => {
            ok = false;
            if(cur === null) return cur;
            cur.bossClaim = cur.bossClaim || {};
            if(cur.bossClaim[wk]) return;
            cur.bossClaim[wk] = tk;
            cur.arcadeTickets = Number(cur.arcadeTickets || 0) + tk;
            cur.owned = cur.owned || {}; cur.owned[ITEM] = true;
            cur.stats = cur.stats || {}; cur.stats.boss = Number(cur.stats.boss || 0) + 1;
            if(self.xpApply) self.xpApply(cur, REWARD_XP);
            ok = true; return cur;
        }).then(r => { if(r.committed && ok) self.toast(`🎁 Boss besiegt! +${tk} 🎟️${top ? ' (Top-Schaden-Bonus!)' : ''}`); })
            .catch(e => self.dbErr('Boss-Belohnung', e)).then(() => { self._bossBusy = false; self.renderClanBoss(self._bossClan); });
    };

    // ======================================================  Oberfläche (im Clan-Reiter)
    app.renderClanBoss = function(clan){
        const box = $('clanBossBox'); if(!box || !clan || !db) return;
        this._bossClan = clan;
        const now = this.now(), cur = weekIdx(now), keys = Object.keys(clan.members || {});
        box.innerHTML = '<div class="muted" style="font-size:13px">Lade Boss …</div>';
        Promise.all(keys.map(k => db.ref('playverseProfiles/' + k + '/wxp').once('value').then(s => [k, s.val()]))).then(list => {
            const wxps = {}; list.forEach(([k, v]) => { wxps[k] = v; });
            // eigene Werte immer aus dem Konto (aktueller als der Spiegel)
            if(this.currentUser && this.userData && this.userData.wxp && wxps[this.currentUser] !== undefined) wxps[this.currentUser] = this.userData.wxp;
            const now2 = evaluate(clan, wxps, cur), prev = evaluate(clan, wxps, cur - 1);
            this._bossInfo = { [cur]: now2, [cur - 1]: prev };
            const claimed = (this.userData && this.userData.bossClaim) || {};
            const left = Math.max(0, MON0 + (cur + 1) * WEEK - now), dd = Math.floor(left / 864e5), hh = Math.floor(left % 864e5 / 36e5);
            const me = this.currentUser, pct = Math.min(100, Math.round(now2.sum / now2.hp * 100));
            const rowsHtml = now2.rows.map((r, i) => `<div class="list-item"><span>${i === 0 && r.xp >= MIN_CONTRIB ? '👑 ' : ''}<b>${this.nameHtml(r.name, r.key, { link: true })}</b></span><span class="pill ticket-pill">${r.xp} XP</span></div>`).join('');
            const claimBtn = (info, idx, label) => {
                const mine = info.rows.find(r => r.key === me), got = claimed['w' + idx];
                if(!info.defeated) return '';
                if(got) return `<div style="color:#b8f36b;font-size:13px;margin-top:6px">✓ ${label}-Belohnung abgeholt (+${got} 🎟️)</div>`;
                if(!mine || mine.xp < MIN_CONTRIB) return `<div class="muted" style="font-size:12px;margin-top:6px">${label}: Boss besiegt – für die Belohnung brauchst du mindestens ${MIN_CONTRIB} XP Beitrag.</div>`;
                return `<button class="btn primary" style="margin-top:8px" onclick="app.claimBoss(${idx})">🎁 ${label}-Belohnung abholen (+${REWARD_TK + (info.top === me ? TOP_BONUS_TK : 0)} 🎟️)</button>`;
            };
            box.innerHTML = `<div class="tour-card" style="margin-top:14px">
        <div class="muted" style="font-size:12px;letter-spacing:.08em">CLAN-BOSS DER WOCHE · endet in ${dd} Tg ${hh} Std</div>
        <div style="display:flex;align-items:center;gap:14px;margin:8px 0">
          <div style="font-size:46px;line-height:1;${now2.defeated ? 'filter:grayscale(1);opacity:.5' : ''}">${now2.boss.ico}</div>
          <div style="flex:1;min-width:0"><div style="font-size:19px;font-weight:800">${esc(now2.boss.name)}${now2.defeated ? ' · besiegt!' : ''}</div>
            <div class="ach-bar" style="margin:6px 0 4px;height:12px"><i style="width:${100 - pct}%;background:linear-gradient(90deg,#ff5d73,#ffb347)"></i></div>
            <div class="muted" style="font-size:12px">${now2.defeated ? 'Alle Lebenspunkte abgebaut!' : `${Math.max(0, now2.hp - now2.sum)} von ${now2.hp} Lebenspunkten übrig`} · Schaden = XP der Mitglieder diese Woche (${now2.sum})</div></div></div>
        ${claimBtn(now2, cur, 'Diese Woche')}${claimBtn(prev, cur - 1, 'Letzte Woche')}
        <div class="muted" style="font-size:11px;margin:10px 0 6px">Belohnung: ${REWARD_TK} 🎟️ + ${REWARD_XP} XP + Titel „Bossbezwinger“, der Spieler mit dem meisten Schaden bekommt +${TOP_BONUS_TK} 🎟️. Voraussetzung: mindestens ${MIN_CONTRIB} XP Beitrag. Bosse kommen jede Woche neu – ohne Druck, abholen kannst du auch noch in der Folgewoche.</div>
        <div class="list-box">${rowsHtml || '<div class="muted" style="font-size:13px">Noch kein Schaden diese Woche.</div>'}</div></div>`;
        }).catch(e => { box.innerHTML = '<div style="color:var(--red,#ff526f)">Boss nicht ladbar.</div>'; this.dbErr('Clan-Boss', e); });
    };
})();