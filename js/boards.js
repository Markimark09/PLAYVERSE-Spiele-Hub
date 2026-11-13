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

  // Einstieg aus multi.po(): act-Namen beginnen mit "b_"
  B.act = function(act, val, M, d){
    const g = B[d.game];
    if(g && g.act) return g.act(act, val, M, d);
  };
  B._test = { lMoves, lApply, lNext, muStep, MU_ADJ, MU_MILLS, MU_XY, L_RING, L_GOAL, L_BASE };
  return B;
})();
