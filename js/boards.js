/* PLAYVERSE – Online-Brettspiele: Mensch ärgere dich nicht (2–4 Spieler) und Mühle (2 Spieler)
   Eingehängt in das bestehende Raumsystem von multi.js (Firebase: playverseRooms/<Code>). */
window.boards = (function(){
  const B = {};
  const NS = 'http://www.w3.org/2000/svg';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nameOf = (d, p) => (d.players && d.players[p]) || p;

  // ==================================================================  MENSCH ÄRGERE DICH NICHT
  const L_RING = [[0,4],[1,4],[2,4],[3,4],[4,4],[4,3],[4,2],[4,1],[4,0],[5,0],[6,0],[6,1],[6,2],[6,3],[6,4],[7,4],[8,4],[9,4],[10,4],[10,5],
                  [10,6],[9,6],[8,6],[7,6],[6,6],[6,7],[6,8],[6,9],[6,10],[5,10],[4,10],[4,9],[4,8],[4,7],[4,6],[3,6],[2,6],[1,6],[0,6],[0,5]];
  const L_GOAL = { p1:[[1,5],[2,5],[3,5],[4,5]], p2:[[5,1],[5,2],[5,3],[5,4]], p3:[[9,5],[8,5],[7,5],[6,5]], p4:[[5,9],[5,8],[5,7],[5,6]] };
  const L_BASE = { p1:[[1,1],[2,1],[1,2],[2,2]], p2:[[8,1],[9,1],[8,2],[9,2]], p3:[[8,8],[9,8],[8,9],[9,9]], p4:[[1,8],[2,8],[1,9],[2,9]] };
  const L_START = { p1:0, p2:10, p3:20, p4:30 };
  const L_COL = { p1:'#ef4444', p2:'#3b82f6', p3:'#22c55e', p4:'#eab308' };
  const L_NAME = { p1:'Rot', p2:'Blau', p3:'Grün', p4:'Gelb' };
  const lAbs = (p, prog) => (L_START[p] + prog) % 40;

  // Figur-Fortschritt: -1 = im Haus, 0..39 = Ring ab eigenem Startfeld, 40..43 = Zielfelder
  function lMoves(d, p, roll){
    const pos = d.pos[p], out = [];
    const hasBase = pos.includes(-1), ownOnStart = pos.includes(0);
    pos.forEach((pr, i) => {
      if(pr === -1){ if(roll === 6 && !ownOnStart) out.push({ i, np: 0 }); }
      else { const np = pr + roll; if(np <= 43 && !pos.some((x, j) => j !== i && x === np)) out.push({ i, np }); }
    });
    if(roll === 6 && hasBase && !ownOnStart) return out.filter(m => pos[m.i] === -1);   // Pflicht: aus dem Haus
    if(hasBase && ownOnStart){ const c = out.filter(m => pos[m.i] === 0); if(c.length) return c; }   // Startfeld räumen
    return out;
  }
  function lApply(d, p, m){
    d.pos[p][m.i] = m.np;
    if(m.np <= 39){
      const a = lAbs(p, m.np);
      Object.keys(d.pos).forEach(q => {
        if(q === p) return;
        d.pos[q].forEach((x, j) => { if(x >= 0 && x <= 39 && lAbs(q, x) === a) d.pos[q][j] = -1; });
      });
    }
  }
  const lNext = (d, p) => { const o = d.order || []; return o[(o.indexOf(p) + 1) % o.length]; };

  B.ludo = {
    resetStatus: 'Warte auf Mitspieler (2–4) – der Host startet das Spiel',
    init(){ return { started:false, turn:'p1', roll:0, tries:0, last:0, lastp:'', order:[], pos:{ p1:[-1,-1,-1,-1], p2:[-1,-1,-1,-1], p3:[-1,-1,-1,-1], p4:[-1,-1,-1,-1] } }; },
    canJoin(d){ return d.started ? 'Das Spiel läuft bereits.' : null; },
    render(d, M, og){
      const me = M.player, players = d.players || {}, keys = Object.keys(players).sort();
      const myTurn = d.started && d.turn === me;
      const legal = (myTurn && d.roll) ? lMoves(d, me, d.roll) : [];
      const S = 32, svg = [`<svg viewBox="0 0 ${11*S} ${11*S}" style="width:100%;max-width:440px;background:#0f1530;border-radius:14px;touch-action:manipulation">`];
      const cx = c => c * S + S / 2;
      L_RING.forEach(([x, y], i) => {
        const sp = Object.keys(L_START).find(p => L_START[p] === i);
        svg.push(`<circle cx="${cx(x)}" cy="${cx(y)}" r="12" fill="${sp ? L_COL[sp] + '55' : '#1c2542'}" stroke="${sp ? L_COL[sp] : '#33406b'}" stroke-width="1.5"/>`);
      });
      Object.keys(L_GOAL).forEach(p => L_GOAL[p].forEach(([x, y]) => svg.push(`<circle cx="${cx(x)}" cy="${cx(y)}" r="10" fill="${L_COL[p]}33" stroke="${L_COL[p]}" stroke-width="1.5"/>`)));
      Object.keys(L_BASE).forEach(p => L_BASE[p].forEach(([x, y]) => svg.push(`<circle cx="${cx(x)}" cy="${cx(y)}" r="12" fill="${players[p] ? L_COL[p] + '22' : '#141a33'}" stroke="${L_COL[p]}55" stroke-width="1.5"/>`)));
      keys.forEach(p => {
        (d.pos[p] || []).forEach((pr, i) => {
          let xy = pr === -1 ? L_BASE[p][i] : pr <= 39 ? L_RING[lAbs(p, pr)] : L_GOAL[p][pr - 40];
          const can = legal.some(m => m.i === i);
          svg.push(`<g ${can ? `onclick="multi.po('b_move',${i})" style="cursor:pointer"` : ''}>` +
            `<circle cx="${cx(xy[0])}" cy="${cx(xy[1])}" r="${can ? 12 : 10}" fill="${L_COL[p]}" stroke="${can ? '#fff' : '#0a0d1e'}" stroke-width="${can ? 3 : 2}">${can ? '<animate attributeName="r" values="11;14;11" dur="0.9s" repeatCount="indefinite"/>' : ''}</circle>` +
            `<text x="${cx(xy[0])}" y="${cx(xy[1]) + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#0a0d1e" pointer-events="none">${i + 1}</text></g>`);
        });
      });
      svg.push('</svg>');
      let ctl = '';
      if(!d.started){
        ctl = (me === 'p1')
          ? (keys.length >= 2 ? `<button class="btn primary" onclick="multi.po('b_start')">▶ Spiel starten (${keys.length} Spieler)</button>` : `<div class="muted">Warte auf mindestens einen Mitspieler … Code: <b>${esc(M.roomCode)}</b></div>`)
          : `<div class="muted">Warte, bis der Host das Spiel startet …</div>`;
      } else if(myTurn && !d.roll){
        ctl = `<button class="btn primary" style="font-size:18px;padding:12px 22px" onclick="multi.po('b_roll')">🎲 Würfeln</button>`;
      } else if(myTurn){
        ctl = `<div style="font-size:15px">Du hast eine <b style="font-size:22px">${d.roll}</b> gewürfelt – ${legal.length ? 'klicke eine leuchtende Figur.' : 'kein Zug möglich …'}</div>`;
      } else {
        ctl = `<div class="muted"><b style="color:${L_COL[d.turn] || '#fff'}">${esc(nameOf(d, d.turn))}</b> ist dran${d.last ? ` · zuletzt gewürfelt: ${d.last}` : ''}</div>`;
      }
      const legend = keys.map(p => `<span style="display:inline-flex;align-items:center;gap:5px;margin:3px 8px 3px 0;${d.turn === p && d.started ? 'font-weight:800' : 'opacity:.85'}"><i style="width:12px;height:12px;border-radius:50%;background:${L_COL[p]};display:inline-block"></i>${esc(players[p])}${p === me ? ' (du)' : ''}</span>`).join('');
      og.innerHTML = `<div style="text-align:center"><div style="margin-bottom:8px">${legend}</div>${svg.join('')}<div style="margin-top:12px;min-height:44px">${ctl}</div></div>`;
      const rs = document.getElementById('rstatus');
      if(rs && !/gewinnt/.test(d.status || '')) rs.textContent = d.status || '';
    },
    act(act, val, M, d){
      const me = M.player;
      if(act === 'b_start'){
        if(me !== 'p1' || d.started) return;
        const order = ['p1','p2','p3','p4'].filter(p => d.players && d.players[p]);
        if(order.length < 2) return;
        return M.roomRef.update({ started:true, order, turn:order[0], roll:0, tries:0, last:0, status:`${nameOf(d, order[0])} beginnt – würfeln!` });
      }
      if(!d.started || d.turn !== me) return;
      if(act === 'b_roll'){
        if(d.roll) return;
        const r = 1 + Math.floor(Math.random() * 6), mv = lMoves(d, me, r);
        if(mv.length) return M.roomRef.update({ roll:r, last:r, lastp:me, status:`${nameOf(d, me)} würfelt ${r} – Figur wählen` });
        const onlyHome = d.pos[me].every(x => x === -1 || x >= 40);
        if(onlyHome && (d.tries || 0) < 2) return M.roomRef.update({ roll:0, tries:(d.tries || 0) + 1, last:r, lastp:me, status:`${nameOf(d, me)} würfelt ${r} – nochmal versuchen (${(d.tries || 0) + 2}/3)` });
        const nx = lNext(d, me);
        return M.roomRef.update({ roll:0, tries:0, last:r, lastp:me, turn:nx, status:`${nameOf(d, me)} würfelt ${r} – kein Zug. ${nameOf(d, nx)} ist dran` });
      }
      if(act === 'b_move'){
        if(!d.roll) return;
        const m = lMoves(d, me, d.roll).find(x => x.i === val);
        if(!m) return;
        const n = { pos: JSON.parse(JSON.stringify(d.pos)) };
        lApply(n, me, m);
        if(n.pos[me].every(x => x >= 40)) return M.roomRef.update({ pos:n.pos, roll:0, tries:0, status:`${nameOf(d, me)} gewinnt!` });
        const again = d.roll === 6, nx = again ? me : lNext(d, me);
        return M.roomRef.update({ pos:n.pos, roll:0, tries:0, turn:nx, status: again ? `${nameOf(d, me)} darf nochmal würfeln (6!)` : `${nameOf(d, nx)} ist dran – würfeln` });
      }
    }
  };

  // ==================================================================  MÜHLE
  const MU_ADJ = (() => {
    const a = Array.from({ length: 24 }, () => []);
    const link = (i, j) => { a[i].push(j); a[j].push(i); };
    for(let r = 0; r < 3; r++) for(let k = 0; k < 8; k++){
      const i = r * 8 + k; link(i, r * 8 + (k + 1) % 8);
      if(k % 2 === 1 && r < 2) link(i, i + 8);
    }
    return a;
  })();
  const MU_MILLS = (() => {
    const m = [];
    for(let r = 0; r < 3; r++){ const o = r * 8; m.push([o, o+1, o+2], [o+2, o+3, o+4], [o+4, o+5, o+6], [o+6, o+7, o]); }
    [1, 3, 5, 7].forEach(k => m.push([k, k + 8, k + 16]));
    return m;
  })();
  const MU_XY = (() => {
    const p = [];
    for(let r = 0; r < 3; r++){
      const a = r + 0, z = 6 - r;
      p.push([a, a], [3, a], [z, a], [z, 3], [z, z], [3, z], [a, z], [a, 3]);
    }
    return p;
  })();
  const muMill = (b, i, pl) => MU_MILLS.some(m => m.includes(i) && m.every(x => b[x] === pl));
  const muTotal = (b, placed, pl) => b.filter(x => x === pl).length + (9 - placed);
  function muHasMove(b, pl, placed){
    if(muTotal(b, placed, pl) === 3) return b.includes(0);
    return b.some((x, i) => x === pl && MU_ADJ[i].some(j => b[j] === 0));
  }
  // Reine Logik: liefert das Update oder null (ungültiger Zug)
  function muStep(d, who, i){
    if(d.turn !== who) return null;
    const pl = who === 'p1' ? 1 : 2, op = 3 - pl, nw = who === 'p1' ? 'p2' : 'p1';
    const b = d.b.slice(), u = { b, sel:-1, rem:false, turn:who, pl1:d.pl1 || 0, pl2:d.pl2 || 0, win:null };
    const placed = k => k === 1 ? u.pl1 : u.pl2;
    const endTurn = () => {
      if(muTotal(b, placed(op), op) < 3){ u.win = who; return; }
      u.turn = nw;
      if(placed(op) >= 9 && !muHasMove(b, op, placed(op))) u.win = who;   // Gegner blockiert
    };
    if(d.rem){
      if(b[i] !== op) return null;
      const allMills = b.every((x, k) => x !== op || muMill(b, k, op));
      if(!allMills && muMill(b, i, op)) return null;
      b[i] = 0; endTurn(); return u;
    }
    if(placed(pl) < 9){
      if(b[i] !== 0) return null;
      b[i] = pl; if(pl === 1) u.pl1++; else u.pl2++;
      if(muMill(b, i, pl)) u.rem = true; else endTurn();
      return u;
    }
    const fly = muTotal(b, placed(pl), pl) === 3;
    if(b[i] === pl){
      const ok = fly ? b.includes(0) : MU_ADJ[i].some(j => b[j] === 0);
      u.sel = (i === d.sel || !ok) ? -1 : i; return u;
    }
    if(d.sel < 0 || b[i] !== 0) return null;
    if(!fly && !MU_ADJ[d.sel].includes(i)) return null;
    b[d.sel] = 0; b[i] = pl;
    if(muMill(b, i, pl)) u.rem = true; else endTurn();
    return u;
  }

  B.muehle = {
    resetStatus: 'Warte auf Spieler 2',
    init(){ return { b:Array(24).fill(0), pl1:0, pl2:0, rem:false, sel:-1, turn:'p1' }; },
    render(d, M, og){
      const me = M.player === 'p1' ? 1 : 2, myTurn = d.turn === M.player && d.players && d.players.p2;
      const C = ['', '#66e3ff', '#ff6fa5'], U = 46, O = 22;
      const px = v => O + v * U;
      let g = `<svg viewBox="0 0 ${6*U+2*O} ${6*U+2*O}" style="width:100%;max-width:420px;background:#0f1530;border-radius:14px;touch-action:manipulation">`;
      g += '<g stroke="#4a5a96" stroke-width="2.5" fill="none">';
      [0, 1, 2].forEach(r => g += `<rect x="${px(r)}" y="${px(r)}" width="${(6 - 2*r)*U}" height="${(6 - 2*r)*U}"/>`);
      g += `<path d="M${px(3)} ${px(0)}V${px(2)}M${px(3)} ${px(4)}V${px(6)}M${px(0)} ${px(3)}H${px(2)}M${px(4)} ${px(3)}H${px(6)}"/></g>`;
      d.b.forEach((v, i) => {
        const [x, y] = MU_XY[i];
        const canRem = d.rem && myTurn && v === 3 - me;
        const sel = d.sel === i;
        g += `<g onclick="multi.po('b_mu',${i})" style="cursor:pointer">` +
          `<circle cx="${px(x)}" cy="${px(y)}" r="16" fill="transparent"/>` +
          (v ? `<circle cx="${px(x)}" cy="${px(y)}" r="13" fill="${C[v]}" stroke="${sel ? '#fff' : canRem ? '#ff3b3b' : '#0a0d1e'}" stroke-width="${sel || canRem ? 4 : 2}"/>`
             : `<circle cx="${px(x)}" cy="${px(y)}" r="5.5" fill="#4a5a96"/>`) + '</g>';
      });
      g += '</svg>';
      const left1 = 9 - (d.pl1 || 0), left2 = 9 - (d.pl2 || 0);
      const info = `<div style="margin-bottom:8px"><span style="color:${C[1]}">● ${esc(nameOf(d, 'p1'))}</span> (zu setzen: ${left1}) &nbsp;vs&nbsp; <span style="color:${C[2]}">● ${esc(nameOf(d, 'p2'))}</span> (zu setzen: ${left2})</div>`;
      og.innerHTML = `<div style="text-align:center">${info}${g}<div class="muted" style="margin-top:10px;font-size:13px">Du spielst ${me === 1 ? '<b style="color:#66e3ff">Türkis</b>' : '<b style="color:#ff6fa5">Pink</b>'}. Drei in einer Reihe = Mühle → gegnerischen Stein entfernen. Mit nur 3 Steinen darfst du springen.</div></div>`;
      const rs = document.getElementById('rstatus');
      if(rs && !/gewinnt/.test(d.status || '')) rs.textContent = d.status || '';
    },
    act(act, val, M, d){
      const u = muStep(d, M.player, val);
      if(!u) return;
      const phase = who => (who === 'p1' ? u.pl1 : u.pl2) < 9 ? 'setzt' : 'zieht';
      const st = u.win ? `${nameOf(d, u.win)} gewinnt!`
        : u.rem ? `${nameOf(d, u.turn)} hat eine Mühle – Stein entfernen!`
        : `${nameOf(d, u.turn)} ${phase(u.turn)}`;
      return M.roomRef.update({ b:u.b, sel:u.sel, rem:u.rem, turn:u.turn, pl1:u.pl1, pl2:u.pl2, status:st });
    }
  };

  // ==================================================================  SNAKE-BATTLE (Echtzeit, 2 Spieler)
  // Der Host (p1) simuliert das Spiel und schreibt den Zustand ~7x pro Sekunde nach Firebase (d.sn).
  // Spieler 2 schickt nur seine Richtung (d.in2). Beide zeichnen den Zustand auf ein Canvas.
  const SNK_N = 24, SNK_C = 16;
  const SNK_V = { U:[0,-1], D:[0,1], L:[-1,0], R:[1,0] }, SNK_OPP = { U:'D', D:'U', L:'R', R:'L' };
  const snk = { timer: null, st: null, dir1: 'R', sent: '', keysOn: false, drawT: 0 };
  function snkFood(st){
    const taken = new Set([...st.a, ...st.b, ...st.f].map(c => c[0] + ',' + c[1]));
    for(let i = 0; i < 200; i++){
      const x = Math.floor(Math.random() * SNK_N), y = Math.floor(Math.random() * SNK_N);
      if(!taken.has(x + ',' + y)) return [x, y];
    }
    return null;
  }
  function snkNew(){
    const st = { a: [[5,12],[4,12],[3,12]], b: [[18,12],[19,12],[20,12]], da: 'R', db: 'L', f: [], ov: 0, t: 0 };
    for(let i = 0; i < 3; i++){ const f = snkFood(st); if(f) st.f.push(f); }
    return st;
  }
  // Ein Spielschritt (rein, testbar). ov: 0 läuft, 1 = Spieler 1 gewinnt, 2 = Spieler 2 gewinnt, 3 = Unentschieden
  function snkStep(st, dirA, dirB){
    if(dirA && dirA !== SNK_OPP[st.da]) st.da = dirA;
    if(dirB && dirB !== SNK_OPP[st.db]) st.db = dirB;
    const ha = [st.a[0][0] + SNK_V[st.da][0], st.a[0][1] + SNK_V[st.da][1]];
    const hb = [st.b[0][0] + SNK_V[st.db][0], st.b[0][1] + SNK_V[st.db][1]];
    const eq = (p, q) => p[0] === q[0] && p[1] === q[1];
    const fa = st.f.findIndex(f => eq(f, ha)), fb = st.f.findIndex(f => eq(f, hb));
    const bodyA = fa >= 0 ? st.a : st.a.slice(0, -1), bodyB = fb >= 0 ? st.b : st.b.slice(0, -1);
    const oob = h => h[0] < 0 || h[1] < 0 || h[0] >= SNK_N || h[1] >= SNK_N;
    const deadA = oob(ha) || bodyA.some(c => eq(c, ha)) || bodyB.some(c => eq(c, ha)) || eq(ha, hb);
    const deadB = oob(hb) || bodyA.some(c => eq(c, hb)) || bodyB.some(c => eq(c, hb)) || eq(ha, hb);
    if(deadA || deadB){ st.ov = deadA && deadB ? 3 : deadA ? 2 : 1; return st; }
    st.a.unshift(ha); if(fa < 0) st.a.pop();
    st.b.unshift(hb); if(fb < 0) st.b.pop();
    [fa, fb].filter(i => i >= 0).sort((x, y) => y - x).forEach((i, n, arr) => { if(n === 0 || i !== arr[n - 1]) st.f.splice(i, 1); });
    while(st.f.length < 3){ const f = snkFood(st); if(!f) break; st.f.push(f); }
    st.t++;
    return st;
  }
  function snkStop(){ if(snk.timer){ clearInterval(snk.timer); snk.timer = null; } }
  function snkHostStart(M){
    if(snk.timer) return;
    snk.timer = setInterval(() => {
      const d = window.td, cv = document.getElementById('snkCvs');
      if(!cv || !d || !d.started || !snk.st || snk.st.ov){ snkStop(); return; }
      snkStep(snk.st, snk.dir1, d.in2);
      const st = snk.st, nm = p => nameOf(d, p);
      let status = 'Runde läuft';
      if(st.ov === 1) status = `${nm('p1')} gewinnt!`;
      else if(st.ov === 2) status = `${nm('p2')} gewinnt!`;
      else if(st.ov === 3) status = 'Unentschieden – gleich geht es weiter';
      M.roomRef.update({ sn: JSON.parse(JSON.stringify(st)), status });
      if(st.ov){
        snkStop();
        if(st.ov === 3) setTimeout(() => { if(document.getElementById('snkCvs') && window.td && window.td.started) B.snakebattle.begin(M); }, 3000);
      }
    }, 150);
  }
  B.snkDir = function(dir){
    const M = window.multi, d = window.td;
    if(!M || !d || !d.started || !SNK_V[dir]) return;
    if(M.player === 'p1'){ snk.dir1 = dir; }
    else if(M.player === 'p2' && snk.sent !== dir){ snk.sent = dir; M.roomRef.update({ in2: dir }); }
  };
  function snkDraw(cv, d, M){
    const c = cv.getContext('2d'), S = SNK_C, st = d.sn;
    c.fillStyle = '#05060f'; c.fillRect(0, 0, SNK_N * S, SNK_N * S);
    c.strokeStyle = '#0f1736'; c.lineWidth = 1;
    for(let i = 0; i <= SNK_N; i++){ c.beginPath(); c.moveTo(i * S, 0); c.lineTo(i * S, SNK_N * S); c.moveTo(0, i * S); c.lineTo(SNK_N * S, i * S); c.stroke(); }
    if(st){
      c.fillStyle = '#ffd36b'; (st.f || []).forEach(f => { c.beginPath(); c.arc(f[0] * S + S / 2, f[1] * S + S / 2, S / 3, 0, 7); c.fill(); });
      [[st.a, '#66e3ff', '#b8f4ff', 1], [st.b, '#ff6fa5', '#ffc2d9', 2]].forEach(([arr, col, head, id]) => {
        (arr || []).forEach((p, i) => { c.fillStyle = i === 0 ? head : col; c.globalAlpha = (st.ov && st.ov !== 3 && st.ov === (id === 1 ? 2 : 1)) ? 0.35 : 1; c.fillRect(p[0] * S + 1, p[1] * S + 1, S - 2, S - 2); });
      });
      c.globalAlpha = 1;
    }
    if(!d.started || (st && st.ov)){
      c.fillStyle = '#05060fcc'; c.fillRect(0, SNK_N * S / 2 - 26, SNK_N * S, 52);
      c.fillStyle = '#fff'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center';
      c.fillText(!d.started ? 'Bereit?' : (d.status || ''), SNK_N * S / 2, SNK_N * S / 2 + 6); c.textAlign = 'start';
    }
  }
  B.snakebattle = {
    resetStatus: 'Warte auf Spieler 2 …',
    init(){ return { started: false, turn: 'p1', sn: null, in2: 'L' }; },
    begin(M){
      const st = snkNew(); snk.dir1 = 'R'; snk.sent = '';
      return M.roomRef.update({ started: true, sn: st, in2: 'L', status: 'Runde läuft' });
    },
    render(d, M, og){
      let cv = document.getElementById('snkCvs');
      if(!cv){
        og.innerHTML = `<div style="text-align:center"><div id="snkInfo" style="margin-bottom:8px"></div>
          <canvas id="snkCvs" width="${SNK_N * SNK_C}" height="${SNK_N * SNK_C}" style="max-width:100%;border-radius:12px;border:1px solid #2a3560"></canvas>
          <div class="dpad" style="margin-top:8px">
            <div></div><button type="button" onpointerdown="boards.snkDir('U')">⬆️</button><div></div>
            <button type="button" onpointerdown="boards.snkDir('L')">⬅️</button>
            <button type="button" onpointerdown="boards.snkDir('D')">⬇️</button>
            <button type="button" onpointerdown="boards.snkDir('R')">➡️</button>
          </div>
          <div id="snkCtl" style="margin-top:10px;min-height:40px"></div>
          <div class="muted" style="font-size:12px;margin-top:6px">Pfeiltasten/WASD oder Steuerkreuz. Wer gegen Wand oder Schlange fährt, verliert.</div></div>`;
        cv = document.getElementById('snkCvs');
      }
      snk.M = M;
      if(d.sn && d.sn.t === 0) snk.sent = '';
      if(!snk.keysOn){
        snk.keysOn = true;
        const map = { ArrowUp:'U', w:'U', W:'U', ArrowDown:'D', s:'D', S:'D', ArrowLeft:'L', a:'L', A:'L', ArrowRight:'R', d:'R', D:'R' };
        const h = e => {
          if(!document.getElementById('snkCvs')){ document.removeEventListener('keydown', h); snk.keysOn = false; return; }
          const dir = map[e.key]; if(dir){ B.snkDir(dir); e.preventDefault(); }
        };
        document.addEventListener('keydown', h);
      }
      // Host-Simulation starten/fortsetzen oder beenden
      if(M.player === 'p1' && d.started && d.sn && !d.sn.ov){
        if(!snk.timer){ snk.st = JSON.parse(JSON.stringify(d.sn)); snk.dir1 = snk.st.da || 'R'; snkHostStart(M); }
      } else if(snk.timer){ snkStop(); }
      const p1 = nameOf(d, 'p1'), p2 = d.players && d.players.p2 ? nameOf(d, 'p2') : '…';
      const len = (a) => (d.sn && d.sn[a]) ? d.sn[a].length : 3;
      const inf = document.getElementById('snkInfo');
      if(inf) inf.innerHTML = `<span style="color:#66e3ff">● ${esc(p1)} (${len('a')})</span> &nbsp;vs&nbsp; <span style="color:#ff6fa5">● ${esc(p2)} (${len('b')})</span>` +
        ` &nbsp;·&nbsp; Du bist <b style="color:${M.player === 'p1' ? '#66e3ff' : '#ff6fa5'}">${M.player === 'p1' ? 'Türkis' : 'Pink'}</b>`;
      const ctl = document.getElementById('snkCtl');
      if(ctl){
        const running = d.started && d.sn && !d.sn.ov;
        ctl.innerHTML = running ? '' : (M.player === 'p1'
          ? (d.players && d.players.p2 ? `<button class="btn primary" onclick="multi.po('b_snk_start')">▶ ${d.sn ? 'Neue Runde' : 'Runde starten'}</button>` : `<div class="muted">Warte auf Spieler 2 … Code: <b>${esc(M.roomCode)}</b></div>`)
          : `<div class="muted">Warte, bis der Host die Runde startet …</div>`);
      }
      snkDraw(cv, d, M);
      const rs = document.getElementById('rstatus');
      if(rs && !/gewinnt/.test(d.status || '')) rs.textContent = d.status || '';
    },
    act(act, val, M, d){
      if(act === 'b_snk_start'){
        if(M.player !== 'p1' || !(d.players && d.players.p2)) return;
        if(d.started && d.sn && !d.sn.ov) return;
        snkStop(); return B.snakebattle.begin(M);
      }
    }
  };

  // Einstieg aus multi.po(): act-Namen beginnen mit "b_"
  B.act = function(act, val, M, d){
    const g = B[d.game];
    if(g && g.act) return g.act(act, val, M, d);
  };
  B._test = { snkStep, snkNew, lMoves, lApply, lNext, muStep, MU_ADJ, MU_MILLS, MU_XY, L_RING, L_GOAL, L_BASE };
  return B;
})();
