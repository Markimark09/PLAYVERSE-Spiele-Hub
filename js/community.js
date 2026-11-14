/* PLAYVERSE – Paket 3: Spielerprofile, Wochen-Turnier, Events (Admin), Clans
   Firebase-Pfade:
     playverseProfiles/<user>   öffentliches Profil {name, bio, since, wins, games, ach{id:1}, clan, best{spiel:score}}
     playverseTournament/w<idx>/<user> = {name, score, ts}   (Wochen-Turnier, idx = Wochennummer seit 05.01.1970)
     playverseEvents/current    = {type, title, text, until}   (nur Admin per PIN, über die Oberfläche)
     playverseClans/<TAG>       = {name, tag, owner, n, ts, members{user:Anzeigename}} */
(function(){
  const app = window.app;
  if(!app) return;
  const $ = id => document.getElementById(id);
  const esc = s => app.escapeHtml(s);
  const KEYRE = /^[a-z0-9_-]{1,32}$/;
  const cnt = o => o ? Object.keys(o).length : 0;
  const fmtDate = ts => new Date(ts).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });

  // ======================================================  KONFIGURATION
  const WEEK = 7 * 864e5, MON0 = Date.UTC(1970, 0, 5);                       // 05.01.1970 war ein Montag
  const TOUR_POOL = ['tetris', 'snake', 'flappy', 'neon', 'spaceshooter', 'asteroids', 'pacman', 'breakout', 'catch', 'invaders', 'mole', 'aim'];
  const TOUR_PRIZES = [100, 60, 30];                                         // Plätze 1–3
  const TOUR_PARTICIPATION = 10;
  const CLAN_COST = 150, CLAN_MAX = 20;
  const EVENT_TYPES = {
    double_bonus: { ico: '🎟️', name: 'Doppel-Ticket-Event',  desc: 'Der Abschluss-Bonus nach Spielen zählt doppelt!' },
    double_daily: { ico: '🎁', name: 'Doppelte Tagesbelohnung', desc: 'Die tägliche Belohnung zählt doppelt!' },
    info:         { ico: '📣', name: 'Ankündigung',          desc: '' }
  };

  // ======================================================  PROFILE
  app.syncProfile = function(d){
    const key = this.currentUser;
    if(!key || !db || !d) return;
    if(!d.since && this._sinceSet !== key){ this._sinceSet = key; db.ref('playverseUsers/' + key + '/since').transaction(v => v || app.now()).catch(() => {}); }
    const ach = {}; Object.keys(d.ach || {}).forEach(k => { ach[k] = 1; });
    const p = { name: d.displayName || key, bio: String(d.bio || '').slice(0, 140), since: Number(d.since || 0),
                wins: Number((d.stats && d.stats.wins) || 0), games: cnt(d.stats && d.stats.g), clan: d.clan || '', ach: cnt(ach) ? ach : null };
    const sig = JSON.stringify(p) + key;
    if(this._profSig === sig) return;
    this._profSig = sig;
    db.ref('playverseProfiles/' + key).update(p).catch(e => { this._profSig = null; this.dbErr('Profil', e); });
  };
  app.profBest = function(game, score, user){
    user = user || this.currentUser;
    if(!user || !db) return;
    db.ref('playverseProfiles/' + user + '/best/' + game).set(score).catch(() => {});
  };
  app.showView = function(id){
    this.clrAll();
    this.closeModal();
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
    const v = $(id); if(v) v.classList.add('active');
    window.scrollTo(0, 0);
  };
  app.openProfile = function(key){
    key = String(key || '').toLowerCase();
    if(!KEYRE.test(key) || !db) return;
    this.showView('profile');
    const box = $('profileBox');
    box.innerHTML = '<div class="muted">Lade Profil …</div>';
    db.ref('playverseProfiles/' + key).once('value').then(s => {
      let p = s.val() || {};
      if(key === this.currentUser && this.userData){            // eigenes Profil: immer aktuelle Daten
        const d = this.userData, ach = {}; Object.keys(d.ach || {}).forEach(k => ach[k] = 1);
        p = Object.assign({}, p, { name: d.displayName || key, bio: d.bio || '', since: d.since || p.since, wins: (d.stats && d.stats.wins) || 0,
                                   games: cnt(d.stats && d.stats.g), clan: d.clan || '', ach });
      }
      this.renderProfile(key, p);
    }).catch(e => { box.innerHTML = '<div style="color:var(--red,#ff526f)">Profil konnte nicht geladen werden.</div>'; this.dbErr('Profil', e); });
  };
  app.renderProfile = function(key, p){
    const box = $('profileBox'); if(!box) return;
    const me = key === this.currentUser, z = this.cosmOf(key);
    const ACH = this.ACH || [];
    const got = p.ach || {};
    const online = !!this.onlineUsers[key];
    const best = p.best || {};
    const rows = Object.keys(this.LB_GAMES).filter(g => best[g] !== undefined && this.LB_GAMES[g]).map(g =>
      `<div class="list-item"><span>${this.LB_GAMES[g].ico} ${esc(this.LB_GAMES[g].name)}</span><span class="pill ticket-pill">${esc(this.fmtScore(g, best[g]))}</span></div>`).join('');
    const clanChip = p.clan && /^[A-Z0-9]{2,4}$/.test(p.clan) ? `<span class="chip" style="cursor:pointer" onclick="app.openEvents('clan')">🛡️ [${esc(p.clan)}]</span>` : '';
    box.innerHTML = `
      <div class="prof-head">
        <div class="prof-av">${z.a ? z.a.val : '👤'}</div>
        <div style="flex:1;min-width:0">
          <div class="prof-name">${this.nameHtml(p.name || key, key, { title: true })}</div>
          <div class="muted" style="font-size:12px"><span style="color:${online ? '#b8f36b' : '#7d88b8'}">● ${online ? 'Online' : 'Offline'}</span>${p.since ? ' · Mitglied seit ' + fmtDate(p.since) : ''}</div>
          ${p.bio ? `<div class="prof-bio">${esc(p.bio)}</div>` : (me ? '' : '<div class="muted" style="font-size:12px;margin-top:6px">Keine Beschreibung.</div>')}
        </div>
      </div>
      <div class="chips">
        <span class="chip">⚔️ ${Number(p.wins || 0)} Online-Siege</span>
        <span class="chip">🎮 ${Number(p.games || 0)} Spiele mit Highscore</span>
        <span class="chip">🏅 ${ACH.filter(a => got[a.id]).length}/${ACH.length} Erfolge</span>${clanChip}
      </div>
      ${me ? `<div class="field" style="margin-top:14px"><label>Deine Beschreibung (max. 140 Zeichen)</label>
          <div style="display:flex;gap:8px"><input id="bioInput" maxlength="140" value="${esc(p.bio || '')}" placeholder="Schreib etwas über dich …" style="flex:1;text-align:left">
          <button class="btn primary" onclick="app.saveBio()">Speichern</button></div></div>` : ''}
      ${(!me && this.currentUser) ? `<div style="margin-top:14px"><button class="btn primary" onclick="app.profFriend('${key}')">➕ Freundschaftsanfrage senden</button> <span id="profMsg" class="muted" style="font-size:12px"></span></div>` : ''}
      <h4 class="shop-h">🏅 Erfolge</h4>
      <div class="prof-ach">${ACH.map(a => `<span class="prof-ach-i${got[a.id] ? ' ok' : ''}" title="${esc(a.name)}: ${esc(a.desc)}">${got[a.id] ? a.ico : '🔒'}</span>`).join('')}</div>
      <h4 class="shop-h">🏆 Bestwerte</h4>
      <div class="list-box">${rows || '<div class="muted" style="font-size:13px">Noch keine Highscores gespeichert.</div>'}</div>`;
  };
  app.saveBio = function(){
    const inp = $('bioInput'); if(!inp || !this.currentUser || !db) return;
    db.ref('playverseUsers/' + this.currentUser + '/bio').set(inp.value.trim().slice(0, 140))
      .then(() => this.toast('✓ Beschreibung gespeichert')).catch(e => this.dbErr('Beschreibung', e));
  };
  app.profFriend = function(key){
    if(!this.currentUser || !db || key === this.currentUser) return;
    const m = $('profMsg');
    db.ref('playverseUsers/' + key).once('value').then(s => {
      if(!s.exists()){ if(m) m.textContent = 'Spieler nicht gefunden.'; return; }
      return db.ref('playverseUsers/' + key + '/requests/' + this.currentUser).set(this.userData.displayName || this.currentUser)
        .then(() => { if(m) m.textContent = 'Anfrage gesendet!'; });
    }).catch(e => this.dbErr('Freundschaftsanfrage', e));
  };
  app.openMyProfile = function(){ if(this.currentUser) this.openProfile(this.currentUser); else this.openModal('acc'); };

  // ======================================================  WOCHEN-TURNIER
  function tourWeek(now){
    const idx = Math.floor((now - MON0) / WEEK);
    return { idx, start: MON0 + idx * WEEK, end: MON0 + (idx + 1) * WEEK, game: TOUR_POOL[((idx % TOUR_POOL.length) + TOUR_POOL.length) % TOUR_POOL.length] };
  }
  app.tourWeek = tourWeek;
  app.tourSubmit = function(gameId, score){
    if(!this.currentUser || !db) return;
    const w = tourWeek(this.now());
    if(gameId !== w.game) return;
    const cfg = this.LB_GAMES[gameId]; if(!cfg) return;
    const asc = cfg.dir === 'asc', ck = 'w' + w.idx + '|' + this.currentUser;
    this._tourBest = this._tourBest || {};
    const prev = this._tourBest[ck];
    if(prev !== undefined && (asc ? score >= prev : score <= prev)) return;
    this._tourBest[ck] = score;
    this._tourPend = { idx: w.idx, game: gameId, user: this.currentUser, name: (this.userData && this.userData.displayName) || this.currentUser, score, asc };
    clearTimeout(this._tourTimer);
    this._tourTimer = setTimeout(() => this.tourFlush(), 1500);
  };
  app.tourFlush = function(){
    const p = this._tourPend; this._tourPend = null;
    if(!p || !db) return;
    let improved = false;
    db.ref('playverseTournament/w' + p.idx + '/' + p.user).transaction(cur => {
      improved = false;
      const old = (cur && cur.score !== undefined) ? Number(cur.score) : NaN;
      if(isFinite(old) && (p.asc ? p.score >= old : p.score <= old)) return;
      improved = true;
      return { name: p.name, score: p.score, ts: firebase.database.ServerValue.TIMESTAMP };
    }).then(r => {
      if(r.committed && improved){ this.toast('🏆 Neue Turnier-Bestleistung: ' + this.fmtScore(p.game, p.score)); if(this.statMark) this.statMark('tour', p.user); }
    }).catch(e => { delete this._tourBest['w' + p.idx + '|' + p.user]; this.dbErr('Turnier', e); });
  };
  function readBoard(idx, game){
    const asc = app.LB_GAMES[game].dir === 'asc';
    let q = db.ref('playverseTournament/w' + idx).orderByChild('score');
    q = asc ? q.limitToFirst(50) : q.limitToLast(50);
    return q.once('value').then(s => {
      const rows = [];
      s.forEach(c => { const v = c.val() || {}, sc = Number(v.score); if(isFinite(sc)) rows.push({ key: c.key, name: v.name || c.key, score: sc }); });
      rows.sort((a, b) => asc ? a.score - b.score : b.score - a.score);
      return rows;
    });
  }
  const prizeFor = rank => rank >= 1 && rank <= TOUR_PRIZES.length ? TOUR_PRIZES[rank - 1] : TOUR_PARTICIPATION;
  // Preis der Vorwoche prüfen (einmal pro Anmeldung)
  app.tourPrizeInit = function(){
    if(!this.currentUser || !db || this._tourInitFor === this.currentUser) return;
    this._tourInitFor = this.currentUser;
    const w = tourWeek(this.now()), prev = w.idx - 1, pg = tourWeek(this.now() - WEEK).game, me = this.currentUser;
    if(this.userData && this.userData.tourClaim && this.userData.tourClaim['w' + prev]) { this.tourPrize = null; return this.updateEvDot(); }
    readBoard(prev, pg).then(rows => {
      const i = rows.findIndex(r => r.key === me);
      if(i >= 0) return { rank: i + 1 };
      return db.ref('playverseTournament/w' + prev + '/' + me).once('value').then(s => s.exists() ? { rank: 99 } : null);
    }).then(r => {
      this.tourPrize = r ? { idx: prev, rank: r.rank, prize: prizeFor(r.rank), game: pg } : null;
      this.updateEvDot();
    }).catch(() => {});
  };
  app.claimTourPrize = function(){
    const tp = this.tourPrize; if(!tp || !this.currentUser || !db || this._tourClaiming) return;
    this._tourClaiming = true;
    const self = this, wk = 'w' + tp.idx; let ok = false;
    db.ref('playverseUsers/' + this.currentUser).transaction(cur => {
      ok = false;
      if(cur === null) return cur;
      cur.tourClaim = cur.tourClaim || {};
      if(cur.tourClaim[wk]) return;
      cur.tourClaim[wk] = tp.prize;
      cur.arcadeTickets = Number(cur.arcadeTickets || 0) + tp.prize;
      ok = true; return cur;
    }).then(r => {
      if(r.committed && ok){ self.toast('🎁 Turnier-Preis: +' + tp.prize + ' Tickets!'); self.tourPrize = null; }
    }).catch(e => self.dbErr('Turnier-Preis', e)).then(() => { self._tourClaiming = false; self.updateEvDot(); self.renderTourPane(); });
  };
  app.renderTourPane = function(){
    const box = $('evPane-tour'); if(!box) return;
    const now = this.now(), w = tourWeek(now), cfg = this.LB_GAMES[w.game], asc = cfg.dir === 'asc';
    const left = Math.max(0, w.end - now), dd = Math.floor(left / 864e5), hh = Math.floor(left % 864e5 / 36e5);
    const prevG = tourWeek(now - WEEK).game;
    box.innerHTML = `
      <div class="tour-card">
        <div class="muted" style="font-size:12px;letter-spacing:.08em">WOCHEN-TURNIER · ${fmtDate(w.start)} – ${fmtDate(w.end - 1)}</div>
        <div style="font-size:24px;font-weight:800;margin:6px 0">${cfg.ico} ${esc(cfg.name)}</div>
        <div class="muted" style="font-size:13px">Dein bester Wert der Woche zählt${asc ? ' (weniger ist besser)' : ''}. Endet in <b>${dd} Tg ${hh} Std</b>.</div>
        <div class="chips" style="margin:10px 0"><span class="chip">🥇 ${TOUR_PRIZES[0]} 🎟️</span><span class="chip">🥈 ${TOUR_PRIZES[1]} 🎟️</span><span class="chip">🥉 ${TOUR_PRIZES[2]} 🎟️</span><span class="chip">Teilnahme ${TOUR_PARTICIPATION} 🎟️</span></div>
        <button class="btn primary" onclick="app.startSolo('${w.game}')">▶ Jetzt spielen</button>
      </div>
      <h4 class="shop-h">Rangliste dieser Woche</h4><div id="tourBoard" class="list-box"><div class="muted" style="font-size:13px">Lade …</div></div>
      <div id="tourPrev"></div>`;
    if(!this.currentUser) $('tourBoard').insertAdjacentHTML('beforebegin', '<div class="note" style="margin-bottom:8px">Logge dich ein, um am Turnier teilzunehmen.</div>');
    readBoard(w.idx, w.game).then(rows => {
      const b = $('tourBoard'); if(!b) return;
      const me = rows.findIndex(r => r.key === this.currentUser);
      b.innerHTML = rows.length ? rows.slice(0, 10).map((r, i) => `<div class="list-item" style="${r.key === this.currentUser ? 'background:#1c2948;border-radius:10px' : ''}">
          <div><strong style="display:inline-block;width:36px;color:var(--gold)">${['🥇', '🥈', '🥉'][i] || '#' + (i + 1)}</strong> <b>${this.nameHtml(r.name, r.key, { title: true, link: true })}</b></div>
          <span class="pill ticket-pill">${cfg.ico} ${esc(this.fmtScore(w.game, r.score))}</span></div>`).join('') +
        (me >= 10 ? `<div class="muted" style="font-size:12px;margin-top:8px">Dein Platz: <b>#${me + 1}</b> (${esc(this.fmtScore(w.game, rows[me].score))})</div>` : '')
        : '<div class="muted" style="font-size:13px">Noch keine Ergebnisse – sei der Erste!</div>';
    }).catch(e => { const b = $('tourBoard'); if(b) b.innerHTML = '<div style="color:var(--red,#ff526f)">Rangliste nicht ladbar.</div>'; this.dbErr('Turnier', e); });
    const tp = this.tourPrize, pv = $('tourPrev');
    if(pv) pv.innerHTML = `<h4 class="shop-h">Letzte Woche · ${esc(this.LB_GAMES[prevG].name)}</h4>` + (tp
      ? `<div class="daily-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
           <div>Du warst ${tp.rank === 99 ? 'dabei' : 'auf <b>Platz ' + tp.rank + '</b>'} – dein Preis wartet!</div>
           <button class="btn primary" onclick="app.claimTourPrize()">🎁 Abholen (+${tp.prize} 🎟️)</button></div></div>`
      : '<div class="muted" style="font-size:13px">Kein offener Preis aus der Vorwoche.</div>');
  };

  // ======================================================  EVENTS
  app.eventNow = null;
  app.updateEvDot = function(){
    const dot = $('evDot'); if(!dot) return;
    const on = !!(this.tourPrize) || !!(this.eventNow && Number(this.eventNow.until) > this.now());
    dot.style.display = on ? 'inline-block' : 'none';
  };
  app.renderEventBanner = function(){
    const b = $('eventBanner'), e = this.eventNow;
    const live = e && Number(e.until) > this.now();
    if(b){
      if(!live) b.style.display = 'none';
      else {
        const t = EVENT_TYPES[e.type] || EVENT_TYPES.info, h = Math.max(1, Math.ceil((e.until - this.now()) / 36e5));
        b.style.display = 'flex';
        b.innerHTML = `<span style="font-size:26px">${t.ico}</span><div style="flex:1"><b>${esc(e.title || t.name)}</b><div style="font-size:13px;opacity:.9">${esc(e.text || t.desc)}</div></div><span class="chip">noch ${h} Std</span>`;
      }
    }
    this.updateEvDot();
  };
  app.renderEventPane = function(){
    const box = $('evPane-ev'); if(!box) return;
    const e = this.eventNow, live = e && Number(e.until) > this.now();
    const t = live ? (EVENT_TYPES[e.type] || EVENT_TYPES.info) : null;
    box.innerHTML = (live
      ? `<div class="event-banner" style="display:flex"><span style="font-size:30px">${t.ico}</span><div style="flex:1"><b>${esc(e.title || t.name)}</b>
          <div style="font-size:13px">${esc(e.text || t.desc)}</div><div class="muted" style="font-size:12px;margin-top:4px">Läuft bis ${new Date(e.until).toLocaleString('de-DE')}</div></div></div>`
      : '<div class="muted" style="font-size:14px;padding:6px 0 14px">Aktuell läuft kein Event. Schau bald wieder vorbei – Events bringen doppelte Tickets und mehr!</div>') +
      `<div style="margin-top:14px"><button class="btn" style="font-size:12px" onclick="app.eventsAdminLogin()">👑 Admin</button></div>
       <div id="eventAdminBox" style="display:${this.eventsAdmin ? 'block' : 'none'};margin-top:12px;padding:14px;border:1px dashed #4a5a96;border-radius:12px">
         <h4 style="margin:0 0 8px;font-size:14px;color:var(--cyan)">EVENT STARTEN</h4>
         <div class="field"><label>Art</label><select id="evType">${Object.keys(EVENT_TYPES).map(k => `<option value="${k}">${EVENT_TYPES[k].ico} ${EVENT_TYPES[k].name}</option>`).join('')}</select></div>
         <div class="field"><label>Titel (optional)</label><input id="evTitle" maxlength="60" placeholder="z. B. Wochenend-Spaß"></div>
         <div class="field"><label>Text (optional)</label><input id="evText" maxlength="140" placeholder="Kurze Beschreibung"></div>
         <div class="field"><label>Dauer</label><select id="evHours"><option value="1">1 Stunde</option><option value="6">6 Stunden</option><option value="24" selected>24 Stunden</option><option value="72">3 Tage</option><option value="168">7 Tage</option></select></div>
         <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" onclick="app.startEvent()">🚀 Starten</button><button class="btn" onclick="app.endEvent()">⏹ Event beenden</button></div>
       </div>`;
  };
  app.eventsAdminLogin = function(){
    if(this.eventsAdmin){ this.eventsAdmin = false; return this.renderEventPane(); }
    const pin = prompt('Admin-PIN eingeben:'); if(!pin) return;
    Promise.resolve(this.verifyPinWithServer(pin)).then(ok => {
      if(ok){ this.eventsAdmin = true; this.renderEventPane(); } else this.toast('Falsche PIN.', 'err');
    }).catch(e => this.dbErr('Admin-PIN', e));
  };
  app.startEvent = function(){
    if(!this.eventsAdmin || !db) return;
    const type = $('evType').value, hours = Number($('evHours').value) || 24;
    if(!EVENT_TYPES[type]) return;
    db.ref('playverseEvents/current').set({ type, title: ($('evTitle').value || '').trim().slice(0, 60), text: ($('evText').value || '').trim().slice(0, 140),
                                           until: this.now() + hours * 36e5, ts: firebase.database.ServerValue.TIMESTAMP })
      .then(() => this.toast('🚀 Event gestartet!')).catch(e => this.dbErr('Event', e));
  };
  app.endEvent = function(){
    if(!this.eventsAdmin || !db) return;
    db.ref('playverseEvents/current').remove().then(() => this.toast('Event beendet.')).catch(e => this.dbErr('Event', e));
  };

  // ======================================================  CLANS
  app.renderClanPane = function(){
    const box = $('evPane-clan'); if(!box) return;
    if(!this.currentUser || !this.userData){ box.innerHTML = '<div class="note">Bitte logge dich im Reiter <b>Account</b> ein, um Clans zu nutzen!</div>'; return; }
    const mine = this.userData.clan || '';
    box.innerHTML = '<div class="muted">Lade Clans …</div>';
    const myP = mine ? db.ref('playverseClans/' + mine).once('value') : Promise.resolve(null);
    const listP = db.ref('playverseClans').orderByChild('n').limitToLast(30).once('value');
    Promise.all([myP, listP]).then(([ms, ls]) => {
      const c = ms && ms.val();
      let html = '';
      if(mine && c){
        const members = Object.keys(c.members || {});
        html += `<div class="tour-card"><div class="muted" style="font-size:12px;letter-spacing:.08em">DEIN CLAN</div>
          <div style="font-size:22px;font-weight:800;margin:4px 0"><span class="nm-clan" style="font-size:16px">[${esc(c.tag)}]</span> ${esc(c.name)}</div>
          <div class="muted" style="font-size:13px">${members.length} / ${CLAN_MAX} Mitglieder · Gründer: ${esc((c.members || {})[c.owner] || c.owner)}</div>
          <div style="margin:10px 0">${members.map(k => `<div class="list-item"><span>${this.onlineUsers[k] ? '<span style="color:#b8f36b">●</span>' : '<span style="color:#7d88b8">●</span>'} <b>${this.nameHtml(c.members[k], k, { link: true })}</b>${k === c.owner ? ' 👑' : ''}</span></div>`).join('')}</div>
          <button class="btn" onclick="app.leaveClan()">🚪 Clan verlassen</button></div>`;
      } else if(mine){
        html += `<div class="note">Dein Clan [${esc(mine)}] existiert nicht mehr. <button class="btn" onclick="app.leaveClan()">Zurücksetzen</button></div>`;
      } else {
        html += `<div class="daily-card"><strong style="color:var(--gold,#ffd36b)">🛡️ Eigenen Clan gründen</strong>
          <div class="muted" style="font-size:12px;margin:4px 0 10px">Kostet ${CLAN_COST} 🎟️. Dein Clan-Kürzel erscheint in eckigen Klammern vor deinem Namen – überall.</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><input id="clanTag" maxlength="4" placeholder="Kürzel (2–4)" style="width:110px;text-transform:uppercase">
          <input id="clanName" maxlength="24" placeholder="Clan-Name" style="flex:1;min-width:140px">
          <button class="btn primary" onclick="app.createClan()">Gründen (${CLAN_COST} 🎟️)</button></div><div id="clanMsg" class="muted" style="font-size:12px;margin-top:6px"></div></div>`;
      }
      const rows = []; ls.forEach(x => { const v = x.val(); if(v && v.tag) rows.push(v); });
      rows.sort((a, b) => (b.n || 0) - (a.n || 0));
      html += `<h4 class="shop-h">Alle Clans</h4><div class="list-box">` + (rows.length ? rows.map(v => `<div class="list-item">
          <span><span class="nm-clan">[${esc(v.tag)}]</span> <b>${esc(v.name)}</b> <span class="muted" style="font-size:12px">· ${v.n || 0}/${CLAN_MAX}</span></span>
          ${(!mine && (v.n || 0) < CLAN_MAX) ? `<button class="btn primary" style="font-size:12px;padding:4px 10px" onclick="app.joinClan('${esc(v.tag)}')">Beitreten</button>` : ''}</div>`).join('')
        : '<div class="muted" style="font-size:13px">Noch keine Clans – gründe den ersten!</div>') + '</div>';
      box.innerHTML = html;
    }).catch(e => { box.innerHTML = '<div style="color:var(--red,#ff526f)">Clans nicht ladbar.</div>'; this.dbErr('Clans', e); });
  };
  app.createClan = function(){
    const msg = $('clanMsg'), say = (t, bad) => { if(msg){ msg.textContent = t; msg.style.color = bad ? 'var(--red,#ff526f)' : 'var(--lime)'; } };
    const tag = ($('clanTag').value || '').trim().toUpperCase(), name = ($('clanName').value || '').trim().slice(0, 24);
    if(!/^[A-Z0-9]{2,4}$/.test(tag)) return say('Kürzel: 2–4 Zeichen (A–Z, 0–9).', true);
    if(name.length < 3) return say('Der Clan-Name braucht mindestens 3 Zeichen.', true);
    if(!this.currentUser || !db || this.clanBusy) return;
    this.clanBusy = true;
    const self = this, key = this.currentUser, display = (this.userData && this.userData.displayName) || key;
    let why = '';
    db.ref('playverseUsers/' + key).transaction(cur => {
      why = ''; if(cur === null) return cur;
      if(cur.clan){ why = 'has'; return; }
      const t = Number(cur.arcadeTickets || 0); if(t < CLAN_COST){ why = 'tickets'; return; }
      cur.arcadeTickets = t - CLAN_COST; cur.clan = tag; return cur;
    }).then(r => {
      if(!r.committed || why){ say(why === 'tickets' ? 'Nicht genug Tickets (' + CLAN_COST + ' nötig).' : 'Du bist bereits in einem Clan.', true); return; }
      return db.ref('playverseClans/' + tag).transaction(cur => {
        if(cur !== null) return;                                                      // Kürzel schon vergeben
        return { name, tag, owner: key, n: 1, ts: firebase.database.ServerValue.TIMESTAMP, members: { [key]: display } };
      }).then(cr => {
        if(cr.committed){ say('✓ Clan gegründet!'); self.toast('🛡️ Clan [' + tag + '] gegründet!'); return; }
        return db.ref('playverseUsers/' + key).transaction(cur => {                   // Rückerstattung
          if(cur === null) return cur; cur.arcadeTickets = Number(cur.arcadeTickets || 0) + CLAN_COST; cur.clan = null; return cur;
        }).then(() => say('Dieses Kürzel ist schon vergeben – Tickets zurückerstattet.', true));
      });
    }).catch(e => self.dbErr('Clan gründen', e)).then(() => { self.clanBusy = false; self.renderClanPane(); });
  };
  app.joinClan = function(tag){
    if(!/^[A-Z0-9]{2,4}$/.test(tag) || !this.currentUser || !db || this.clanBusy) return;
    this.clanBusy = true;
    const self = this, key = this.currentUser, display = (this.userData && this.userData.displayName) || key;
    let had = false;
    db.ref('playverseUsers/' + key).transaction(cur => {
      had = false; if(cur === null) return cur;
      if(cur.clan){ had = true; return; }
      cur.clan = tag; return cur;
    }).then(r => {
      if(!r.committed || had){ self.toast('Du bist bereits in einem Clan.', 'err'); return; }
      let ok = false;
      return db.ref('playverseClans/' + tag).transaction(cur => {
        ok = false;
        if(cur === null) return cur;                                                  // Clan existiert nicht (mehr)
        if(Number(cur.n || 0) >= CLAN_MAX) return;
        cur.members = cur.members || {}; cur.members[key] = display; cur.n = cnt(cur.members); ok = true; return cur;
      }).then(cr => {
        if(cr.committed && ok){ self.toast('🛡️ Willkommen im Clan [' + tag + ']!'); return; }
        self.toast('Beitritt nicht möglich (Clan voll oder gelöscht).', 'err');
        return db.ref('playverseUsers/' + key + '/clan').set(null);                   // zurücksetzen
      });
    }).catch(e => self.dbErr('Clan beitreten', e)).then(() => { self.clanBusy = false; self.renderClanPane(); });
  };
  app.leaveClan = function(){
    const tag = this.userData && this.userData.clan;
    if(!tag || !this.currentUser || !db || this.clanBusy) return;
    if(!confirm('Clan wirklich verlassen?')) return;
    this.clanBusy = true;
    const self = this, key = this.currentUser;
    db.ref('playverseUsers/' + key + '/clan').set(null).then(() =>
      db.ref('playverseClans/' + tag).transaction(cur => {
        if(cur === null) return cur;
        cur.members = cur.members || {}; delete cur.members[key];
        const left = Object.keys(cur.members);
        if(!left.length) return null;                                                 // letzter Spieler: Clan wird gelöscht
        cur.n = left.length; if(cur.owner === key) cur.owner = left[0];
        return cur;
      })
    ).then(() => self.toast('Clan verlassen.')).catch(e => self.dbErr('Clan verlassen', e)).then(() => { self.clanBusy = false; self.renderClanPane(); });
  };

  // ======================================================  Seite „Turniere & Events“
  app.openEvents = function(tab){ this.showView('events'); this.evTab(tab || 'tour'); };
  app.evTab = function(tab){
    ['tour', 'ev', 'clan'].forEach(k => {
      const b = $('evTab-' + k), p = $('evPane-' + k);
      if(b) b.classList.toggle('active', k === tab);
      if(p) p.style.display = k === tab ? 'block' : 'none';
    });
    if(tab === 'tour') this.renderTourPane(); else if(tab === 'ev') this.renderEventPane(); else this.renderClanPane();
  };

  // ======================================================  Einhängen & Listener
  const _sync = app.syncPublicProfile;
  app.syncPublicProfile = function(d){ _sync.call(this, d); this.syncProfile(d); this.tourPrizeInit(); };
  const _render = app.renderAccountUI;
  app.renderAccountUI = function(){ _render.call(this); try { this.updateEvDot(); } catch(e) {} };

  function listen(){
    if(typeof db === 'undefined' || !db) return;
    db.ref('playverseEvents/current').on('value', s => { app.eventNow = s.val() || null; app.renderEventBanner(); },
      err => console.warn('[PLAYVERSE] Event-Listener:', err));
    setInterval(() => app.renderEventBanner(), 60000);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', listen); else listen();
})();
