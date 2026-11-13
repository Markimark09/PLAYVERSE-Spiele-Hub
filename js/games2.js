/* PLAYVERSE – Paket 1: Action-Arcade (Solo): Neon Arena (Top-Down-Shooter) und Space Shooter (vertikaler Shmup)
   Hängt sich an window.solo: app.startSolo('neon') -> S.neonStart, app.startSolo('spaceshooter') -> S.spaceshooterStart */
(function(){
  const S = window.solo;
  const $ = id => document.getElementById(id);
  const say = (id, t) => { const e = $(id); if(e) e.textContent = t; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const hearts = n => '❤️'.repeat(Math.max(0, n));
  function bindKeys(down, up){
    window.activeKeyListener = down; document.addEventListener('keydown', down);
    if(up){ window.activeKeyUpListener = up; document.addEventListener('keyup', up); }
  }
  const KEYMAP = { ArrowLeft:'left', a:'left', A:'left', ArrowRight:'right', d:'right', D:'right', ArrowUp:'up', w:'up', W:'up', ArrowDown:'down', s:'down', S:'down', ' ':'fire' };

  // ======================================================================  NEON ARENA
  let nz = null;
  const NZ = 400;
  function nzSpawn(type){
    const side = Math.floor(Math.random() * 4), p = rnd(0, NZ);
    const x = side === 0 ? -12 : side === 1 ? NZ + 12 : p, y = side === 2 ? -12 : side === 3 ? NZ + 12 : p;
    const w = nz.wave, boss = type === 'boss';
    const T = {
      chaser: { hp: 1, sp: 0.8 + w * 0.03, r: 9,  pts: 10, col: '#ff5d73' },
      fast:   { hp: 1, sp: 1.5 + w * 0.04, r: 6,  pts: 15, col: '#ffb347' },
      tank:   { hp: 3 + Math.floor(w / 4), sp: 0.55, r: 13, pts: 30, col: '#c9a0ff' },
      boss:   { hp: 30 + w * 4, sp: 0.5, r: 26, pts: 300, col: '#ff2e93' }
    }[type];
    nz.enemies.push({ x, y, hp: T.hp, max: T.hp, sp: T.sp, r: T.r, pts: T.pts, col: T.col, boss });
  }
  function nzWave(){
    nz.queue = [];
    const n = 5 + nz.wave * 2;
    for(let i = 0; i < n; i++){
      const r = Math.random();
      nz.queue.push(r < 0.55 ? 'chaser' : r < 0.8 ? 'fast' : 'tank');
    }
    if(nz.wave % 5 === 0) nz.queue.push('boss');
    nz.spawnT = 30;
  }
  function nzStatus(){ say('nzs', `Punkte: ${nz.score} · Leben: ${hearts(nz.hp)} · Welle ${nz.wave}` + (nz.pw.rapid > 0 ? ' · ⚡' : '') + (nz.pw.spread > 0 ? ' · 🔱' : '') + (nz.pw.shield > 0 ? ' · 🛡️' : '')); }
  function nzTick(){
    if(!nz || nz.over) return;
    const p = nz.p, k = nz.keys;
    let dx = (k.right ? 1 : 0) - (k.left ? 1 : 0), dy = (k.down ? 1 : 0) - (k.up ? 1 : 0);
    if(dx && dy){ dx *= 0.707; dy *= 0.707; }
    p.x = Math.max(8, Math.min(NZ - 8, p.x + dx * 2.6)); p.y = Math.max(8, Math.min(NZ - 8, p.y + dy * 2.6));
    if(p.inv > 0) p.inv--;
    ['rapid', 'spread', 'shield'].forEach(t => { if(nz.pw[t] > 0) nz.pw[t]--; });
    // Spawns
    if(nz.queue.length && --nz.spawnT <= 0){ nzSpawn(nz.queue.shift()); nz.spawnT = Math.max(8, 26 - nz.wave); }
    // Auto-Zielen auf nächsten Gegner
    if(nz.cool > 0) nz.cool--;
    if(nz.enemies.length && nz.cool <= 0){
      let best = null, bd = 1e9;
      nz.enemies.forEach(e => { const d = Math.hypot(e.x - p.x, e.y - p.y); if(d < bd){ bd = d; best = e; } });
      const a = Math.atan2(best.y - p.y, best.x - p.x);
      const angs = nz.pw.spread > 0 ? [a - 0.22, a, a + 0.22] : [a];
      angs.forEach(an => nz.bul.push({ x: p.x, y: p.y, vx: Math.cos(an) * 6, vy: Math.sin(an) * 6, life: 60 }));
      nz.cool = nz.pw.rapid > 0 ? 6 : 13;
    }
    nz.bul.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; });
    nz.bul = nz.bul.filter(b => b.life > 0 && b.x > -10 && b.x < NZ + 10 && b.y > -10 && b.y < NZ + 10);
    // Gegner
    nz.enemies.forEach(e => { const a = Math.atan2(p.y - e.y, p.x - e.x); e.x += Math.cos(a) * e.sp; e.y += Math.sin(a) * e.sp; });
    // Treffer Schuss -> Gegner
    nz.bul.forEach(b => {
      const e = nz.enemies.find(e => Math.hypot(e.x - b.x, e.y - b.y) < e.r + 3);
      if(e){ e.hp--; b.life = 0; }
    });
    nz.bul = nz.bul.filter(b => b.life > 0);
    const dead = nz.enemies.filter(e => e.hp <= 0);
    if(dead.length){
      dead.forEach(e => {
        nz.score += e.pts;
        if(e.boss || Math.random() < 0.12){
          const t = ['rapid', 'spread', 'shield', 'heal'][Math.floor(Math.random() * 4)];
          nz.pups.push({ x: e.x, y: e.y, t, life: 600 });
        }
      });
      nz.enemies = nz.enemies.filter(e => e.hp > 0); nzStatus();
    }
    // Powerups
    nz.pups.forEach(u => u.life--);
    nz.pups = nz.pups.filter(u => {
      if(Math.hypot(u.x - p.x, u.y - p.y) < 14){
        if(u.t === 'heal') nz.hp = Math.min(5, nz.hp + 1); else nz.pw[u.t] = 600;
        nzStatus(); return false;
      }
      return u.life > 0;
    });
    // Schaden
    if(p.inv <= 0 && nz.enemies.some(e => Math.hypot(e.x - p.x, e.y - p.y) < e.r + 7)){
      if(nz.pw.shield > 0){ nz.pw.shield = 0; p.inv = 40; }
      else { nz.hp--; p.inv = 70; }
      nzStatus();
      if(nz.hp <= 0){
        nz.over = true; say('nzs', `Game Over! Punkte: ${nz.score} (Welle ${nz.wave})`);
        app.submitScore('neon', nz.score);
        if(nz.score >= 300) app.offerCompletionBonus('Neon Arena beendet (' + nz.score + ' Pkt)');
      }
    }
    // Welle geschafft
    if(!nz.over && !nz.queue.length && !nz.enemies.length){
      nz.score += 100; nz.wave++; nzWave(); nzStatus();
      app.submitScore('neon', nz.score);
      app.offerCompletionBonus('Neon Arena: Welle ' + (nz.wave - 1) + ' geschafft');
    }
    nzDraw();
  }
  function nzDraw(){
    const c = nz.ctx, p = nz.p;
    c.fillStyle = '#05060f'; c.fillRect(0, 0, NZ, NZ);
    c.strokeStyle = '#121a3a'; c.lineWidth = 1;
    for(let i = 0; i <= NZ; i += 40){ c.beginPath(); c.moveTo(i, 0); c.lineTo(i, NZ); c.moveTo(0, i); c.lineTo(NZ, i); c.stroke(); }
    nz.pups.forEach(u => { c.fillStyle = { rapid:'#ffd36b', spread:'#66e3ff', shield:'#b8f36b', heal:'#ff6fa5' }[u.t]; c.beginPath(); c.arc(u.x, u.y, 7, 0, 7); c.fill(); c.fillStyle = '#05060f'; c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; c.fillText({ rapid:'⚡', spread:'3', shield:'S', heal:'+' }[u.t], u.x, u.y + 3); });
    nz.enemies.forEach(e => {
      c.fillStyle = e.col; c.shadowColor = e.col; c.shadowBlur = 8; c.fillRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2); c.shadowBlur = 0;
      if(e.max > 1){ c.fillStyle = '#000a'; c.fillRect(e.x - e.r, e.y - e.r - 5, e.r * 2, 3); c.fillStyle = '#b8f36b'; c.fillRect(e.x - e.r, e.y - e.r - 5, e.r * 2 * (e.hp / e.max), 3); }
    });
    c.fillStyle = '#ffe58a'; nz.bul.forEach(b => c.fillRect(b.x - 2, b.y - 2, 4, 4));
    if(p.inv <= 0 || Math.floor(p.inv / 5) % 2){
      c.fillStyle = '#66e3ff'; c.shadowColor = '#66e3ff'; c.shadowBlur = 12; c.beginPath(); c.arc(p.x, p.y, 8, 0, 7); c.fill(); c.shadowBlur = 0;
      if(nz.pw.shield > 0){ c.strokeStyle = '#b8f36b'; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y, 13, 0, 7); c.stroke(); }
    }
  }
  S.neonKey = (name, v) => { if(nz) nz.keys[name] = v; };
  S.neonStart = function(){
    const cv = $('nzCvs'); if(!cv) return;
    nz = { ctx: cv.getContext('2d'), p: { x: 200, y: 200, inv: 0 }, hp: 5, score: 0, wave: 1, over: false, cool: 0,
           bul: [], enemies: [], pups: [], queue: [], pw: { rapid: 0, spread: 0, shield: 0 }, keys: { left:false, right:false, up:false, down:false } };
    nzWave(); nzStatus();
    bindKeys(e => { const n = KEYMAP[e.key]; if(n && n !== 'fire'){ nz.keys[n] = true; e.preventDefault(); } },
             e => { const n = KEYMAP[e.key]; if(n) nz.keys[n] = false; });
    app.stInt(nzTick, 16);
    nzDraw();
  };

  // ======================================================================  SPACE SHOOTER
  let sp = null;
  const SW = 320, SH = 440;
  function spShoot(){
    const x = sp.x, y = sp.y - 14, l = sp.lvl;
    const add = (dx, vx) => sp.bul.push({ x: x + dx, y, vx, vy: -8 });
    if(l === 1) add(0, 0); else if(l === 2){ add(-6, 0); add(6, 0); } else { add(0, 0); add(-8, -1.2); add(8, 1.2); }
  }
  function spStatus(){ say('sps', `Punkte: ${sp.score} · Leben: ${hearts(sp.lives)} · Welle ${sp.wave} · Waffe ${sp.lvl}` + (sp.shield > 0 ? ' · 🛡️' : '')); }
  function spEnemy(kind){
    const x = rnd(30, SW - 30);
    const T = { sine: { hp: 1, r: 11, pts: 10, col: '#ff5d73' }, dive: { hp: 1, r: 9, pts: 15, col: '#ffb347' }, gun: { hp: 3, r: 13, pts: 30, col: '#c9a0ff' } }[kind];
    sp.enemies.push({ kind, x, x0: x, y: -20, t: 0, hp: T.hp, max: T.hp, r: T.r, pts: T.pts, col: T.col, fire: rnd(30, 90), stopY: rnd(70, 150) });
  }
  function spBoss(){
    const hp = 60 + 25 * Math.floor(sp.wave / 3);
    sp.boss = { x: SW / 2, y: -50, hp, max: hp, dir: 1, fire: 40, t: 0 };
  }
  function spDie(){
    if(sp.inv > 0 || sp.shield > 0) return;
    sp.lives--; sp.inv = 120; sp.lvl = Math.max(1, sp.lvl - 1); spStatus();
    if(sp.lives <= 0){
      sp.over = true; say('sps', `Game Over! Punkte: ${sp.score} (Welle ${sp.wave})`);
      app.submitScore('spaceshooter', sp.score);
      if(sp.score >= 400) app.offerCompletionBonus('Space Shooter beendet (' + sp.score + ' Pkt)');
    }
  }
  function spTick(){
    if(!sp || sp.over) return;
    sp.t++;
    const k = sp.keys;
    if(k.left) sp.x -= 4; if(k.right) sp.x += 4; if(k.up) sp.y -= 4; if(k.down) sp.y += 4;
    if(sp.target){ const dx = sp.target.x - sp.x, dy = sp.target.y - 40 - sp.y; sp.x += Math.max(-6, Math.min(6, dx * 0.25)); sp.y += Math.max(-6, Math.min(6, dy * 0.25)); }
    sp.x = Math.max(12, Math.min(SW - 12, sp.x)); sp.y = Math.max(40, Math.min(SH - 20, sp.y));
    if(sp.inv > 0) sp.inv--; if(sp.shield > 0) sp.shield--;
    if(sp.t % 9 === 0) spShoot();
    // Spawns
    if(sp.spawned < sp.waveSize && sp.t % Math.max(22, 60 - sp.wave * 3) === 0){
      spEnemy(['sine', 'sine', 'dive', 'gun'][Math.floor(Math.random() * 4)]); sp.spawned++;
    }
    sp.bul.forEach(b => { b.x += b.vx; b.y += b.vy; });
    sp.bul = sp.bul.filter(b => b.y > -10 && b.x > -10 && b.x < SW + 10);
    sp.ebul.forEach(b => { b.x += b.vx; b.y += b.vy; });
    sp.ebul = sp.ebul.filter(b => b.y < SH + 10 && b.y > -10 && b.x > -10 && b.x < SW + 10);
    sp.enemies.forEach(e => {
      e.t++;
      if(e.kind === 'sine'){ e.y += 1.4; e.x = e.x0 + Math.sin(e.t / 22) * 50; }
      else if(e.kind === 'dive'){ e.y += 3.2; }
      else { if(e.y < e.stopY) e.y += 1.2; else e.x += Math.sin(e.t / 30) * 0.8;
             if(--e.fire <= 0){ const a = Math.atan2(sp.y - e.y, sp.x - e.x); sp.ebul.push({ x: e.x, y: e.y, vx: Math.cos(a) * 2.6, vy: Math.sin(a) * 2.6 }); e.fire = 80; } }
    });
    sp.enemies = sp.enemies.filter(e => e.y < SH + 30);
    if(sp.boss){
      const b = sp.boss; b.t++;
      if(b.y < 70) b.y += 1; else { b.x += b.dir * 1.4; if(b.x > SW - 50 || b.x < 50) b.dir = -b.dir; }
      if(--b.fire <= 0){
        for(let i = -2; i <= 2; i++){ const a = Math.PI / 2 + i * 0.28; sp.ebul.push({ x: b.x, y: b.y + 20, vx: Math.cos(a) * 2.4, vy: Math.sin(a) * 2.4 }); }
        b.fire = 55;
      }
    }
    // Treffer eigene Schüsse
    sp.bul.forEach(b => {
      const e = sp.enemies.find(e => Math.hypot(e.x - b.x, e.y - b.y) < e.r + 3);
      if(e){ e.hp--; b.y = -99; }
      else if(sp.boss && Math.abs(sp.boss.x - b.x) < 30 && Math.abs(sp.boss.y - b.y) < 22){ sp.boss.hp--; b.y = -99; }
    });
    const dead = sp.enemies.filter(e => e.hp <= 0);
    dead.forEach(e => { sp.score += e.pts; if(Math.random() < 0.14) sp.pups.push({ x: e.x, y: e.y, t: ['weapon', 'shield', 'life'][Math.floor(Math.random() * 3)] }); });
    if(dead.length){ sp.enemies = sp.enemies.filter(e => e.hp > 0); spStatus(); }
    if(sp.boss && sp.boss.hp <= 0){
      sp.score += 500; sp.pups.push({ x: sp.boss.x, y: sp.boss.y, t: 'weapon' }); sp.boss = null; sp.ebul = [];
      sp.wave++; sp.spawned = 0; sp.waveSize = 8 + sp.wave * 2; spStatus();
      app.submitScore('spaceshooter', sp.score);
      app.offerCompletionBonus('Space Shooter: Boss besiegt!');
    }
    // Powerups
    sp.pups.forEach(u => u.y += 1.5);
    sp.pups = sp.pups.filter(u => {
      if(Math.hypot(u.x - sp.x, u.y - sp.y) < 16){
        if(u.t === 'weapon') sp.lvl = Math.min(3, sp.lvl + 1); else if(u.t === 'shield') sp.shield = 360; else sp.lives = Math.min(5, sp.lives + 1);
        spStatus(); return false;
      }
      return u.y < SH + 10;
    });
    // Schaden an Spieler
    if(sp.ebul.some(b => Math.hypot(b.x - sp.x, b.y - sp.y) < 8) ||
       sp.enemies.some(e => Math.hypot(e.x - sp.x, e.y - sp.y) < e.r + 8)){
      sp.ebul = sp.ebul.filter(b => Math.hypot(b.x - sp.x, b.y - sp.y) >= 8);
      spDie();
    }
    // Wellenende
    if(!sp.over && sp.wave % 3 !== 0 && sp.spawned >= sp.waveSize && !sp.enemies.length){
      sp.score += 100; sp.wave++; sp.spawned = 0; sp.waveSize = 8 + sp.wave * 2;
      if(sp.wave % 3 === 0){ spBoss(); sp.waveSize = 0; }
      spStatus(); app.submitScore('spaceshooter', sp.score);
    }
    spDraw();
  }
  function spDraw(){
    const c = sp.ctx;
    c.fillStyle = '#05060f'; c.fillRect(0, 0, SW, SH);
    c.fillStyle = '#fff';
    sp.stars.forEach(s => { s.y = (s.y + s.v) % SH; c.globalAlpha = s.v / 2.2; c.fillRect(s.x, s.y, 1.5, 1.5); }); c.globalAlpha = 1;
    sp.pups.forEach(u => { c.fillStyle = { weapon:'#ffd36b', shield:'#b8f36b', life:'#ff6fa5' }[u.t]; c.beginPath(); c.arc(u.x, u.y, 8, 0, 7); c.fill(); c.fillStyle = '#05060f'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText({ weapon:'W', shield:'S', life:'+' }[u.t], u.x, u.y + 3.5); });
    sp.enemies.forEach(e => { c.fillStyle = e.col; c.beginPath(); c.moveTo(e.x, e.y + e.r); c.lineTo(e.x - e.r, e.y - e.r); c.lineTo(e.x + e.r, e.y - e.r); c.closePath(); c.fill(); });
    if(sp.boss){
      const b = sp.boss; c.fillStyle = '#ff2e93'; c.fillRect(b.x - 34, b.y - 16, 68, 32); c.fillStyle = '#7a1048'; c.fillRect(b.x - 20, b.y + 10, 40, 14);
      c.fillStyle = '#000a'; c.fillRect(20, 8, SW - 40, 6); c.fillStyle = '#b8f36b'; c.fillRect(20, 8, (SW - 40) * Math.max(0, b.hp / b.max), 6);
    }
    c.fillStyle = '#ffe58a'; sp.bul.forEach(b => c.fillRect(b.x - 1.5, b.y - 5, 3, 9));
    c.fillStyle = '#ff6fa5'; sp.ebul.forEach(b => { c.beginPath(); c.arc(b.x, b.y, 3.5, 0, 7); c.fill(); });
    if(sp.inv <= 0 || Math.floor(sp.inv / 6) % 2){
      c.fillStyle = '#66e3ff'; c.beginPath(); c.moveTo(sp.x, sp.y - 14); c.lineTo(sp.x - 12, sp.y + 10); c.lineTo(sp.x, sp.y + 5); c.lineTo(sp.x + 12, sp.y + 10); c.closePath(); c.fill();
      if(sp.shield > 0){ c.strokeStyle = '#b8f36b'; c.lineWidth = 2; c.beginPath(); c.arc(sp.x, sp.y, 18, 0, 7); c.stroke(); }
    }
  }
  S._dbg = { sp: () => sp, nz: () => nz };
  S.spaceKey = (name, v) => { if(sp) sp.keys[name] = v; };
  S.spaceshooterStart = function(){
    const cv = $('spCvs'); if(!cv) return;
    sp = { ctx: cv.getContext('2d'), x: SW / 2, y: SH - 50, lives: 3, score: 0, wave: 1, lvl: 1, over: false, t: 0, inv: 0, shield: 0,
           bul: [], ebul: [], enemies: [], pups: [], boss: null, spawned: 0, waveSize: 10, target: null,
           stars: Array.from({ length: 40 }, () => ({ x: rnd(0, SW), y: rnd(0, SH), v: rnd(0.4, 2.2) })),
           keys: { left:false, right:false, up:false, down:false } };
    const pos = e => { const r = cv.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return { x: (t.clientX - r.left) * SW / r.width, y: (t.clientY - r.top) * SH / r.height }; };
    cv.onpointerdown = cv.onpointermove = e => { if(e.buttons || e.pointerType === 'touch'){ sp.target = pos(e); e.preventDefault(); } };
    cv.onpointerup = cv.onpointerleave = () => { if(sp) sp.target = null; };
    spStatus();
    bindKeys(e => { const n = KEYMAP[e.key]; if(n && n !== 'fire'){ sp.keys[n] = true; e.preventDefault(); } },
             e => { const n = KEYMAP[e.key]; if(n) sp.keys[n] = false; });
    app.stInt(spTick, 16);
    spDraw();
  };
})();
