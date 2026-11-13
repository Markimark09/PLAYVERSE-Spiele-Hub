/* PLAYVERSE – neue Solo-Spiele: Pac-Man, Donkey Kong, Frogger, Asteroids
   Wird nach solo.js geladen und hängt sich an window.solo (S.<id>Start wird von app.startSolo('<id>') aufgerufen). */
(function(){
  const S = window.solo;
  const $ = id => document.getElementById(id);
  const say = (id, t) => { const e = $(id); if(e) e.textContent = t; };
  const rnd = n => Math.floor(Math.random() * n);
  function bindKeys(down, up){
    window.activeKeyListener = down;
    document.addEventListener('keydown', down);
    if(up){ window.activeKeyUpListener = up; document.addEventListener('keyup', up); }
  }
  function swipe(cv, fn){
    let sx = 0, sy = 0;
    cv.ontouchstart = e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
    cv.ontouchend = e => {
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if(Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
      if(Math.abs(dx) > Math.abs(dy)) fn(dx > 0 ? 1 : -1, 0); else fn(0, dy > 0 ? 1 : -1);
    };
  }
  const ARROWS = { ArrowLeft:[-1,0], a:[-1,0], A:[-1,0], ArrowRight:[1,0], d:[1,0], D:[1,0],
                   ArrowUp:[0,-1], w:[0,-1], W:[0,-1], ArrowDown:[0,1], s:[0,1], S:[0,1] };

  // =====================================================================  PAC-MAN
  const PAC_MAZE = [
    "###################",
    "#........#........#",
    "#o##.###.#.###.##o#",
    "#.................#",
    "#.##.#.#####.#.##.#",
    "#....#...#...#....#",
    "####.###.#.###.####",
    "####.#.......#.####",
    "####.#.#   #.#.####",
    ".......#   #.......",
    "####.#.#####.#.####",
    "####.#.......#.####",
    "####.#.#####.#.####",
    "#........#........#",
    "#.##.###.#.###.##.#",
    "#o.#.....P.....#.o#",
    "##.#.#.#####.#.#.##",
    "#....#...#...#....#",
    "#.######.#.######.#",
    "#.................#",
    "###################"
  ];
  S.PAC_MAZE = PAC_MAZE;
  let pm = null;
  const PM_DIRS = [[1,0],[-1,0],[0,1],[0,-1]];
  function pmBuild(){
    pm.grid = PAC_MAZE.map(r => r.split(''));
    pm.dots = 0;
    pm.grid.forEach((row, y) => row.forEach((c, x) => {
      if(c === 'P'){ row[x] = ' '; }
      else if(c === '.' || c === 'o') pm.dots++;
    }));
  }
  function pmFree(x, y){
    if(y < 0 || y >= pm.h) return false;
    x = (x + pm.w) % pm.w;
    return pm.grid[y][x] !== '#';
  }
  function pmReset(){
    pm.px = 9; pm.py = 15; pm.dir = {x:0, y:0}; pm.want = {x:0, y:0}; pm.power = 0;
    pm.ghosts = [
      { x:8,  y:9, dir:[0,-1], col:'#ff4d4d', rel:6 },
      { x:9,  y:9, dir:[0,-1], col:'#ffb8ff', rel:30 },
      { x:10, y:9, dir:[0,-1], col:'#4df0ff', rel:55 }
    ];
    pm.tick = 0;
  }
  function pmStatus(){ say('pacs', `Punkte: ${pm.score} · Leben: ${'❤️'.repeat(Math.max(pm.lives,0))} · Level ${pm.level}`); }
  function pmLoseLife(){
    pm.lives--;
    if(pm.lives <= 0){
      pm.over = true;
      say('pacs', `Game Over! Punkte: ${pm.score}`);
      app.submitScore('pacman', pm.score);
      if(pm.score >= 500) app.offerCompletionBonus('Pac-Man Runde beendet (' + pm.score + ' Pkt)');
    } else { pmReset(); pmStatus(); }
  }
  function pmHit(){
    for(const g of pm.ghosts){
      if(g.x === pm.px && g.y === pm.py){
        if(pm.power > 0){
          pm.score += 200; g.x = 9; g.y = 9; g.rel = pm.tick + 20; g.dir = [0,-1];
          pmStatus();
        } else { pmLoseLife(); return true; }
      }
    }
    return false;
  }
  function pmTick(){
    if(!pm || pm.over) return;
    pm.tick++;
    const can = d => (d.x || d.y) && pmFree(pm.px + d.x, pm.py + d.y);
    if(can(pm.want)) pm.dir = pm.want;
    if(can(pm.dir)){
      pm.px = (pm.px + pm.dir.x + pm.w) % pm.w; pm.py += pm.dir.y;
      const c = pm.grid[pm.py][pm.px];
      if(c === '.'){ pm.grid[pm.py][pm.px] = ' '; pm.score += 10; pm.dots--; pmStatus(); }
      else if(c === 'o'){ pm.grid[pm.py][pm.px] = ' '; pm.score += 50; pm.dots--; pm.power = 55; pmStatus(); }
    }
    if(pm.power > 0) pm.power--;
    if(pmHit()) { pmDraw(); return; }
    // Geister
    for(const g of pm.ghosts){
      if(pm.tick < g.rel) continue;
      if(pm.power > 0 && pm.tick % 2) continue;       // verängstigte Geister sind langsamer
      let opts = PM_DIRS.filter(d => pmFree(g.x + d[0], g.y + d[1]) && !(d[0] === -g.dir[0] && d[1] === -g.dir[1]));
      if(!opts.length) opts = PM_DIRS.filter(d => pmFree(g.x + d[0], g.y + d[1]));
      if(!opts.length) continue;
      let pick;
      if(pm.power === 0 && Math.random() < 0.7){
        let best = 1e9;
        opts.forEach(d => {
          const dist = Math.abs(g.x + d[0] - pm.px) + Math.abs(g.y + d[1] - pm.py) + Math.random();
          if(dist < best){ best = dist; pick = d; }
        });
      } else pick = opts[rnd(opts.length)];
      g.dir = pick; g.x = (g.x + pick[0] + pm.w) % pm.w; g.y += pick[1];
    }
    if(pmHit()) { pmDraw(); return; }
    if(pm.dots <= 0){
      pm.level++; pm.score += 500;
      app.submitScore('pacman', pm.score);
      app.offerCompletionBonus('Pac-Man Level geschafft');
      pmBuild(); pmReset(); pmStatus();
    }
    pmDraw();
  }
  function pmDraw(){
    const c = pm.ctx, s = pm.cs;
    c.fillStyle = '#05060f'; c.fillRect(0, 0, pm.w * s, pm.h * s);
    for(let y = 0; y < pm.h; y++) for(let x = 0; x < pm.w; x++){
      const ch = pm.grid[y][x];
      if(ch === '#'){ c.fillStyle = '#2438d6'; c.fillRect(x*s+1, y*s+1, s-2, s-2); }
      else if(ch === '.'){ c.fillStyle = '#ffd9a0'; c.fillRect(x*s+s/2-1.5, y*s+s/2-1.5, 3, 3); }
      else if(ch === 'o'){ c.fillStyle = '#ffd9a0'; c.beginPath(); c.arc(x*s+s/2, y*s+s/2, 5, 0, 7); c.fill(); }
    }
    // Pac-Man
    const ang = pm.dir.x === 1 ? 0 : pm.dir.x === -1 ? Math.PI : pm.dir.y === 1 ? Math.PI/2 : pm.dir.y === -1 ? -Math.PI/2 : 0;
    const m = (pm.tick % 2) ? 0.08 : 0.6;
    c.fillStyle = '#ffe135'; c.beginPath();
    c.moveTo(pm.px*s+s/2, pm.py*s+s/2);
    c.arc(pm.px*s+s/2, pm.py*s+s/2, s/2-1, ang + m, ang + Math.PI*2 - m); c.closePath(); c.fill();
    // Geister
    pm.ghosts.forEach(g => {
      const gx = g.x*s, gy = g.y*s;
      const scared = pm.power > 0, blink = pm.power < 14 && pm.tick % 2;
      c.fillStyle = scared ? (blink ? '#ffffff' : '#2b3bff') : g.col;
      c.beginPath(); c.arc(gx+s/2, gy+s/2-1, s/2-1.5, Math.PI, 0); c.lineTo(gx+s-1.5, gy+s-1.5); c.lineTo(gx+1.5, gy+s-1.5); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.fillRect(gx+4, gy+5, 3, 4); c.fillRect(gx+9, gy+5, 3, 4);
    });
  }
  S.pacDir = (dx, dy) => { if(pm) pm.want = {x:dx, y:dy}; };
  S.pacmanStart = function(){
    const cv = $('pacCvs'); if(!cv) return;
    pm = { ctx: cv.getContext('2d'), cs: 16, w: 19, h: 21, score: 0, lives: 3, level: 1, over: false };
    pmBuild(); pmReset(); pmStatus();
    bindKeys(e => { const m = ARROWS[e.key]; if(m){ pm.want = {x:m[0], y:m[1]}; e.preventDefault(); } });
    swipe(cv, S.pacDir);
    app.stInt(pmTick, 130);
    pmDraw();
  };

  // =====================================================================  DONKEY KONG
  const DK_FLOORS = [392, 316, 240, 164, 88];
  const DK_LADDERS = [ {x:250, lo:0}, {x:70, lo:1}, {x:250, lo:2}, {x:70, lo:3} ];
  let dk = null;
  function dkStatus(){ say('dks', `Punkte: ${dk.score} · Leben: ${'❤️'.repeat(Math.max(dk.lives,0))} · Level ${dk.level}`); }
  function dkResetPlayer(){
    dk.px = 24; dk.plat = 0; dk.py = DK_FLOORS[0]; dk.vy = 0; dk.onGround = true; dk.climb = null; dk.barrels = []; dk.spawn = 40;
  }
  function dkLose(){
    dk.lives--;
    if(dk.lives <= 0){
      dk.over = true; say('dks', `Game Over! Punkte: ${dk.score}`);
      app.submitScore('dk', dk.score);
      if(dk.score >= 400) app.offerCompletionBonus('Donkey Kong Runde beendet (' + dk.score + ' Pkt)');
    } else { dkResetPlayer(); dkStatus(); }
  }
  function dkNear(l){ return Math.abs(dk.px - l.x) < 12; }
  function dkTick(){
    if(!dk || dk.over) return;
    const k = dk.keys;
    if(dk.climb){
      const l = dk.climb, top = DK_FLOORS[l.lo+1], bot = DK_FLOORS[l.lo];
      if(k.up) dk.py -= 1.8; if(k.down) dk.py += 1.8;
      if(dk.py <= top){ dk.py = top; dk.plat = l.lo+1; dk.climb = null; dk.onGround = true;
        if(dk.plat === 4){
          dk.score += 1000; dk.level++; dkStatus();
          app.submitScore('dk', dk.score);
          app.offerCompletionBonus('Donkey Kong: Pauline gerettet!');
          dkResetPlayer(); return;
        } else { dk.score += 50; dkStatus(); } }
      else if(dk.py >= bot){ dk.py = bot; dk.plat = l.lo; dk.climb = null; dk.onGround = true; }
    } else {
      if(dk.onGround && (k.up || k.down)){
        const l = DK_LADDERS.find(l => k.up ? (l.lo === dk.plat && dkNear(l)) : (l.lo + 1 === dk.plat && dkNear(l)));
        if(l){ dk.climb = l; dk.px = l.x; }
      }
      if(!dk.climb){
        dk.px += (k.right ? 2 : 0) - (k.left ? 2 : 0);
        dk.px = Math.max(8, Math.min(312, dk.px));
        if(k.jump && dk.onGround){ dk.vy = -6.2; dk.onGround = false; }
        if(!dk.onGround){
          dk.vy += 0.4; dk.py += dk.vy;
          if(dk.py >= DK_FLOORS[dk.plat] && dk.vy > 0){ dk.py = DK_FLOORS[dk.plat]; dk.vy = 0; dk.onGround = true; }
        }
      }
    }
    // Fässer
    if(--dk.spawn <= 0){
      dk.barrels.push({ x:64, y:DK_FLOORS[4], plat:4, dir:1, fall:false, tgt:0, scored:false });
      dk.spawn = Math.max(45, 120 - dk.level * 10) + rnd(40);
    }
    const spd = 1.7 + Math.min(dk.level - 1, 5) * 0.12;
    dk.barrels = dk.barrels.filter(b => {
      if(b.fall){
        b.y += 3;
        if(b.y >= DK_FLOORS[b.tgt]){ b.y = DK_FLOORS[b.tgt]; b.plat = b.tgt; b.fall = false; }
      } else {
        b.x += b.dir * spd;
        const lad = DK_LADDERS.find(l => l.lo + 1 === b.plat && Math.abs(b.x - l.x) < 2);
        if(lad && Math.random() < 0.15){ b.fall = true; b.tgt = b.plat - 1; b.x = lad.x; if(Math.random() < .5) b.dir = -b.dir; }
        else if(b.plat > 0 && (b.x < 6 || b.x > 314)){ b.x = b.x < 6 ? 6 : 314; b.fall = true; b.tgt = b.plat - 1; b.dir = -b.dir; }
        else if(b.plat === 0 && (b.x < -12 || b.x > 332)) return false;
      }
      const dx = Math.abs(b.x - dk.px), dy = Math.abs(b.y - dk.py);
      if(dx < 10 && dy < 12) { b.hit = true; }
      else if(!b.scored && dx < 10 && !dk.onGround && !dk.climb && dk.py < b.y - 14){ b.scored = true; dk.score += 100; dkStatus(); }
      return true;
    });
    if(dk.barrels.some(b => b.hit)){ dkLose(); }
    dkDraw();
  }
  function dkDraw(){
    const c = dk.ctx;
    c.fillStyle = '#05060f'; c.fillRect(0, 0, 320, 420);
    DK_LADDERS.forEach(l => {
      c.strokeStyle = '#66e3ff'; c.lineWidth = 2;
      const y1 = DK_FLOORS[l.lo+1], y0 = DK_FLOORS[l.lo];
      c.beginPath(); c.moveTo(l.x-7, y1); c.lineTo(l.x-7, y0); c.moveTo(l.x+7, y1); c.lineTo(l.x+7, y0);
      for(let y = y1 + 6; y < y0; y += 9){ c.moveTo(l.x-7, y); c.lineTo(l.x+7, y); }
      c.stroke();
    });
    DK_FLOORS.forEach(y => { c.fillStyle = '#d9534f'; c.fillRect(0, y, 320, 7); c.fillStyle = '#7a2623'; c.fillRect(0, y+7, 320, 2); });
    c.font = '26px serif'; c.textBaseline = 'alphabetic';
    c.fillText('🦍', 10, DK_FLOORS[4] - 2); c.fillText('👸', 150, DK_FLOORS[4] - 2);
    dk.barrels.forEach(b => { c.fillStyle = '#b5772d'; c.beginPath(); c.arc(b.x, b.y - 6, 6, 0, 7); c.fill(); c.strokeStyle = '#4a2a0a'; c.lineWidth = 1.5; c.stroke(); });
    c.fillStyle = '#ff3b3b'; c.fillRect(dk.px - 5, dk.py - 14, 10, 8);
    c.fillStyle = '#4da3ff'; c.fillRect(dk.px - 5, dk.py - 6, 10, 6);
    c.fillStyle = '#ffd9a0'; c.fillRect(dk.px - 4, dk.py - 20, 8, 6);
  }
  S.dkKey = (name, v) => { if(dk) dk.keys[name] = v; };
  S.donkeyStart = S.dkStart = function(){
    const cv = $('dkCvs'); if(!cv) return;
    dk = { ctx: cv.getContext('2d'), score: 0, lives: 3, level: 1, over: false, keys: {left:false, right:false, up:false, down:false, jump:false} };
    dkResetPlayer(); dkStatus();
    const map = { ArrowLeft:'left', a:'left', A:'left', ArrowRight:'right', d:'right', D:'right', ArrowUp:'up', w:'up', W:'up', ArrowDown:'down', s:'down', S:'down', ' ':'jump', z:'jump', Z:'jump' };
    bindKeys(e => { const n = map[e.key]; if(n){ dk.keys[n] = true; e.preventDefault(); } },
             e => { const n = map[e.key]; if(n) dk.keys[n] = false; });
    app.stInt(dkTick, 20);
    dkDraw();
  };

  // =====================================================================  FROGGER
  const FG_C = 24, FG_W = 14 * FG_C, FG_ROWS = 13;
  const FG_HOMES = [1, 4, 7, 10, 13];
  let fg = null;
  function fgLanes(){
    const f = 1 + 0.15 * (fg.level - 1);
    const mk = (row, v, w, gap, n, col, type) => {
      const items = []; for(let i = 0; i < n; i++) items.push({ x: i * (w + gap) + row * 17, w });
      return { row, v: v * f, w, period: n * (w + gap), items, col, type };
    };
    fg.lanes = [
      mk(1,  0.7, 72, 72, 3, '#8b5a2b', 'log'),
      mk(2, -1.0, 48, 72, 4, '#2fa36b', 'log'),
      mk(3,  0.9, 96, 72, 3, '#8b5a2b', 'log'),
      mk(4, -0.6, 48, 48, 5, '#2fa36b', 'log'),
      mk(5,  1.2, 72, 96, 3, '#8b5a2b', 'log'),
      mk(7, -1.2, 36, 110, 3, '#ff5d73', 'car'),
      mk(8,  1.0, 60, 120, 3, '#ffb347', 'car'),
      mk(9, -1.6, 36, 90, 4, '#66e3ff', 'car'),
      mk(10, 0.9, 36, 140, 3, '#b8f36b', 'car'),
      mk(11,-1.0, 60, 100, 3, '#c9a0ff', 'car')
    ];
  }
  function fgStatus(){ say('fgs', `Punkte: ${fg.score} · Leben: ${'❤️'.repeat(Math.max(fg.lives,0))} · Heimfelder: ${fg.homes.filter(Boolean).length}/5 · Zeit: ${Math.ceil(fg.time / 33)}s`); }
  function fgResetFrog(){ fg.row = 12; fg.best = 12; fg.x = 6 * FG_C; fg.time = 33 * 30; }
  function fgDie(){
    fg.lives--;
    if(fg.lives <= 0){
      fg.over = true; say('fgs', `Game Over! Punkte: ${fg.score}`);
      app.submitScore('frogger', fg.score);
      if(fg.score >= 200) app.offerCompletionBonus('Frogger Runde beendet (' + fg.score + ' Pkt)');
    } else { fgResetFrog(); fgStatus(); }
  }
  function fgCheckGoal(){
    const cx = fg.x + FG_C / 2;
    let slot = -1;
    FG_HOMES.forEach((c, i) => { if(Math.abs(cx - (c + 0.5) * FG_C) < FG_C * 0.75) slot = i; });
    if(slot < 0 || fg.homes[slot]){ fgDie(); return; }
    fg.homes[slot] = true; fg.score += 50 + Math.floor(fg.time / 33);
    if(fg.homes.every(Boolean)){
      fg.level++; fg.score += 500; fg.homes = [false,false,false,false,false]; fgLanes();
      app.submitScore('frogger', fg.score);
      app.offerCompletionBonus('Frogger: alle 5 Heimfelder besetzt');
    }
    fgResetFrog(); fgStatus();
  }
  S.frogMove = (dx, dy) => {
    if(!fg || fg.over) return;
    fg.x = Math.max(0, Math.min(FG_W - FG_C, fg.x + dx * FG_C));
    const nr = Math.max(0, Math.min(FG_ROWS - 1, fg.row - dy));   // dy=-1 => nach oben
    fg.row = nr;
    if(nr < fg.best){ fg.best = nr; fg.score += 10; }
    if(fg.row === 0) fgCheckGoal();
    fgStatus();
  };
  function fgTick(){
    if(!fg || fg.over) return;
    fg.lanes.forEach(l => l.items.forEach(it => {
      it.x += l.v;
      if(l.v > 0 && it.x >= FG_W) it.x -= l.period;
      else if(l.v < 0 && it.x + it.w <= 0) it.x += l.period;
    }));
    if(--fg.time <= 0){ fgDie(); fgDraw(); return; }
    const lane = fg.lanes.find(l => l.row === fg.row);
    if(lane){
      const cx = fg.x + FG_C / 2;
      if(lane.type === 'log'){
        if(!lane.items.some(it => cx >= it.x && cx <= it.x + it.w)) { fgDie(); fgDraw(); return; }
        fg.x += lane.v;
        if(fg.x < -FG_C / 2 || fg.x > FG_W - FG_C / 2) { fgDie(); fgDraw(); return; }
      } else if(lane.items.some(it => fg.x + 4 < it.x + it.w && fg.x + FG_C - 4 > it.x)){ fgDie(); fgDraw(); return; }
    }
    if(fg.time % 33 === 0) fgStatus();
    fgDraw();
  }
  function fgDraw(){
    const c = fg.ctx;
    for(let r = 0; r < FG_ROWS; r++){
      c.fillStyle = r === 0 ? '#14532d' : r <= 5 ? '#0b3d91' : r === 6 || r === 12 ? '#2d5a27' : '#20232e';
      c.fillRect(0, r * FG_C, FG_W, FG_C);
    }
    FG_HOMES.forEach((h, i) => { c.fillStyle = fg.homes[i] ? '#b8f36b' : '#0b3d91'; c.fillRect(h * FG_C, 2, FG_C, FG_C - 4); });
    fg.lanes.forEach(l => l.items.forEach(it => {
      c.fillStyle = l.col; c.fillRect(it.x, l.row * FG_C + 3, it.w, FG_C - 6);
      [it.x - l.period, it.x + l.period].forEach(x2 => { if(x2 < FG_W && x2 + it.w > 0) c.fillRect(x2, l.row * FG_C + 3, it.w, FG_C - 6); });
    }));
    c.font = '20px serif'; c.textBaseline = 'middle'; c.textAlign = 'center';
    c.fillText('🐸', fg.x + FG_C / 2, fg.row * FG_C + FG_C / 2 + 1);
    c.textAlign = 'start';
  }
  S.froggerStart = function(){
    const cv = $('fgCvs'); if(!cv) return;
    fg = { ctx: cv.getContext('2d'), score: 0, lives: 3, level: 1, homes: [false,false,false,false,false], over: false };
    fgLanes(); fgResetFrog(); fgStatus();
    bindKeys(e => { const m = ARROWS[e.key]; if(m){ S.frogMove(m[0], m[1]); e.preventDefault(); } });
    swipe(cv, S.frogMove);
    app.stInt(fgTick, 30);
    fgDraw();
  };

  // =====================================================================  ASTEROIDS
  let as = null;
  function asRock(x, y, size){
    const r = size === 3 ? 34 : size === 2 ? 20 : 10, a = Math.random() * 6.28, sp = (0.5 + Math.random() * 0.9) * (4 - size) * 0.6;
    const pts = []; for(let i = 0; i < 10; i++) pts.push(r * (0.75 + Math.random() * 0.4));
    return { x, y, r, size, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: Math.random() * 6, vr: (Math.random() - .5) * 0.04, pts };
  }
  function asWave(){
    as.rocks = [];
    for(let i = 0; i < 3 + as.wave; i++){
      let x, y; do { x = Math.random() * 360; y = Math.random() * 360; } while(Math.hypot(x - as.ship.x, y - as.ship.y) < 110);
      as.rocks.push(asRock(x, y, 3));
    }
  }
  function asShipReset(){ as.ship = { x:180, y:180, a:-Math.PI/2, vx:0, vy:0, inv:150 }; }
  function asStatus(){ say('asts', `Punkte: ${as.score} · Leben: ${'❤️'.repeat(Math.max(as.lives,0))} · Welle ${as.wave}`); }
  const wrap = o => { o.x = (o.x + 360) % 360; o.y = (o.y + 360) % 360; };
  function asTick(){
    if(!as || as.over) return;
    const s = as.ship, k = as.keys;
    if(k.left) s.a -= 0.075; if(k.right) s.a += 0.075;
    if(k.up){ s.vx += Math.cos(s.a) * 0.12; s.vy += Math.sin(s.a) * 0.12; }
    s.vx *= 0.995; s.vy *= 0.995; s.x += s.vx; s.y += s.vy; wrap(s);
    if(s.inv > 0) s.inv--;
    if(as.cool > 0) as.cool--;
    if(k.fire && as.cool <= 0 && as.bul.length < 6){
      as.bul.push({ x: s.x + Math.cos(s.a) * 12, y: s.y + Math.sin(s.a) * 12, vx: Math.cos(s.a) * 6 + s.vx, vy: Math.sin(s.a) * 6 + s.vy, life: 55 });
      as.cool = 10;
    }
    as.bul.forEach(b => { b.x += b.vx; b.y += b.vy; wrap(b); b.life--; });
    as.bul = as.bul.filter(b => b.life > 0);
    as.rocks.forEach(r => { r.x += r.vx; r.y += r.vy; r.rot += r.vr; wrap(r); });
    // Treffer Schuss -> Fels
    for(const b of as.bul.slice()){
      const i = as.rocks.findIndex(r => Math.hypot(r.x - b.x, r.y - b.y) < r.r);
      if(i >= 0){
        const r = as.rocks[i]; as.rocks.splice(i, 1); b.life = 0;
        as.score += r.size === 3 ? 20 : r.size === 2 ? 50 : 100;
        if(r.size > 1){ as.rocks.push(asRock(r.x, r.y, r.size - 1), asRock(r.x, r.y, r.size - 1)); }
        asStatus();
      }
    }
    as.bul = as.bul.filter(b => b.life > 0);
    // Treffer Schiff
    if(s.inv <= 0 && as.rocks.some(r => Math.hypot(r.x - s.x, r.y - s.y) < r.r + 7)){
      as.lives--;
      if(as.lives <= 0){
        as.over = true; say('asts', `Game Over! Punkte: ${as.score}`);
        app.submitScore('asteroids', as.score);
        if(as.score >= 1000) app.offerCompletionBonus('Asteroids Runde beendet (' + as.score + ' Pkt)');
      } else { asShipReset(); asStatus(); }
    }
    if(as.rocks.length === 0 && !as.over){
      as.score += 100; as.wave++; asWave(); asStatus();
      app.submitScore('asteroids', as.score);
      app.offerCompletionBonus('Asteroids: Welle ' + (as.wave - 1) + ' geschafft');
    }
    asDraw();
  }
  function asDraw(){
    const c = as.ctx, s = as.ship;
    c.fillStyle = '#05060f'; c.fillRect(0, 0, 360, 360);
    c.strokeStyle = '#e8ecff'; c.lineWidth = 1.5;
    as.rocks.forEach(r => {
      c.beginPath();
      r.pts.forEach((p, i) => { const a = r.rot + i / r.pts.length * 6.283; const x = r.x + Math.cos(a) * p, y = r.y + Math.sin(a) * p; i ? c.lineTo(x, y) : c.moveTo(x, y); });
      c.closePath(); c.stroke();
    });
    if(!as.over && (s.inv <= 0 || Math.floor(s.inv / 6) % 2 === 0)){
      c.strokeStyle = '#66e3ff';
      c.beginPath();
      c.moveTo(s.x + Math.cos(s.a) * 12, s.y + Math.sin(s.a) * 12);
      c.lineTo(s.x + Math.cos(s.a + 2.5) * 10, s.y + Math.sin(s.a + 2.5) * 10);
      c.lineTo(s.x + Math.cos(s.a + Math.PI) * 4, s.y + Math.sin(s.a + Math.PI) * 4);
      c.lineTo(s.x + Math.cos(s.a - 2.5) * 10, s.y + Math.sin(s.a - 2.5) * 10);
      c.closePath(); c.stroke();
      if(as.keys.up){ c.strokeStyle = '#ffb347'; c.beginPath(); c.moveTo(s.x + Math.cos(s.a + Math.PI) * 5, s.y + Math.sin(s.a + Math.PI) * 5); c.lineTo(s.x + Math.cos(s.a + Math.PI) * 14, s.y + Math.sin(s.a + Math.PI) * 14); c.stroke(); }
    }
    c.fillStyle = '#ffd36b';
    as.bul.forEach(b => c.fillRect(b.x - 1.5, b.y - 1.5, 3, 3));
  }
  S.astKey = (name, v) => { if(as) as.keys[name] = v; };
  S.asteroidsStart = function(){
    const cv = $('astCvs'); if(!cv) return;
    as = { ctx: cv.getContext('2d'), score: 0, lives: 3, wave: 1, over: false, bul: [], cool: 0, keys: {left:false, right:false, up:false, fire:false} };
    asShipReset(); asWave(); asStatus();
    const map = { ArrowLeft:'left', a:'left', A:'left', ArrowRight:'right', d:'right', D:'right', ArrowUp:'up', w:'up', W:'up', ' ':'fire' };
    bindKeys(e => { const n = map[e.key]; if(n){ as.keys[n] = true; e.preventDefault(); } },
             e => { const n = map[e.key]; if(n) as.keys[n] = false; });
    app.stInt(asTick, 16);
    asDraw();
  };
})();
