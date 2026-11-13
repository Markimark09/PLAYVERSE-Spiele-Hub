/* PLAYVERSE – Paket 2: Ticket-Shop, tägliche Belohnung mit Serie, Erfolge
   Datenmodell (Firebase, pro Konto unter playverseUsers/<name>):
     owned {itemId:true}, equip {c,t,a} (Farbe/Titel/Avatar), boostUntil, dailyDay, dailyStreak, dailyBest,
     claimTotal, ach {id:ts}, stats {g:{spiel:true}, wins, chat}
   Öffentlicher Spiegel (nur IDs, kein Passwort): playverseCosmetics/<name> = {c,t,a} */
(function(){
  const app = window.app;
  if(!app) return;
  const $ = id => document.getElementById(id);
  const esc = s => app.escapeHtml(s);

  // ======================================================  KONFIGURATION (Preise hier anpassbar)
  const SHOP = [
    { id:'c_red',    slot:'c', name:'Neon-Rot',     val:'#ff5d73', price:40 },
    { id:'c_orange', slot:'c', name:'Sonnenorange', val:'#ffb347', price:40 },
    { id:'c_lime',   slot:'c', name:'Limette',      val:'#b8f36b', price:40 },
    { id:'c_cyan',   slot:'c', name:'Eisblau',      val:'#66e3ff', price:40 },
    { id:'c_violet', slot:'c', name:'Violett',      val:'#c9a0ff', price:40 },
    { id:'c_pink',   slot:'c', name:'Pink',         val:'#ff6fa5', price:40 },
    { id:'c_gold',   slot:'c', name:'Gold',         val:'#ffd36b', price:80 },
    { id:'c_rainbow',slot:'c', name:'Regenbogen',   val:'rainbow', price:200 },
    { id:'t_pro',    slot:'t', name:'Arcade-Profi',    price:30 },
    { id:'t_hunter', slot:'t', name:'Highscore-Jäger', price:50 },
    { id:'t_snake',  slot:'t', name:'Snake-Meister',   price:50 },
    { id:'t_owl',    slot:'t', name:'Nachteule',       price:40 },
    { id:'t_legend', slot:'t', name:'Pixel-Legende',   price:120 },
    { id:'t_tycoon', slot:'t', name:'Ticket-Tycoon',   price:250 },
    { id:'a_fox',    slot:'a', name:'Fuchs',    val:'🦊', price:20 },
    { id:'a_cat',    slot:'a', name:'Katze',    val:'🐱', price:20 },
    { id:'a_panda',  slot:'a', name:'Panda',    val:'🐼', price:20 },
    { id:'a_robot',  slot:'a', name:'Roboter',  val:'🤖', price:30 },
    { id:'a_alien',  slot:'a', name:'Alien',    val:'👾', price:30 },
    { id:'a_dragon', slot:'a', name:'Drache',   val:'🐲', price:40 },
    { id:'a_unicorn',slot:'a', name:'Einhorn',  val:'🦄', price:40 },
    { id:'a_fire',   slot:'a', name:'Feuer',    val:'🔥', price:50 },
    { id:'a_crown',  slot:'a', name:'Krone',    val:'👑', price:150 },
    { id:'boost24',  slot:'boost', name:'Doppel-Bonus (24 Std.)', val:'⚡', price:60,
      desc:'Der Abschluss-Bonus nach Spielen zählt 24 Stunden lang doppelt.' }
  ];
  const DAILY = [5, 8, 10, 12, 15, 20, 30];        // Belohnung pro Serien-Tag (nach Tag 7 wieder von vorn)
  const DAILY_VIP_FACTOR = 1.5;                    // VIP bekommt +50 %
  const BOOST_MS = 24 * 3600 * 1000;
  const cnt = o => o ? Object.keys(o).length : 0;
  const BY_ID = {}; SHOP.forEach(i => BY_ID[i.id] = i);
  const SLOT_TITLE = { c:'🎨 Namensfarben', t:'🏷️ Titel', a:'🙂 Avatare', boost:'⚡ Boosts' };

  const ACH = [
    { id:'first_game', ico:'🎮', name:'Erste Runde',     desc:'Speichere deinen ersten Highscore',            reward:10, test:d => cnt(d.stats && d.stats.g) >= 1 },
    { id:'five_games', ico:'🕹️', name:'Allrounder',      desc:'Highscores in 5 verschiedenen Spielen',        reward:25, test:d => cnt(d.stats && d.stats.g) >= 5 },
    { id:'ten_games',  ico:'🏟️', name:'Arcade-Held',     desc:'Highscores in 10 verschiedenen Spielen',       reward:50, test:d => cnt(d.stats && d.stats.g) >= 10 },
    { id:'daily_3',    ico:'📆', name:'Stammgast',       desc:'3 Tage in Folge die Tagesbelohnung abholen',   reward:15, test:d => Number(d.dailyBest || 0) >= 3 },
    { id:'daily_7',    ico:'🔥', name:'Wochenserie',     desc:'7 Tage in Folge die Tagesbelohnung abholen',   reward:40, test:d => Number(d.dailyBest || 0) >= 7 },
    { id:'vip',        ico:'★',  name:'VIP-Mitglied',    desc:'Kaufe den VIP-Rang',                           reward:30, test:d => Number(d.vipUntil || 0) > 0 },
    { id:'first_buy',  ico:'🛍️', name:'Erster Einkauf',  desc:'Kaufe etwas im Shop',                          reward:10, test:d => cnt(d.owned) >= 1 },
    { id:'collector',  ico:'🧺', name:'Sammler',         desc:'Besitze 5 Shop-Gegenstände',                   reward:40, test:d => cnt(d.owned) >= 5 },
    { id:'styled',     ico:'💅', name:'Gestylt',         desc:'Lege Farbe, Titel und Avatar gleichzeitig an', reward:15, test:d => !!(d.equip && d.equip.c && d.equip.t && d.equip.a) },
    { id:'rich',       ico:'💰', name:'Ticket-Tycoon',   desc:'Besitze 500 Tickets gleichzeitig',             reward:50, test:d => Number(d.arcadeTickets || 0) >= 500 },
    { id:'win_1',      ico:'⚔️', name:'Erster Sieg',     desc:'Gewinne ein Online-Match',                     reward:20, test:d => Number(d.stats && d.stats.wins || 0) >= 1 },
    { id:'win_10',     ico:'🏆', name:'Online-Champion', desc:'Gewinne 10 Online-Matches',                    reward:60, test:d => Number(d.stats && d.stats.wins || 0) >= 10 },
    { id:'chatter',    ico:'💬', name:'Plaudertasche',   desc:'Schreibe 10 Chat-Nachrichten',                 reward:10, test:d => Number(d.stats && d.stats.chat || 0) >= 10 },
    { id:'bonus_25',   ico:'🎟️', name:'Bonus-Sammler',   desc:'Hole 25 Abschluss-Boni ab',                    reward:30, test:d => Number(d.claimTotal || 0) >= 25 }
  ];
  app.SHOP = SHOP; app.ACH = ACH; app.DAILY = DAILY;
  app.cosmMap = {};

  // ======================================================  Kosmetik anzeigen (überall via app.nameHtml)
  function userCosm(d){
    const o = d.owned || {}, e = d.equip || {}, r = { c:'', t:'', a:'' };
    ['c', 't', 'a'].forEach(s => { if(e[s] && o[e[s]] && BY_ID[e[s]] && BY_ID[e[s]].slot === s) r[s] = e[s]; });
    return r;
  }
  app.cosmOf = function(key){
    const raw = (key && key === this.currentUser && this.userData) ? userCosm(this.userData) : ((key && this.cosmMap && this.cosmMap[key]) || {});
    const pick = (id, slot) => (typeof id === 'string' && BY_ID[id] && BY_ID[id].slot === slot) ? BY_ID[id] : null;
    return { c: pick(raw.c, 'c'), t: pick(raw.t, 't'), a: pick(raw.a, 'a') };   // unbekannte/manipulierte IDs werden ignoriert
  };
  app.nameHtml = function(name, key, opts){
    const z = this.cosmOf(key);
    let nm = esc(name);
    if(z.c) nm = z.c.val === 'rainbow' ? `<span class="nm-rainbow">${nm}</span>` : `<span style="color:${z.c.val}">${nm}</span>`;
    return (z.a ? z.a.val + ' ' : '') + nm + (this.isVipKey(key) ? ' ' + this.vipBadgeHtml() : '') +
           ((opts && opts.title && z.t) ? ` <span class="nm-title">${esc(z.t.name)}</span>` : '');
  };
  app.syncCosmetics = function(d){
    const key = this.currentUser;
    if(!key || !db || !d) return;
    const c = userCosm(d), sig = key + '|' + c.c + '|' + c.t + '|' + c.a;
    if(this._cosSig === sig) return;
    this._cosSig = sig;
    const ref = db.ref('playverseCosmetics/' + key);
    if(!(c.c || c.t || c.a)){ if(this.cosmMap && this.cosmMap[key]) ref.remove().catch(e => this.dbErr('Kosmetik', e)); return; }
    ref.set({ c: c.c, t: c.t, a: c.a }).catch(e => { this._cosSig = null; this.dbErr('Kosmetik', e); });
  };

  // ======================================================  Tägliche Belohnung
  const dayStr = ts => new Date(ts).toISOString().slice(0, 10);
  app.dailyInfo = function(){
    const d = this.userData || {}, now = this.now(), today = dayStr(now), yest = dayStr(now - 864e5);
    const claimable = d.dailyDay !== today;
    const streakNow = Number(d.dailyStreak || 0);
    const next = claimable ? ((d.dailyDay === yest) ? streakNow + 1 : 1) : streakNow;
    const base = DAILY[(Math.max(next, 1) - 1) % DAILY.length];
    const vip = this.isVipKey(this.currentUser);
    return { claimable, next, base, reward: Math.round(base * (vip ? DAILY_VIP_FACTOR : 1)), vip, streak: streakNow };
  };
  app.claimDaily = function(){
    if(!this.currentUser || !db || !this.userData || this.dailyBusy) return;
    if(!this.dailyInfo().claimable) return;
    this.dailyBusy = true;
    const self = this, key = this.currentUser, res = { ok: false, reward: 0, streak: 0 };
    db.ref('playverseUsers/' + key).transaction(cur => {
      res.ok = false;
      if(cur === null) return cur;
      const now = self.now(), today = dayStr(now), yest = dayStr(now - 864e5);
      if(cur.dailyDay === today) return;                                   // heute schon abgeholt
      const streak = cur.dailyDay === yest ? Number(cur.dailyStreak || 0) + 1 : 1;
      const vip = Number(cur.vipUntil || 0) > now;
      const reward = Math.round(DAILY[(streak - 1) % DAILY.length] * (vip ? DAILY_VIP_FACTOR : 1));
      cur.arcadeTickets = Number(cur.arcadeTickets || 0) + reward;
      cur.dailyDay = today; cur.dailyStreak = streak; cur.dailyBest = Math.max(Number(cur.dailyBest || 0), streak);
      res.ok = true; res.reward = reward; res.streak = streak;
      return cur;
    }).then(r => {
      if(r.committed && res.ok) self.toast(`🎁 Tagesbelohnung: +${res.reward} Tickets · Serie: ${res.streak} Tag${res.streak === 1 ? '' : 'e'}`);
      else self.toast('Heute schon abgeholt – komm morgen wieder!');
    }).catch(e => self.dbErr('Tagesbelohnung', e)).then(() => { self.dailyBusy = false; self.renderShop(); self.updateDailyDot(); });
  };
  app.updateDailyDot = function(){
    const dot = $('dailyDot'); if(!dot) return;
    dot.style.display = (this.currentUser && this.userData && this.dailyInfo().claimable) ? 'inline-block' : 'none';
  };
  function renderDaily(){
    const box = $('dailyBox'); if(!box) return;
    const i = app.dailyInfo();
    const cur = (Math.max(i.next, 1) - 1) % DAILY.length;
    const days = DAILY.map((r, k) => {
      const done = i.claimable ? k < cur && i.next > 1 : k <= cur;
      const now = i.claimable && k === cur;
      return `<div class="daily-day${done ? ' done' : ''}${now ? ' now' : ''}"><div class="dd-n">Tag ${k + 1}</div><div class="dd-r">${done ? '✓' : '🎟️ ' + r}</div></div>`;
    }).join('');
    box.innerHTML = `<div class="daily-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">
        <div><strong style="color:var(--gold,#ffd36b)">🎁 Tägliche Belohnung</strong>
          <div class="muted" style="font-size:12px">Serie: <b>${i.streak}</b> Tag${i.streak === 1 ? '' : 'e'} in Folge${i.vip ? ' · <span style="color:#ffd36b">★ VIP +50 %</span>' : ''}</div></div>
        <button class="btn primary" ${i.claimable ? '' : 'disabled'} onclick="app.claimDaily()">${i.claimable ? `🎁 Abholen (+${i.reward} 🎟️)` : '✓ Heute abgeholt'}</button>
      </div><div class="daily-strip">${days}</div>
      <div class="muted" style="font-size:11px;margin-top:8px">Verpasst du einen Tag, startet die Serie wieder bei Tag 1. Neue Belohnung jeden Tag ab 00:00 Uhr (UTC).</div></div>`;
  }

  // ======================================================  Shop
  function renderShop(){
    const need = $('shopNeedAuth'), cont = $('shopContent');
    const logged = !!app.currentUser && !!app.userData;
    if(need) need.style.display = logged ? 'none' : 'block';
    if(cont) cont.style.display = logged ? 'block' : 'none';
    if(!logged) return;
    const d = app.userData, tickets = Number(d.arcadeTickets || 0), owned = d.owned || {}, eq = d.equip || {};
    renderDaily();
    const bu = Number(d.boostUntil || 0), bi = $('boostInfo');
    if(bi) bi.innerHTML = bu > app.now()
      ? `⚡ <b>Doppel-Bonus aktiv</b> – noch ${Math.max(1, Math.ceil((bu - app.now()) / 3600000))} Std.`
      : `Du hast <b>${tickets} 🎟️</b>. Gekaufte Farben, Titel und Avatare siehst du überall: im Header, Chat, in der Freundesliste und in den Bestenlisten.`;
    const grid = $('shopGrid'); if(!grid) return;
    grid.innerHTML = ['c', 't', 'a', 'boost'].map(slot => {
      const items = SHOP.filter(x => x.slot === slot).map(it => {
        const has = !!owned[it.id], on = eq[slot] === it.id;
        let prev = slot === 'c' ? (it.val === 'rainbow' ? '<span class="nm-rainbow">Beispiel</span>' : `<span style="color:${it.val}">Beispiel</span>`)
                 : slot === 't' ? `<span class="nm-title">${esc(it.name)}</span>` : `<span style="font-size:24px">${it.val}</span>`;
        const label = slot === 'boost' ? `Kaufen · ${it.price} 🎟️` : has ? (on ? '✓ Angelegt – ablegen' : 'Anlegen') : `Kaufen · ${it.price} 🎟️`;
        const buy = slot === 'boost' || !has;
        return `<div class="shop-item${on ? ' on' : ''}">
          <div class="si-prev">${prev}</div><div class="si-name">${esc(slot === 'c' ? it.name : slot === 't' ? '' : it.name)}</div>
          ${it.desc ? `<div class="muted" style="font-size:11px">${esc(it.desc)}</div>` : ''}
          <button class="btn ${buy ? 'primary' : ''}" style="font-size:12px;padding:5px 9px" ${buy && tickets < it.price ? 'disabled' : ''} onclick="app.shopAct('${it.id}')">${label}</button></div>`;
      }).join('');
      return `<h4 class="shop-h">${SLOT_TITLE[slot]}</h4><div class="shop-grid">${items}</div>`;
    }).join('');
  }
  app.renderShop = renderShop;
  app.shopAct = function(id){
    const it = BY_ID[id], d = this.userData;
    if(!it || !d || !this.currentUser) return;
    if(it.slot === 'boost' || !(d.owned && d.owned[id])) return this.buyItem(id);
    const on = d.equip && d.equip[it.slot] === id;
    db.ref('playverseUsers/' + this.currentUser + '/equip/' + it.slot).set(on ? null : id).catch(e => this.dbErr('Anlegen', e));
  };
  app.buyItem = function(id){
    const it = BY_ID[id];
    if(!it || !db || !this.currentUser || this.shopBusy) return;
    this.shopBusy = true;
    const self = this; let why = '';
    db.ref('playverseUsers/' + this.currentUser).transaction(cur => {
      why = '';
      if(cur === null) return cur;
      if(it.slot !== 'boost' && cur.owned && cur.owned[id]){ why = 'owned'; return; }
      const t = Number(cur.arcadeTickets || 0);
      if(t < it.price){ why = 'tickets'; return; }
      cur.arcadeTickets = t - it.price;
      if(it.slot === 'boost') cur.boostUntil = Math.max(Number(cur.boostUntil || 0), self.now()) + BOOST_MS;
      else {
        cur.owned = cur.owned || {}; cur.owned[id] = true;
        cur.equip = cur.equip || {}; if(!cur.equip[it.slot]) cur.equip[it.slot] = id;   // erste Anschaffung wird direkt angelegt
      }
      return cur;
    }).then(r => {
      if(r.committed && !why) self.toast(it.slot === 'boost' ? '⚡ Doppel-Bonus für 24 Std. aktiv!' : `🛍️ „${it.name}“ gekauft!`);
      else if(why === 'tickets') self.toast('Nicht genug Tickets.', 'err');
      else if(why === 'owned') self.toast('Das besitzt du schon.');
    }).catch(e => self.dbErr('Kauf', e)).then(() => { self.shopBusy = false; renderShop(); });
  };

  // ======================================================  Erfolge
  app.renderAch = function(){
    const need = $('achNeedAuth'), cont = $('achContent');
    const logged = !!this.currentUser && !!this.userData;
    if(need) need.style.display = logged ? 'none' : 'block';
    if(cont) cont.style.display = logged ? 'block' : 'none';
    if(!logged) return;
    const d = this.userData, got = d.ach || {};
    const n = ACH.filter(a => got[a.id]).length;
    const sum = $('achSummary');
    if(sum) sum.innerHTML = `<div class="muted" style="font-size:13px;margin-bottom:8px"><b style="color:var(--gold,#ffd36b)">${n} / ${ACH.length}</b> Erfolge freigeschaltet · Jeder Erfolg bringt Tickets!</div>
      <div class="ach-bar"><i style="width:${Math.round(n / ACH.length * 100)}%"></i></div>`;
    const list = $('achList');
    if(list) list.innerHTML = ACH.map(a => {
      const ok = !!got[a.id];
      return `<div class="ach-item${ok ? ' ok' : ''}"><div class="ach-ico">${ok ? a.ico : '🔒'}</div>
        <div style="flex:1"><b>${esc(a.name)}</b><div class="muted" style="font-size:12px">${esc(a.desc)}</div></div>
        <span class="pill ticket-pill" style="font-size:12px">${ok ? '✓' : '+' + a.reward + ' 🎟️'}</span></div>`;
    }).join('');
  };
  app.checkAch = function(){
    const d = this.userData, key = this.currentUser;
    if(!d || !key || !db || this.achBusy) return;
    let todo = [];
    try { todo = ACH.filter(a => !(d.ach && d.ach[a.id]) && a.test(d)); } catch(e) { console.warn(e); }
    if(!todo.length) return;
    this.achBusy = true;
    const self = this;
    todo.reduce((p, a) => p.then(() => {
      let fresh = false;
      return db.ref('playverseUsers/' + key).transaction(cur => {
        fresh = false;
        if(cur === null) return cur;
        cur.ach = cur.ach || {};
        if(cur.ach[a.id]) return;
        cur.ach[a.id] = self.now();
        cur.arcadeTickets = Number(cur.arcadeTickets || 0) + a.reward;
        fresh = true;
        return cur;
      }).then(r => { if(r.committed && fresh) self.toast(`🏅 Erfolg: ${a.name}  (+${a.reward} 🎟️)`); });
    }), Promise.resolve()).catch(e => self.dbErr('Erfolge', e)).then(() => { self.achBusy = false; });
  };

  // ======================================================  Statistik-Zähler (von core.js aufgerufen)
  app.statInc = function(path){
    if(!this.currentUser || !db) return;
    db.ref('playverseUsers/' + this.currentUser + '/stats/' + path).transaction(v => (Number(v) || 0) + 1).catch(() => {});
  };
  app.statMark = function(path){
    if(!this.currentUser || !db) return;
    db.ref('playverseUsers/' + this.currentUser + '/stats/' + path).set(true).catch(() => {});
  };

  // ======================================================  Einhängen in bestehende Abläufe
  const _sync = app.syncPublicProfile;
  app.syncPublicProfile = function(d){ _sync.call(this, d); this.syncCosmetics(d); this.checkAch(); };
  const _render = app.renderAccountUI;
  app.renderAccountUI = function(){ _render.call(this); try { renderShop(); this.renderAch(); this.updateDailyDot(); } catch(e) { console.error('[PLAYVERSE] Shop-UI:', e); } };
  const _sub = app.openSubTab;
  app.openSubTab = function(tab){ _sub.call(this, tab); if(tab === 'shop') renderShop(); if(tab === 'ach') this.renderAch(); };

  function listen(){
    if(typeof db === 'undefined' || !db) return;
    db.ref('playverseCosmetics').on('value', s => { app.cosmMap = s.val() || {}; app.refreshVipViews(); },
      err => console.warn('[PLAYVERSE] Kosmetik-Liste:', err));
    setInterval(() => { app.updateDailyDot(); }, 60000);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', listen); else listen();
})();
