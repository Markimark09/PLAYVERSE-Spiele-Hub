/* PLAYVERSE – Paket 7: Meisterschaft pro Spiel (Bronze → Diamant) und Prestige (Neustart ab Level 100)
   Datenmodell (pro Konto unter playverseUsers/<name>):
     mastery {spiel:{t:Stufe 0–5, b:Bestwert}}    Meisterschaftsstufen und persönliche Bestwerte
     prestige                                      Anzahl Prestige-Neustarts (jedes Prestige: +5 % XP, max. +50 %)
   Belohnungen werden atomar in der Transaktion gutgeschrieben (Tickets + XP). */
(function(){
    const app = window.app;
    if(!app) return;
    const $ = id => document.getElementById(id);
    const esc = s => app.escapeHtml(s);

    // ======================================================  KONFIGURATION
    const TIERS = [
        { id: 1, name: 'Bronze',  ico: '🥉', col: '#cd7f32', tk: 10,  xp: 10 },
        { id: 2, name: 'Silber',  ico: '🥈', col: '#cfd6e6', tk: 20,  xp: 20 },
        { id: 3, name: 'Gold',    ico: '🥇', col: '#ffd36b', tk: 40,  xp: 40 },
        { id: 4, name: 'Platin',  ico: '💠', col: '#8fe3f2', tk: 80,  xp: 80 },
        { id: 5, name: 'Diamant', ico: '💎', col: '#b9a0ff', tk: 150, xp: 150 }
    ];
    // Schwellen für Bronze, Silber, Gold, Platin, Diamant. Bei Spielen „weniger ist besser“ (Zeit/Züge) sind die Werte absteigend.
    const MAST = {
        tetris:[300,1000,2500,5000,10000], g2048:[500,2000,5000,12000,25000], breakout:[100,250,400,600,900], invaders:[60,150,250,340,380],
        highway:[200,500,1000,2000,4000], tower:[3,6,9,12,15], snake:[5,12,20,30,45], flappy:[3,8,15,25,40], catch:[5,12,20,30,45],
        mole:[5,9,13,17,21], aim:[6,10,14,18,22], odd:[4,8,12,16,20], stroop:[5,10,18,28,40], memmat:[3,5,7,9,12], type:[120,200,280,360,450],
        pacman:[500,1500,3000,6000,10000], dk:[300,1000,2500,5000,9000], frogger:[100,400,900,1600,2800], asteroids:[500,1500,3500,7000,12000],
        neon:[300,1000,2500,5000,9000], spaceshooter:[300,1000,2500,5000,9000],
        speed:[20000,15000,12000,10000,8500], reaction:[450,350,300,250,210], timer:[1000,500,250,100,40], memory:[50,38,30,24,19], guess:[14,11,9,8,7]
    };
    const PRESTIGE_XP_STEP = 0.05, PRESTIGE_XP_MAX_STEPS = 10;
    const PRES_REWARD = { 1: { tk: 300, item: 't_prestige1' }, 2: { tk: 300 }, 3: { tk: 400, item: 'a_prestige' }, 5: { tk: 500, item: 't_prestige5' }, 10: { tk: 1000, item: 'c_prestige' } };
    const presReward = n => PRES_REWARD[n] || { tk: n > 10 ? 500 : 400 };
    app.MAST = MAST; app.MAST_TIERS = TIERS;

    const isAsc = g => !!(app.LB_GAMES[g] && app.LB_GAMES[g].dir === 'asc');
    // Stufe (0–5) für einen Wert
    function tierFor(game, score){
        const th = MAST[game]; if(!th || !isFinite(Number(score))) return 0;
        const asc = isAsc(game); let t = 0;
        th.forEach((x, i) => { if(asc ? score <= x : score >= x) t = i + 1; });
        return t;
    }
    app.masteryTier = tierFor;

    // ======================================================  Meisterschaft: Wert verbuchen
    app.masteryCheck = function(game, score, user){
        user = user || this.currentUser;
        if(!MAST[game] || !user || !db) return;
        score = Math.round(Number(score)); if(!isFinite(score)) return;
        const self = this, asc = isAsc(game); let gained = [];
        db.ref('playverseUsers/' + user).transaction(cur => {
            gained = [];
            if(cur === null) return cur;
            cur.mastery = cur.mastery || {};
            const m = cur.mastery[game] || { t: 0, b: null };
            const hasB = m.b !== null && m.b !== undefined;
            const better = !hasB || (asc ? score < m.b : score > m.b);
            if(better) m.b = score;
            const nt = Math.max(Number(m.t || 0), tierFor(game, m.b));
            for(let t = Number(m.t || 0) + 1; t <= nt; t++){
                const T = TIERS[t - 1]; gained.push(T);
                cur.arcadeTickets = Number(cur.arcadeTickets || 0) + T.tk;
                if(self.xpApply) self.xpApply(cur, T.xp);
            }
            m.t = nt; cur.mastery[game] = m;
            return (better || gained.length) ? cur : undefined;
        }).then(r => {
            if(!r.committed) return;
            gained.forEach(T => self.toast(`🏅 Meisterschaft: ${self.LB_GAMES[game].name} – ${T.name}! (+${T.tk} 🎟️)`));
        }).catch(e => self.dbErr('Meisterschaft', e));
    };

    // ======================================================  Oberfläche: Reiter „Meisterschaft“
    app.renderMastery = function(){
        const need = $('mastNeedAuth'), cont = $('mastContent');
        const logged = !!this.currentUser && !!this.userData;
        if(need) need.style.display = logged ? 'none' : 'block';
        if(cont) cont.style.display = logged ? 'block' : 'none';
        if(!logged) return;
        const mast = this.userData.mastery || {}, games = Object.keys(MAST).filter(g => this.LB_GAMES[g]);
        const counts = [0, 0, 0, 0, 0, 0]; games.forEach(g => { counts[Math.min(5, Number((mast[g] || {}).t || 0))]++; });
        const total = games.reduce((a, g) => a + Number((mast[g] || {}).t || 0), 0);
        $('mastSummary').innerHTML = `<div class="muted" style="font-size:13px;margin-bottom:8px"><b style="color:var(--gold,#ffd36b)">${total} / ${games.length * 5}</b> Stufen gesammelt · ` +
            TIERS.map(T => `${T.ico} ${counts[T.id]}`).join(' &nbsp; ') + `</div><div class="ach-bar"><i style="width:${Math.round(total / (games.length * 5) * 100)}%"></i></div>`;
        $('mastList').innerHTML = games.map(g => {
            const cfg = this.LB_GAMES[g], th = MAST[g], m = mast[g] || { t: 0, b: null }, t = Number(m.t || 0), asc = isAsc(g);
            const has = m.b !== null && m.b !== undefined, next = t >= 5 ? null : th[t];
            let pct = t >= 5 ? 100 : !has ? 0 : asc ? Math.max(0, Math.min(100, Math.round(next / m.b * 100))) : Math.max(0, Math.min(100, Math.round(m.b / next * 100)));
            const T = t ? TIERS[t - 1] : null, N = t < 5 ? TIERS[t] : null;
            return `<div class="ach-item${t ? ' ok' : ''}" style="opacity:1;gap:10px"><div class="ach-ico">${cfg.ico}</div>
        <div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(cfg.name)}</b><span style="color:${T ? T.col : '#7d88b8'};font-weight:700;white-space:nowrap">${T ? T.ico + ' ' + T.name : 'noch keine Stufe'}</span></div>
        <div class="ach-bar" style="margin:6px 0 3px;height:6px"><i style="width:${pct}%;${N ? 'background:' + N.col : ''}"></i></div>
        <div class="muted" style="font-size:11px">${has ? 'Bestwert: ' + esc(this.fmtScore(g, m.b)) : 'Noch nicht gespielt'}${N ? ` · nächste Stufe ${N.ico} ${N.name}: ${esc(this.fmtScore(g, next))}` : ' · Höchste Stufe erreicht!'}</div></div></div>`;
        }).join('');
    };

    // ======================================================  Prestige
    const presMult = n => 1 + PRESTIGE_XP_STEP * Math.min(Number(n || 0), PRESTIGE_XP_MAX_STEPS);
    app.presMult = presMult;
    app.renderPrestige = function(){
        const box = $('progLevel'); if(!box || !this.userData || !this.levelOf) return;
        const d = this.userData, p = Number(d.prestige || 0), L = this.levelOf(d.xp || 0), max = L.level >= 100;
        let html = '';
        if(p > 0) html += `<div class="prog-pres">✦ Prestige <b>${p}</b> · XP-Bonus <b>+${Math.round((presMult(p) - 1) * 100)} %</b></div>`;
        if(max){
            const nx = presReward(p + 1);
            html += `<div class="daily-card" style="margin-top:10px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <div><b style="color:var(--gold,#ffd36b)">⭐ Prestige möglich!</b><div class="muted" style="font-size:12px;margin-top:2px">Level &amp; XP starten neu. Du behältst Tickets, Gegenstände, Erfolge und Meisterschaften.<br>Belohnung: <b>+${nx.tk} 🎟️</b>${nx.item ? ' + exklusiver Gegenstand' : ''} · dauerhaft <b>+${Math.round((presMult(p + 1) - 1) * 100)} % XP</b>.</div></div>
        <button class="btn primary" onclick="app.doPrestige()">⭐ Prestige ${p + 1} starten</button></div></div>`;
        } else if(p === 0){
            html += `<div class="muted" style="font-size:11px;margin-top:6px">Ab Level 100 kannst du ein Prestige starten: Neustart mit dauerhaftem XP-Bonus und exklusiven Belohnungen.</div>`;
        }
        if(html) box.insertAdjacentHTML('beforeend', html);
    };
    app.doPrestige = function(){
        if(!this.currentUser || !db || this.presBusy || !this.levelOf) return;
        const p = Number((this.userData && this.userData.prestige) || 0);
        if(this.levelOf((this.userData && this.userData.xp) || 0).level < 100) return;
        if(!confirm(`Prestige ${p + 1} starten?\n\nDein Level und deine XP werden auf 0 zurückgesetzt. Tickets, Gegenstände, Erfolge und Meisterschaften bleiben erhalten.`)) return;
        this.presBusy = true;
        const self = this; let ok = false, rw = null, n = 0;
        db.ref('playverseUsers/' + this.currentUser).transaction(cur => {
            ok = false;
            if(cur === null) return cur;
            if(self.levelOf(cur.xp || 0).level < 100) return;
            n = Number(cur.prestige || 0) + 1; rw = presReward(n);
            cur.prestige = n; cur.xp = 0; cur.lvl = 1;
            cur.arcadeTickets = Number(cur.arcadeTickets || 0) + rw.tk;
            if(rw.item){ cur.owned = cur.owned || {}; cur.owned[rw.item] = true; }
            ok = true; return cur;
        }).then(r => { if(r.committed && ok) self.toast(`🎉 Prestige ${n}! +${rw.tk} 🎟️${rw.item ? ' und ein exklusiver Gegenstand' : ''}`); })
            .catch(e => self.dbErr('Prestige', e)).then(() => { self.presBusy = false; self.renderProgress(); });
    };

    // ======================================================  Einhängen
    const _rp = app.renderProgress;
    if(_rp) app.renderProgress = function(){ _rp.call(this); try { this.renderPrestige(); } catch(e) { console.error('[PLAYVERSE] Prestige-UI:', e); } };
    const _render = app.renderAccountUI;
    app.renderAccountUI = function(){ _render.call(this); try { this.renderMastery(); } catch(e) { console.error('[PLAYVERSE] Meisterschaft-UI:', e); } };
    const _sub = app.openSubTab;
    app.openSubTab = function(tab){ _sub.call(this, tab); if(tab === 'mast') this.renderMastery(); };
})();