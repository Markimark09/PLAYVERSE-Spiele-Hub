/* PLAYVERSE – Paket 4: Fortschritt – XP & Level, tägliche Quests, Saison-Pass
   Datenmodell (pro Konto unter playverseUsers/<name>):
     xp, lvl                          Erfahrung und Level
     quests {day, p{id:n}, d{id:1}, g{spiel:1}}   Fortschritt der heutigen Quests
     season {id, xp, claimed{free3:1, vip10:1}}   aktueller Saison-Pass (Monat)
     stats.quests                     Anzahl geschaffter Quests
   Alle Änderungen laufen als Transaktion, Belohnungen werden atomar mit gutgeschrieben. */
(function(){
  const app = window.app;
  if(!app) return;
  const $ = id => document.getElementById(id);
  const esc = s => app.escapeHtml(s);
  const dayStr = ts => new Date(ts).toISOString().slice(0, 10);

  // ======================================================  KONFIGURATION (alles hier anpassbar)
  const MAX_LEVEL = 100;
  const needFor = lvl => 100 + 25 * (lvl - 1);                      // XP von Level n auf n+1
  const lvlReward = l => l % 10 === 0 ? 50 : l % 5 === 0 ? 25 : 5; // Tickets pro erreichtem Level
  const TIERS = 20, TIER_XP = 100;                                  // Saison-Pass: 20 Stufen à 100 Saison-XP
  const ROUND_GAP_MS = 25000;                                       // „Runde“ zählt pro Spiel höchstens alle 25 s
  const FREE_TK = n => 8 + (n % 5 === 0 ? 22 : 0);
  const VIP_TK  = n => 12 + (n % 5 === 0 ? 38 : 0);
  const FREE_ITEM = { 20: 't_season' };                             // exklusive Titel/Avatare aus dem Pass
  const VIP_ITEM  = { 10: 'a_season', 20: 't_vipstar' };
  const SCORE_Q = {                                                 // [normal, schwer] pro Spiel
    tetris:[600,1500], snake:[8,18], flappy:[5,12], catch:[8,18], g2048:[1000,3000], breakout:[250,500], asteroids:[1000,2500],
    neon:[300,800], spaceshooter:[300,800], pacman:[600,1500], aim:[12,22], mole:[8,15], invaders:[150,300], highway:[300,700]
  };

  // ======================================================  Level
  const CUM = [0];                                                  // CUM[n-1] = XP, ab der Level n erreicht ist
  for(let l = 1; l < MAX_LEVEL; l++) CUM.push(CUM[l - 1] + needFor(l));
  function levelOf(xp){
    xp = Math.max(0, Number(xp) || 0);
    let lo = 0, hi = MAX_LEVEL - 1;
    while(lo < hi){ const mid = (lo + hi + 1) >> 1; if(CUM[mid] <= xp) lo = mid; else hi = mid - 1; }
    const level = lo + 1, base = CUM[lo], next = level >= MAX_LEVEL ? null : CUM[lo + 1];
    return { level, base, next, into: xp - base, span: next === null ? 1 : next - base };
  }
  const seasonId = ts => new Date(ts).toISOString().slice(0, 7);
  const seasonEnd = ts => { const d = new Date(ts); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); };
  function seasonOf(cur, now){
    const sid = seasonId(now);
    if(!cur.season || cur.season.id !== sid) cur.season = { id: sid, xp: 0, claimed: {} };
    cur.season.claimed = cur.season.claimed || {};
    return cur.season;
  }
  // XP gutschreiben (innerhalb einer Transaktion auf dem Konto-Objekt `cur`)
  function xpApply(cur, amount){
    amount = Math.round(Number(amount));
    if(!(amount > 0)) return;
    amount = Math.max(1, Math.round(amount * (1 + 0.05 * Math.min(Number(cur.prestige || 0), 10))));   // Prestige: +5 % XP je Stufe (max. +50 %)
    const old = levelOf(cur.xp || 0).level;
    cur.xp = Number(cur.xp || 0) + amount;
    const nw = levelOf(cur.xp).level;
    cur.lvl = nw;
    for(let l = old + 1; l <= nw; l++) cur.arcadeTickets = Number(cur.arcadeTickets || 0) + lvlReward(l);
    seasonOf(cur, app.now()).xp = Number(cur.season.xp || 0) + amount;
  }
  app.xpApply = xpApply; app.levelOf = levelOf;
  app.addXp = function(amount, why, user){
    user = user || this.currentUser;
    if(!user || !db) return;
    db.ref('playverseUsers/' + user).transaction(cur => { if(cur === null) return cur; xpApply(cur, amount); return cur; })
        .catch(e => this.dbErr('XP', e));
  };

  // ======================================================  Quests
  function hashStr(s){ let h = 2166136261; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const Q_BASE = {
    rounds5: { id:'q_rounds5', type:'rounds', target:5, xp:30, tk:6,  name:'Spiele 5 Runden' },
    chat3:   { id:'q_chat3',   type:'chat',   target:3, xp:20, tk:4,  name:'Schreibe 3 Chat-Nachrichten' },
    games3:  { id:'q_games3',  type:'games',  target:3, xp:40, tk:8,  name:'Spiele 3 verschiedene Spiele' },
    bonus3:  { id:'q_bonus3',  type:'bonus',  target:3, xp:40, tk:8,  name:'Hole 3 Abschluss-Boni ab' },
    win1:    { id:'q_win1',    type:'win',    target:1, xp:60, tk:12, name:'Gewinne 1 Online-Match' },
    games5:  { id:'q_games5',  type:'games',  target:5, xp:70, tk:15, name:'Spiele 5 verschiedene Spiele' }
  };
  function scoreQuest(game, hard){
    const t = SCORE_Q[game][hard ? 1 : 0], cfg = app.LB_GAMES[game];
    return { id: 'q_score_' + game, type: 'score', game, target: t, xp: hard ? 80 : 50, tk: hard ? 16 : 10, name: `Erreiche ${t} Punkte in ${cfg.name}` };
  }
  // 3 Quests pro Tag und Spieler (leicht, mittel, schwer) – deterministisch aus Name + Datum
  function questsFor(key, day){
    const r = rng(hashStr(key + '|' + day)), pick = a => a[Math.floor(r() * a.length)], games = Object.keys(SCORE_Q).filter(g => app.LB_GAMES[g]);
    const easy = pick([Q_BASE.rounds5, Q_BASE.chat3]);
    let med = pick(['games3', 'bonus3', 'score']);
    const medQ = med === 'score' ? scoreQuest(pick(games), false) : Q_BASE[med];
    let hardKey = pick(['win1', 'games5', 'score']);
    if(hardKey === 'games5' && med === 'games3') hardKey = 'win1';
    let hardQ;
    if(hardKey === 'score'){ let g = pick(games); if(medQ.type === 'score' && medQ.game === g) g = games[(games.indexOf(g) + 1) % games.length]; hardQ = scoreQuest(g, true); }
    else hardQ = Q_BASE[hardKey];
    return [easy, medQ, hardQ];
  }
  app.questsFor = questsFor;
  // Eine Aktion auf das Konto anwenden. Gibt zurück, was sich geändert hat.
  function applyQuest(cur, key, type, data, now){
    const today = dayStr(now);
    let q = cur.quests;
    if(!q || q.day !== today) q = cur.quests = { day: today, p: {}, d: {}, g: {} };
    q.p = q.p || {}; q.d = q.d || {}; q.g = q.g || {};
    let changed = false; const done = [];
    if(type === 'game' && data.game && !q.g[data.game]){ q.g[data.game] = 1; changed = true; }
    questsFor(key, today).forEach(Q => {
      if(q.d[Q.id]) return;
      const v = Number(q.p[Q.id] || 0); let nv = v;
      if(Q.type === 'games' && type === 'game') nv = Object.keys(q.g).length;
      else if(Q.type === 'rounds' && type === 'game' && data.roundOk) nv = v + 1;
      else if(Q.type === 'score' && type === 'score' && data.game === Q.game && Number(data.score) >= Q.target) nv = Q.target;
      else if(Q.type === type && (type === 'bonus' || type === 'win' || type === 'chat')) nv = v + 1;
      if(nv === v) return;
      q.p[Q.id] = Math.min(nv, Q.target); changed = true;
      if(nv >= Q.target){
        q.d[Q.id] = 1; done.push(Q);
        cur.arcadeTickets = Number(cur.arcadeTickets || 0) + Q.tk;
        cur.stats = cur.stats || {}; cur.stats.quests = Number(cur.stats.quests || 0) + 1;
        xpApply(cur, Q.xp);
      }
    });
    return { changed, done };
  }
  app._lastRound = {};
  app.questEvent = function(type, data){
    const d = this.userData, key = this.currentUser;
    if(!d || !key || !db) return;
    data = Object.assign({}, data);
    if(type === 'game'){
      const t = Date.now();
      data.roundOk = !(this._lastRound[data.game] && t - this._lastRound[data.game] < ROUND_GAP_MS);
    }
    const probe = JSON.parse(JSON.stringify(d));
    if(!applyQuest(probe, key, type, data, this.now()).changed) return;       // nichts Relevantes -> keine Datenbank-Aktion
    if(type === 'game' && data.roundOk) this._lastRound[data.game] = Date.now();
    let res = { done: [] };
    db.ref('playverseUsers/' + key).transaction(cur => {
      if(cur === null) return cur;
      res = applyQuest(cur, key, type, data, this.now());
      return res.changed ? cur : undefined;
    }).then(r => {
      if(r.committed) res.done.forEach(Q => this.toast(`✅ Quest geschafft: ${Q.name}  (+${Q.tk} 🎟️, +${Q.xp} XP)`));
    }).catch(e => this.dbErr('Quest', e));
  };

  // ======================================================  Saison-Pass
  const tierReward = (n, track) => ({ tk: track === 'vip' ? VIP_TK(n) : FREE_TK(n), item: (track === 'vip' ? VIP_ITEM : FREE_ITEM)[n] || '' });
  app.claimTier = function(n, track){
    n = Number(n);
    if(!(n >= 1 && n <= TIERS) || (track !== 'free' && track !== 'vip') || !this.currentUser || !db || this.tierBusy) return;
    this.tierBusy = true;
    const self = this, key = this.currentUser, id = track + n, rw = tierReward(n, track); let why = '';
    db.ref('playverseUsers/' + key).transaction(cur => {
      why = '';
      if(cur === null) return cur;
      const s = seasonOf(cur, self.now());
      if(Number(s.xp || 0) < n * TIER_XP){ why = 'xp'; return; }
      if(s.claimed[id]){ why = 'done'; return; }
      if(track === 'vip' && !(Number(cur.vipUntil || 0) > self.now())){ why = 'vip'; return; }
      s.claimed[id] = 1;
      cur.arcadeTickets = Number(cur.arcadeTickets || 0) + rw.tk;
      if(rw.item){ cur.owned = cur.owned || {}; cur.owned[rw.item] = true; }
      return cur;
    }).then(r => {
      if(r.committed && !why) self.toast(`🎁 Saison-Pass Stufe ${n}: +${rw.tk} 🎟️` + (rw.item ? ' + exklusiver Gegenstand!' : ''));
      else if(why === 'vip') self.toast('Die VIP-Belohnung gibt es nur mit aktivem VIP-Rang.', 'err');
      else if(why === 'xp') self.toast('Dafür fehlt noch Saison-XP.', 'err');
    }).catch(e => self.dbErr('Saison-Pass', e)).then(() => { self.tierBusy = false; self.renderProgress(); });
  };

  // ======================================================  Oberfläche (Reiter „Fortschritt“)
  app.renderProgress = function(){
    const need = $('progNeedAuth'), cont = $('progContent');
    const logged = !!this.currentUser && !!this.userData;
    if(need) need.style.display = logged ? 'none' : 'block';
    if(cont) cont.style.display = logged ? 'block' : 'none';
    if(!logged) return;
    const d = this.userData, now = this.now(), L = levelOf(d.xp || 0);
    // Level
    const nextTk = L.level >= MAX_LEVEL ? null : lvlReward(L.level + 1);
    $('progLevel').innerHTML = `<div class="prog-lvl"><div class="prog-lvl-n">${L.level}</div><div style="flex:1">
      <div style="font-weight:800;font-size:16px">Level ${L.level}${L.level >= MAX_LEVEL ? ' · MAX' : ''}</div>
      <div class="ach-bar" style="margin:6px 0 4px"><i style="width:${L.next === null ? 100 : Math.round(L.into / L.span * 100)}%"></i></div>
      <div class="muted" style="font-size:12px">${L.next === null ? 'Höchstes Level erreicht!' : `${L.into} / ${L.span} XP bis Level ${L.level + 1} (+${nextTk} 🎟️)`} · Gesamt ${Number(d.xp || 0)} XP</div></div></div>
      <div class="muted" style="font-size:11px;margin:6px 0 0">XP gibt es für Bestwerte (+15), Abschluss-Boni (+10), Online-Siege (+30), Tagesbelohnung (+10), Erfolge (+25) und Quests.</div>`;
    // Quests
    const today = dayStr(now), q = (d.quests && d.quests.day === today) ? d.quests : { p: {}, d: {} };
    const nextDay = (new Date(today + 'T00:00:00Z').getTime() + 864e5) - now, hh = Math.floor(nextDay / 36e5);
    $('progQuests').innerHTML = `<div class="muted" style="font-size:12px;margin-bottom:8px">Neue Quests in ca. ${hh} Std. (00:00 UTC)</div>` +
        questsFor(this.currentUser, today).map(Q => {
          const v = Math.min(Number((q.p || {})[Q.id] || 0), Q.target), ok = !!(q.d || {})[Q.id];
          return `<div class="ach-item${ok ? ' ok' : ''}" style="opacity:1"><div class="ach-ico">${ok ? '✅' : '🎯'}</div><div style="flex:1">
          <b>${esc(Q.name)}</b><div class="ach-bar" style="margin:6px 0 2px;height:6px"><i style="width:${Math.round(v / Q.target * 100)}%"></i></div>
          <div class="muted" style="font-size:12px">${v} / ${Q.target} · ${ok ? 'geschafft' : `Belohnung: +${Q.tk} 🎟️ +${Q.xp} XP`}</div></div></div>`;
        }).join('');
    // Saison-Pass
    const s = (d.season && d.season.id === seasonId(now)) ? d.season : { xp: 0, claimed: {} }, sxp = Number(s.xp || 0), claimed = s.claimed || {};
    const tierNow = Math.min(TIERS, Math.floor(sxp / TIER_XP)), left = Math.max(1, Math.ceil((seasonEnd(now) - now) / 864e5));
    const vip = this.isVipKey(this.currentUser);
    const cell = (n, track) => {
      const rw = tierReward(n, track), id = track + n, got = !!claimed[id], can = sxp >= n * TIER_XP && !got && (track === 'free' || vip);
      const lbl = `🎟️ ${rw.tk}${rw.item ? ' +🎁' : ''}`;
      return `<div class="sp-cell ${track}${got ? ' got' : ''}${can ? ' can' : ''}">${can ? `<button class="btn primary" style="font-size:11px;padding:3px 7px" onclick="app.claimTier(${n},'${track}')">${lbl}</button>` : `<span>${got ? '✓' : lbl}</span>`}</div>`;
    };
    let grid = '';
    for(let n = 1; n <= TIERS; n++) grid += `<div class="sp-col${sxp >= n * TIER_XP ? ' reached' : ''}"><div class="sp-n">${n}</div>${cell(n, 'free')}${cell(n, 'vip')}</div>`;
    $('progSeason').innerHTML = `<div class="muted" style="font-size:13px;margin-bottom:6px">Saison <b>${esc(seasonId(now))}</b> · endet in <b>${left}</b> Tag${left === 1 ? '' : 'en'} · Stufe <b>${tierNow}</b> / ${TIERS} · ${sxp} Saison-XP</div>
      <div class="ach-bar"><i style="width:${Math.round(Math.min(sxp, TIERS * TIER_XP) / (TIERS * TIER_XP) * 100)}%"></i></div>
      <div class="sp-wrap"><div class="sp-lbl"><div></div><div>Gratis</div><div>★ VIP${vip ? '' : ' 🔒'}</div></div><div class="sp-scroll">${grid}</div></div>
      <div class="muted" style="font-size:11px;margin-top:6px">Jede Stufe braucht ${TIER_XP} Saison-XP. Die VIP-Reihe gibt mehr Tickets und exklusive Gegenstände (nur mit aktivem VIP). Nicht abgeholte Belohnungen verfallen zum Saisonwechsel.</div>`;
  };

  // ======================================================  Einhängen
  const _sync = app.syncPublicProfile;
  app.syncPublicProfile = function(d){
    _sync.call(this, d);
    try {
      const key = this.currentUser, lv = Number(d.lvl || 1);
      this._lvlSeen = this._lvlSeen || {};
      if(this._lvlSeen[key] !== undefined && lv > this._lvlSeen[key]) this.toast(`🎉 Level ${lv} erreicht!  (+${lvlReward(lv)} 🎟️)`);
      this._lvlSeen[key] = lv;
    } catch(e) {}
  };
  const _render = app.renderAccountUI;
  app.renderAccountUI = function(){
    _render.call(this);
    try {
      const b = $('myProfBtn');
      if(b) b.innerHTML = (this.currentUser && this.userData) ? `🙂 Lv ${levelOf(this.userData.xp || 0).level}` : '🙂 Profil';
      this.renderProgress();
    } catch(e) { console.error('[PLAYVERSE] Fortschritt-UI:', e); }
  };
  const _sub = app.openSubTab;
  app.openSubTab = function(tab){ _sub.call(this, tab); if(tab === 'prog') this.renderProgress(); };
})();