/* PLAYVERSE – Paket 5: weitere Online-Brettspiele
   Dame (2), Reversi (2), Käsekästchen (2), Zeichnen-Duell (2–6, Echtzeit).
   Hängt sich in window.boards (boards.js) und damit in das bestehende Raumsystem ein. */
(function(){
  const B = window.boards;
  if(!B) return;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nameOf = (d, p) => (d.players && d.players[p]) || p;
  const hasP2 = d => !!(d.players && d.players.p2);
  const C1 = '#66e3ff', C2 = '#ff6fa5';
  const ins = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  function rsStatus(){ const rs = $('rstatus'); return rs; }

  // ==================================================================  DAME
  // Vereinfachte Regeln: Männer ziehen 1 Feld diagonal vorwärts und schlagen in alle Richtungen;
  // Damen („Könige“) ziehen/schlagen beliebig weit. Schlagzwang, Mehrfachsprünge müssen fortgesetzt werden.
  const D_DIRS = [[-1,-1],[-1,1],[1,-1],[1,1]];
  const dOwn = v => v === 1 || v === 3 ? 'p1' : v === 2 || v === 4 ? 'p2' : '';
  const dKing = v => v === 3 || v === 4;
  function dCaps(b, who, i){
    const v = b[i], k = dKing(v), r = (i / 8) | 0, c = i % 8, opp = who === 'p1' ? 'p2' : 'p1', res = [];
    D_DIRS.forEach(([dr, dc]) => {
      if(!k){
        const r1 = r + dr, c1 = c + dc, r2 = r + 2 * dr, c2 = c + 2 * dc;
        if(ins(r2, c2) && dOwn(b[r1 * 8 + c1]) === opp && b[r2 * 8 + c2] === 0) res.push({ from: i, to: r2 * 8 + c2, cap: r1 * 8 + c1 });
      } else {
        let rr = r + dr, cc = c + dc;
        while(ins(rr, cc) && b[rr * 8 + cc] === 0){ rr += dr; cc += dc; }
        if(ins(rr, cc) && dOwn(b[rr * 8 + cc]) === opp){
          const cap = rr * 8 + cc; let lr = rr + dr, lc = cc + dc;
          while(ins(lr, lc) && b[lr * 8 + lc] === 0){ res.push({ from: i, to: lr * 8 + lc, cap }); lr += dr; lc += dc; }
        }
      }
    });
    return res;
  }
  function dSimple(b, who, i){
    const v = b[i], k = dKing(v), r = (i / 8) | 0, c = i % 8, res = [], fw = who === 'p1' ? -1 : 1;
    if(!k){ [-1, 1].forEach(dc => { if(ins(r + fw, c + dc) && b[(r + fw) * 8 + c + dc] === 0) res.push({ from: i, to: (r + fw) * 8 + c + dc }); }); return res; }
    D_DIRS.forEach(([dr, dc]) => { let rr = r + dr, cc = c + dc; while(ins(rr, cc) && b[rr * 8 + cc] === 0){ res.push({ from: i, to: rr * 8 + cc }); rr += dr; cc += dc; } });
    return res;
  }
  function dLegal(b, who, force){
    const caps = [], sim = [];
    for(let i = 0; i < 64; i++){
      if(dOwn(b[i]) !== who || (force >= 0 && i !== force)) continue;
      caps.push(...dCaps(b, who, i));
      if(force < 0) sim.push(...dSimple(b, who, i));
    }
    return caps.length ? caps : sim;
  }
  function dameInit(){
    const b = Array(64).fill(0);
    for(let r = 0; r < 8; r++) for(let c = 0; c < 8; c++) if((r + c) % 2 === 1){ if(r < 3) b[r * 8 + c] = 2; else if(r > 4) b[r * 8 + c] = 1; }
    return { b, turn: 'p1', sel: -1, mv: -1 };
  }
  function dameStep(d, who, i){
    if(d.turn !== who || !(i >= 0 && i < 64)) return null;
    const b = d.b.slice(), force = d.mv >= 0 ? d.mv : -1, lm = dLegal(b, who, force), opp = who === 'p1' ? 'p2' : 'p1';
    const u = { b, turn: who, sel: -1, mv: -1, win: null };
    if(dOwn(b[i]) === who){
      if(force >= 0){ if(i !== force) return null; u.sel = force; u.mv = force; return u; }
      if(!lm.some(m => m.from === i)) return null;
      u.sel = (i === d.sel) ? -1 : i; return u;
    }
    const from = force >= 0 ? force : d.sel;
    if(from < 0 || b[i] !== 0) return null;
    const m = lm.find(x => x.from === from && x.to === i);
    if(!m) return null;
    let v = b[from]; b[from] = 0;
    if(m.cap !== undefined) b[m.cap] = 0;
    let crowned = false;
    if(v === 1 && i < 8){ v = 3; crowned = true; } else if(v === 2 && i >= 56){ v = 4; crowned = true; }
    b[i] = v;
    if(m.cap !== undefined && !crowned && dCaps(b, who, i).length){ u.mv = i; u.sel = i; return u; }   // Mehrfachsprung
    u.turn = opp;
    if(!b.some(x => dOwn(x) === opp) || dLegal(b, opp, -1).length === 0) u.win = who;
    return u;
  }
  B.dame = {
    resetStatus: 'Warte auf Spieler 2 …',
    init: dameInit,
    render(d, M, og){
      const me = M.player, flip = me === 'p2', S = 46, myTurn = d.turn === me && hasP2(d) && !(rsStatus() && /gewinnt/.test(d.status || ''));
      const force = d.mv >= 0 ? d.mv : -1, lm = myTurn ? dLegal(d.b, me, force) : [];
      const movable = new Set(lm.map(m => m.from)), dests = new Set(lm.filter(m => m.from === (d.sel >= 0 ? d.sel : -9)).map(m => m.to));
      let g = `<svg viewBox="0 0 ${8 * S} ${8 * S}" style="width:100%;max-width:400px;border-radius:12px;touch-action:manipulation">`;
      for(let r = 0; r < 8; r++) for(let c = 0; c < 8; c++){
        const rr = flip ? 7 - r : r, cc = flip ? 7 - c : c, i = rr * 8 + cc, v = d.b[i], dark = (rr + cc) % 2 === 1;
        g += `<g onclick="multi.po('b_dame',${i})" style="cursor:pointer"><rect x="${c * S}" y="${r * S}" width="${S}" height="${S}" fill="${dark ? '#2a3560' : '#141a33'}"/>`;
        if(dests.has(i)) g += `<circle cx="${c * S + S / 2}" cy="${r * S + S / 2}" r="7" fill="#b8f36b"/>`;
        if(v){
          const col = dOwn(v) === 'p1' ? C1 : C2, ring = d.sel === i ? '#fff' : (movable.has(i) && d.sel < 0) ? '#ffd36b' : '#0a0d1e';
          g += `<circle cx="${c * S + S / 2}" cy="${r * S + S / 2}" r="${S / 2 - 6}" fill="${col}" stroke="${ring}" stroke-width="${ring === '#0a0d1e' ? 2 : 4}"/>` +
               (dKing(v) ? `<text x="${c * S + S / 2}" y="${r * S + S / 2 + 6}" text-anchor="middle" font-size="18" pointer-events="none">👑</text>` : '');
        }
        g += '</g>';
      }
      g += '</svg>';
      const n1 = d.b.filter(x => dOwn(x) === 'p1').length, n2 = d.b.filter(x => dOwn(x) === 'p2').length;
      og.innerHTML = `<div style="text-align:center"><div style="margin-bottom:8px"><span style="color:${C1}">● ${esc(nameOf(d, 'p1'))} (${n1})</span> &nbsp;vs&nbsp; <span style="color:${C2}">● ${esc(nameOf(d, 'p2'))} (${n2})</span></div>${g}
        <div class="muted" style="font-size:12px;margin-top:8px">Du spielst ${me === 'p1' ? `<b style="color:${C1}">Türkis</b> (unten)` : `<b style="color:${C2}">Pink</b> (unten)`}. Schlagen ist Pflicht, Mehrfachsprünge müssen fortgesetzt werden. Goldene Ringe = Steine mit Zug.</div></div>`;
      const rs = rsStatus(); if(rs && !/gewinnt/.test(d.status || '')) rs.textContent = d.status || '';
    },
    act(act, val, M, d){
      if(!hasP2(d)) return;
      const u = dameStep(d, M.player, val); if(!u) return;
      const nm = p => nameOf(d, p);
      const st = u.win ? `${nm(u.win)} gewinnt!` : u.mv >= 0 ? `${nm(u.turn)} muss weiterschlagen` : `${nm(u.turn)} ist dran`;
      return M.roomRef.update({ b: u.b, turn: u.turn, sel: u.sel, mv: u.mv, status: st });
    }
  };

  // ==================================================================  REVERSI
  const R_DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  function rFlips(b, i, pl){
    if(b[i] !== 0) return [];
    const op = 3 - pl, r = (i / 8) | 0, c = i % 8, out = [];
    R_DIRS.forEach(([dr, dc]) => {
      let rr = r + dr, cc = c + dc; const line = [];
      while(ins(rr, cc) && b[rr * 8 + cc] === op){ line.push(rr * 8 + cc); rr += dr; cc += dc; }
      if(line.length && ins(rr, cc) && b[rr * 8 + cc] === pl) out.push(...line);
    });
    return out;
  }
  function rMoves(b, pl){ const m = {}; for(let i = 0; i < 64; i++){ const f = rFlips(b, i, pl); if(f.length) m[i] = f; } return m; }
  function revInit(){ const b = Array(64).fill(0); b[27] = 2; b[36] = 2; b[28] = 1; b[35] = 1; return { b, turn: 'p1', ov: 0 }; }
  function revStep(d, who, i){
    const pl = who === 'p1' ? 1 : 2;
    if(d.turn !== who || d.ov || !(i >= 0 && i < 64)) return null;
    const b = d.b.slice(), f = rFlips(b, i, pl);
    if(!f.length) return null;
    b[i] = pl; f.forEach(k => { b[k] = pl; });
    const op = 3 - pl; let turn = who === 'p1' ? 'p2' : 'p1', pass = false, ov = 0;
    const c1 = b.filter(x => x === 1).length, c2 = b.filter(x => x === 2).length;
    if(!Object.keys(rMoves(b, op)).length){
      if(Object.keys(rMoves(b, pl)).length){ turn = who; pass = true; }
      else ov = c1 > c2 ? 1 : c2 > c1 ? 2 : 3;
    }
    return { b, turn, pass, ov, c1, c2 };
  }
  B.reversi = {
    resetStatus: 'Warte auf Spieler 2 …',
    init: revInit,
    render(d, M, og){
      const me = M.player, S = 44, over = d.ov, myTurn = d.turn === me && hasP2(d) && !over;
      const mv = myTurn ? rMoves(d.b, me === 'p1' ? 1 : 2) : {};
      let g = `<svg viewBox="0 0 ${8 * S} ${8 * S}" style="width:100%;max-width:400px;border-radius:12px;background:#0f6b3a;touch-action:manipulation">`;
      for(let r = 0; r < 8; r++) for(let c = 0; c < 8; c++){
        const i = r * 8 + c, v = d.b[i];
        g += `<g onclick="multi.po('b_rev',${i})" style="cursor:pointer"><rect x="${c * S}" y="${r * S}" width="${S}" height="${S}" fill="none" stroke="#0a4a28" stroke-width="1.5"/>`;
        if(v) g += `<circle cx="${c * S + S / 2}" cy="${r * S + S / 2}" r="${S / 2 - 5}" fill="${v === 1 ? C1 : C2}" stroke="#0a0d1e" stroke-width="2"/>`;
        else if(mv[i]) g += `<circle cx="${c * S + S / 2}" cy="${r * S + S / 2}" r="5" fill="#ffffff88"/>`;
        g += '</g>';
      }
      g += '</svg>';
      const c1 = d.b.filter(x => x === 1).length, c2 = d.b.filter(x => x === 2).length;
      const again = (over === 3 && me === 'p1') ? `<div style="margin-top:10px"><button class="btn primary" onclick="multi.po('b_rev_reset')">Neue Runde</button></div>` : '';
      og.innerHTML = `<div style="text-align:center"><div style="margin-bottom:8px"><span style="color:${C1}">● ${esc(nameOf(d, 'p1'))} (${c1})</span> &nbsp;vs&nbsp; <span style="color:${C2}">● ${esc(nameOf(d, 'p2'))} (${c2})</span></div>${g}${again}
        <div class="muted" style="font-size:12px;margin-top:8px">Du bist ${me === 'p1' ? `<b style="color:${C1}">Türkis</b>` : `<b style="color:${C2}">Pink</b>`}. Setze so, dass du gegnerische Steine einschließt – sie werden umgedreht. Weiße Punkte zeigen deine Züge.</div></div>`;
      const rs = rsStatus(); if(rs && !/gewinnt/.test(d.status || '')) rs.textContent = d.status || '';
    },
    act(act, val, M, d){
      if(!hasP2(d)) return;
      if(act === 'b_rev_reset'){ if(M.player === 'p1' && d.ov === 3) return M.roomRef.update(Object.assign(revInit(), { status: 'Neue Runde' })); return; }
      const u = revStep(d, M.player, val); if(!u) return;
      const nm = p => nameOf(d, p), sc = `(${u.c1} : ${u.c2})`;
      const st = u.ov === 1 ? `${nm('p1')} gewinnt! ${sc}` : u.ov === 2 ? `${nm('p2')} gewinnt! ${sc}` : u.ov === 3 ? `Unentschieden ${sc}`
        : u.pass ? `${nm(u.turn)} darf nochmal (Gegner hat keinen Zug) ${sc}` : `${nm(u.turn)} ist dran ${sc}`;
      return M.roomRef.update({ b: u.b, turn: u.turn, ov: u.ov, status: st });
    }
  };

  // ==================================================================  KÄSEKÄSTCHEN
  const DN = 5;                                 // 5×5 Kästchen, 6×6 Punkte
  function dotsInit(){ return { h: Array(DN * (DN + 1)).fill(0), v: Array(DN * (DN + 1)).fill(0), o: Array(DN * DN).fill(0), s1: 0, s2: 0, turn: 'p1' }; }
  function dotsStep(d, who, edge){
    if(d.turn !== who || typeof edge !== 'string') return null;
    const t = edge[0], idx = Number(edge.slice(1));
    if((t !== 'h' && t !== 'v') || !Number.isInteger(idx) || idx < 0 || idx >= DN * (DN + 1)) return null;
    const h = d.h.slice(), v = d.v.slice(), o = d.o.slice();
    if((t === 'h' ? h : v)[idx]) return null;
    (t === 'h' ? h : v)[idx] = 1;
    const pl = who === 'p1' ? 1 : 2;
    let cand;
    if(t === 'h'){ const r = (idx / DN) | 0, c = idx % DN; cand = [[r - 1, c], [r, c]]; }
    else { const r = (idx / (DN + 1)) | 0, c = idx % (DN + 1); cand = [[r, c - 1], [r, c]]; }
    let got = 0;
    cand.forEach(([r, c]) => {
      if(r < 0 || c < 0 || r >= DN || c >= DN || o[r * DN + c]) return;
      if(h[r * DN + c] && h[(r + 1) * DN + c] && v[r * (DN + 1) + c] && v[r * (DN + 1) + c + 1]){ o[r * DN + c] = pl; got++; }
    });
    const u = { h, v, o, s1: d.s1 + (pl === 1 ? got : 0), s2: d.s2 + (pl === 2 ? got : 0), turn: got ? who : (who === 'p1' ? 'p2' : 'p1'), win: null, got };
    if(o.every(x => x)) u.win = u.s1 > u.s2 ? 'p1' : 'p2';
    return u;
  }
  B.dots = {
    resetStatus: 'Warte auf Spieler 2 …',
    init: dotsInit,
    render(d, M, og){
      const me = M.player, S = 52, O = 24, W = DN * S + 2 * O, myTurn = d.turn === me && hasP2(d) && !/gewinnt/.test(d.status || '');
      let g = `<svg viewBox="0 0 ${W} ${W}" style="width:100%;max-width:400px;background:#0f1530;border-radius:12px;touch-action:manipulation">`;
      for(let r = 0; r < DN; r++) for(let c = 0; c < DN; c++){ const ow = d.o[r * DN + c]; if(ow) g += `<rect x="${O + c * S + 3}" y="${O + r * S + 3}" width="${S - 6}" height="${S - 6}" rx="6" fill="${ow === 1 ? C1 : C2}" opacity=".35"/><text x="${O + c * S + S / 2}" y="${O + r * S + S / 2 + 6}" text-anchor="middle" font-size="18" font-weight="800" fill="${ow === 1 ? C1 : C2}">${ow === 1 ? 'A' : 'B'}</text>`; }
      const edge = (t, idx, x1, y1, x2, y2) => {
        const on = (t === 'h' ? d.h : d.v)[idx];
        return `<g onclick="multi.po('b_dot','${t}${idx}')" style="cursor:pointer"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${on ? '#e8ecff' : (myTurn ? '#33406b' : '#222b50')}" stroke-width="${on ? 5 : 3}" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="22"/></g>`;
      };
      for(let r = 0; r <= DN; r++) for(let c = 0; c < DN; c++) g += edge('h', r * DN + c, O + c * S, O + r * S, O + (c + 1) * S, O + r * S);
      for(let r = 0; r < DN; r++) for(let c = 0; c <= DN; c++) g += edge('v', r * (DN + 1) + c, O + c * S, O + r * S, O + c * S, O + (r + 1) * S);
      for(let r = 0; r <= DN; r++) for(let c = 0; c <= DN; c++) g += `<circle cx="${O + c * S}" cy="${O + r * S}" r="4.5" fill="#aeb9e8"/>`;
      g += '</svg>';
      og.innerHTML = `<div style="text-align:center"><div style="margin-bottom:8px"><span style="color:${C1}">A ${esc(nameOf(d, 'p1'))}: ${d.s1}</span> &nbsp;vs&nbsp; <span style="color:${C2}">B ${esc(nameOf(d, 'p2'))}: ${d.s2}</span></div>${g}
        <div class="muted" style="font-size:12px;margin-top:8px">Du bist <b style="color:${me === 'p1' ? C1 : C2}">${me === 'p1' ? 'A (Türkis)' : 'B (Pink)'}</b>. Tippe auf eine Linie. Wer ein Kästchen schließt, bekommt es und darf nochmal.</div></div>`;
      const rs = rsStatus(); if(rs && !/gewinnt/.test(d.status || '')) rs.textContent = d.status || '';
    },
    act(act, val, M, d){
      if(!hasP2(d)) return;
      const u = dotsStep(d, M.player, val); if(!u) return;
      const nm = p => nameOf(d, p);
      const st = u.win ? `${nm(u.win)} gewinnt! (${u.s1} : ${u.s2})` : `${nm(u.turn)} ist dran${u.got ? ' (nochmal!)' : ''}`;
      return M.roomRef.update({ h: u.h, v: u.v, o: u.o, s1: u.s1, s2: u.s2, turn: u.turn, status: st });
    }
  };

  // ==================================================================  ZEICHNEN-DUELL (2–6 Spieler)
  // Der Host (p1) führt Runden, Wörter, Zeit und Punkte; die Zeichnung liegt strichweise unter dr/<id>, Tipps unter gs/<id>.
  const DG_DUR = 80, DG_PAUSE = 6000;
  const WORDS = ['Haus','Baum','Sonne','Mond','Auto','Fahrrad','Katze','Hund','Fisch','Vogel','Pizza','Banane','Apfel','Brille','Schere','Uhr','Telefon','Computer','Rakete','Schloss',
    'Drache','Pirat','Roboter','Gitarre','Klavier','Regenschirm','Schneemann','Weihnachtsbaum','Eiscreme','Burger','Kuchen','Herz','Stern','Blume','Berg','Brücke','Flugzeug','Schiff','Zug','Wolke',
    'Regenbogen','Vulkan','Insel','Palme','Krone','Schwert','Ritter','Geist','Kürbis','Hase','Pinguin','Elefant','Giraffe','Schlange','Spinne','Schmetterling','Biene','Krokodil','Delfin','Hai',
    'Zebra','Löwe','Affe','Tisch','Stuhl','Bett','Lampe','Fernseher','Kamera','Ballon','Geschenk','Zelt','Leuchtturm','Windmühle','Fußball','Schlüssel','Kerze','Leiter','Ei','Mütze'];
  const dgNorm = s => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]/g, '');
  const PAL = ['#111111', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#ffffff'], WID = [3, 7, 15];
  const dgDrawer = H => H.order[H.r % H.order.length];
  function dgShuffle(a, rng){ a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function dgHint(H){
    const rv = new Set(H.hx.slice(0, H.reveal || 0));
    return H.word.split('').map((ch, i) => rv.has(i) ? ch : '_').join(' ');
  }
  function dgBegin(H, now, rng){
    const pool = WORDS.filter(w => !H.used.includes(w)); const word = pool[Math.floor(rng() * pool.length)] || WORDS[Math.floor(rng() * WORDS.length)];
    H.word = word; H.used.push(word); H.hx = dgShuffle(word.split('').map((_, i) => i), rng); H.reveal = 0; H.hint = dgHint(H);
    H.ok = {}; H.ph = 'draw'; H.endAt = now + DG_DUR * 1000; H.nextAt = 0; H.fresh = true;
  }
  function dgNew(order, now, rng){
    const H = { ph: 'draw', r: 0, rounds: Math.min(12, order.length * 2), order: order.slice(), sc: {}, ok: {}, used: [], lastWord: '' };
    order.forEach(p => { H.sc[p] = 0; });
    dgBegin(H, now, rng || Math.random);
    return H;
  }
  function dgEnd(H, now){ H.ph = 'between'; H.nextAt = now + DG_PAUSE; H.lastWord = H.word; }
  function dgGuess(H, p, text, now){
    if(H.ph !== 'draw' || p === dgDrawer(H) || H.ok[p] || now >= H.endAt || H.order.indexOf(p) < 0) return false;
    if(dgNorm(text) !== dgNorm(H.word)) return false;
    const pts = Math.round(40 + 60 * Math.max(0, H.endAt - now) / (DG_DUR * 1000));
    H.sc[p] = (H.sc[p] || 0) + pts; H.sc[dgDrawer(H)] = (H.sc[dgDrawer(H)] || 0) + 30; H.ok[p] = pts;
    if(H.order.filter(q => q !== dgDrawer(H)).every(q => H.ok[q])) dgEnd(H, now);
    return true;
  }
  function dgTick(H, now, rng){
    if(H.ph === 'draw'){
      if(now >= H.endAt){ dgEnd(H, now); return true; }
      const el = (now - (H.endAt - DG_DUR * 1000)) / 1000, want = (el >= DG_DUR * 0.4 ? 1 : 0) + (el >= DG_DUR * 0.7 ? 1 : 0);
      if(want > (H.reveal || 0) && H.word.length > 3){ H.reveal = want; H.hint = dgHint(H); return true; }
    } else if(H.ph === 'between' && now >= H.nextAt){
      if(H.r + 1 >= H.rounds){
        H.ph = 'over';
        H.win = H.order.slice().sort((a, b) => (H.sc[b] || 0) - (H.sc[a] || 0))[0];
      } else { H.r++; dgBegin(H, now, rng || Math.random); }
      return true;
    }
    return false;
  }
  const dg = { H: null, room: '', seen: new Set(), timer: null, tick: null, cur: null, color: 0, width: 1, canDraw: false, M: null, lastSend: 0, flushT: null, lastGuess: 0 };
  function dgWrite(M, d){
    const H = dg.H; if(!H) return;
    const nm = p => nameOf(d, p), dr = nm(dgDrawer(H));
    const status = H.ph === 'over' ? `${nm(H.win)} gewinnt! (${H.sc[H.win]} Pkt)` : H.ph === 'between' ? `Das Wort war „${H.lastWord}“` : `${dr} zeichnet · Runde ${H.r + 1}/${H.rounds}`;
    const upd = { started: true, ph: H.ph, r: H.r, rounds: H.rounds, order: H.order, sc: H.sc, ok: Object.keys(H.ok).length ? H.ok : null, word: H.word, hint: H.hint,
                  endAt: H.endAt, nextAt: H.nextAt, lastWord: H.lastWord, status };
    if(H.fresh){ upd.dr = null; upd.gs = null; H.fresh = false; dg.seen = new Set(); }
    return M.roomRef.update(upd);
  }
  function dgHostRun(M, d){
    if(M.player !== 'p1') return;
    if(!dg.H || dg.room !== M.roomCode){
      dg.room = M.roomCode; dg.seen = new Set(Object.keys(d.gs || {}));
      dg.H = d.started && d.ph && d.order ? { ph: d.ph, r: d.r || 0, rounds: d.rounds || 2, order: d.order, sc: d.sc || {}, ok: d.ok || {}, used: [d.word].filter(Boolean), word: d.word || '',
                                              hx: dgShuffle((d.word || '').split('').map((_, i) => i), Math.random), reveal: 0, hint: d.hint || '', endAt: d.endAt || 0, nextAt: d.nextAt || 0, lastWord: d.lastWord || '' } : null;
    }
    const H = dg.H; if(!H || H.ph === 'over') return;
    const now = window.app ? window.app.now() : Date.now(); let changed = false;
    const gs = d.gs || {};
    Object.keys(gs).sort().forEach(k => { if(dg.seen.has(k)) return; dg.seen.add(k); const g = gs[k] || {}; if(dgGuess(H, g.p, g.t, now)) changed = true; });
    if(dgTick(H, now)) changed = true;
    if(changed) dgWrite(M, d);
  }
  function dgStopHost(){ if(dg.timer){ clearInterval(dg.timer); dg.timer = null; } if(dg.tick){ clearInterval(dg.tick); dg.tick = null; } }
  function dgPaint(cv, strokes, skipLocal){
    const c = cv.getContext('2d'); c.fillStyle = '#ffffff'; c.fillRect(0, 0, 360, 270); c.lineCap = 'round'; c.lineJoin = 'round';
    Object.keys(strokes || {}).sort().forEach(k => {
      const s = strokes[k]; if(!s || !s.p || s.p.length < 2) return;
      c.strokeStyle = PAL[s.c] || '#111'; c.lineWidth = WID[s.w] || 5; c.beginPath(); c.moveTo(s.p[0], s.p[1]);
      for(let i = 2; i < s.p.length; i += 2) c.lineTo(s.p[i], s.p[i + 1]);
      if(s.p.length === 2) c.lineTo(s.p[0] + 0.1, s.p[1]); c.stroke();
    });
  }
  function dgFlush(final){
    const M = dg.M, cur = dg.cur; if(!M || !cur || cur.p.length < 2) return;
    M.roomRef.child('dr/' + cur.id).set({ c: cur.c, w: cur.w, p: cur.p.slice(-1200) }).catch(() => {});
    dg.lastSend = Date.now();
  }
  function dgBind(cv){
    if(cv._dgBound) return; cv._dgBound = true;
    const pos = e => { const r = cv.getBoundingClientRect(); return [Math.max(0, Math.min(360, Math.round((e.clientX - r.left) * 360 / r.width))), Math.max(0, Math.min(270, Math.round((e.clientY - r.top) * 270 / r.height)))]; };
    const seg = (a, b) => { const c = cv.getContext('2d'); c.strokeStyle = PAL[dg.cur.c]; c.lineWidth = WID[dg.cur.w]; c.lineCap = 'round'; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); };
    cv.addEventListener('pointerdown', e => {
      if(!dg.canDraw) return; e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch(x) {}
      const p = pos(e); dg.cur = { id: Date.now().toString(36), c: dg.color, w: dg.width, p: [p[0], p[1]] }; seg(p, [p[0] + 0.1, p[1]]);
    });
    cv.addEventListener('pointermove', e => {
      if(!dg.cur) return; e.preventDefault();
      const p = pos(e), n = dg.cur.p.length, last = [dg.cur.p[n - 2], dg.cur.p[n - 1]];
      if(Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 2) return;
      dg.cur.p.push(p[0], p[1]); seg(last, p);
      if(Date.now() - dg.lastSend > 120) dgFlush();
    });
    const end = () => { if(!dg.cur) return; dgFlush(true); dg.cur = null; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('pointerleave', end);
  }
  B.dgColor = i => { dg.color = i; };
  B.dgWidth = i => { dg.width = i; };
  B.dgClear = () => { if(dg.M && dg.canDraw) dg.M.roomRef.child('dr').remove().catch(() => {}); };
  B.dgSend = () => {
    const inp = $('dgInput'), M = dg.M; if(!inp || !M) return;
    const t = inp.value.trim().slice(0, 40); if(!t) return;
    if(Date.now() - dg.lastGuess < 600) return; dg.lastGuess = Date.now();
    inp.value = ''; M.roomRef.child('gs').push({ p: M.player, t, ts: Date.now() }).catch(() => {});
  };
  B.drawguess = {
    resetStatus: 'Warte auf Mitspieler (2–6) – der Host startet das Spiel',
    maxP: 6,
    init(){ return { started: false, turn: 'p1', ph: 'lobby', order: [], r: 0, rounds: 0, sc: null, word: '', hint: '', endAt: 0, nextAt: 0, lastWord: '', dr: null, gs: null, ok: null }; },
    canJoin(d){ return d.started && d.ph !== 'lobby' && d.ph !== 'over' ? 'Die Runde läuft bereits.' : null; },
    render(d, M, og){
      const app = window.app, now = app ? app.now() : Date.now();
      let cv = $('dgCvs');
      if(!cv){
        og.innerHTML = `<div style="text-align:center"><div id="dgInfo" style="margin-bottom:8px;min-height:44px"></div>
          <canvas id="dgCvs" width="360" height="270" style="max-width:100%;background:#fff;border-radius:12px;border:1px solid #2a3560;touch-action:none"></canvas>
          <div id="dgTools" style="margin-top:8px"></div><div id="dgGuess" style="margin-top:8px"></div>
          <div id="dgLog" style="margin-top:8px;font-size:13px;text-align:left"></div><div id="dgScores" style="margin-top:10px"></div><div id="dgCtl" style="margin-top:10px"></div></div>`;
        cv = $('dgCvs'); dgBind(cv);
      }
      dg.M = M;
      const ph = d.ph || 'lobby', order = d.order || [], drawer = order.length ? order[(d.r || 0) % order.length] : '', me = M.player;
      dg.canDraw = ph === 'draw' && drawer === me;
      // Host-Logik
      if(me === 'p1'){ dgHostRun(M, d); if(!dg.timer) dg.timer = setInterval(() => { const dd = window.td; if(!$('dgCvs') || !dd){ dgStopHost(); return; } dgHostRun(M, dd); }, 1000); }
      if(!dg.tick) dg.tick = setInterval(() => { const t = $('dgTime'), dd = window.td; if(!t || !dd){ if(!$('dgCvs')) dgStopHost(); return; } t.textContent = Math.max(0, Math.ceil(((dd.endAt || 0) - (app ? app.now() : Date.now())) / 1000)) + ' s'; }, 500);
      // Anzeige
      const info = $('dgInfo');
      const players = d.players || {}, keys = Object.keys(players).sort();
      if(ph === 'lobby'){
        info.innerHTML = `<b>Zeichnen-Duell</b><div class="muted" style="font-size:13px">${keys.length} Spieler im Raum · Code: <b>${esc(M.roomCode)}</b></div>`;
      } else if(ph === 'over'){
        info.innerHTML = `<b>Spiel vorbei!</b>`;
      } else if(ph === 'between'){
        info.innerHTML = `<div>Das Wort war: <b style="font-size:20px">${esc(d.lastWord)}</b></div><div class="muted" style="font-size:12px">Nächste Runde gleich …</div>`;
      } else {
        const word = dg.canDraw ? `Zeichne: <b style="font-size:22px;color:#ffd36b">${esc(d.word)}</b>` : `Rate das Wort: <b style="font-size:22px;letter-spacing:.15em">${esc(d.hint)}</b>`;
        info.innerHTML = `<div class="muted" style="font-size:12px">Runde ${(d.r || 0) + 1}/${d.rounds} · ${esc(nameOf(d, drawer))} zeichnet · <b id="dgTime">${Math.max(0, Math.ceil(((d.endAt || 0) - now) / 1000))} s</b></div><div>${word}</div>`;
      }
      // Zeichnung: Zeichner sieht seine eigenen Striche sofort, alle anderen aus der Datenbank
      if(!dg.cur) dgPaint(cv, d.dr || {});
      const tools = $('dgTools');
      tools.innerHTML = dg.canDraw ? `<div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;align-items:center">` +
        PAL.map((c, i) => `<button type="button" onclick="boards.dgColor(${i})" style="width:28px;height:28px;border-radius:50%;border:2px solid ${i === dg.color ? '#ffd36b' : '#2a3560'};background:${c}" aria-label="Farbe"></button>`).join('') +
        WID.map((w, i) => `<button type="button" class="btn" style="padding:2px 9px" onclick="boards.dgWidth(${i})">${['·', '●', '⬤'][i]}</button>`).join('') +
        `<button type="button" class="btn" onclick="boards.dgClear()">🗑</button></div>` : '';
      const gbox = $('dgGuess');
      const canGuess = ph === 'draw' && !dg.canDraw && !(d.ok || {})[me];
      if(canGuess){ if(!$('dgInput')) gbox.innerHTML = `<div style="display:flex;gap:6px;justify-content:center"><input id="dgInput" maxlength="40" placeholder="Dein Tipp …" autocomplete="off" style="flex:1;max-width:240px" onkeydown="if(event.key==='Enter')boards.dgSend()"><button class="btn primary" onclick="boards.dgSend()">Raten</button></div>`; }
      else gbox.innerHTML = (ph === 'draw' && !dg.canDraw) ? '<div style="color:#b8f36b">✓ Richtig geraten! Warte auf die anderen …</div>' : '';
      const gs = d.gs || {}, word = dgNorm(d.word);
      $('dgLog').innerHTML = Object.keys(gs).sort().slice(-6).map(k => { const g = gs[k] || {}; const right = ph !== 'lobby' && dgNorm(g.t) === word && word;
        return `<div>${esc(nameOf(d, g.p))}: ${right ? '<span style="color:#b8f36b">✓ hat es erraten!</span>' : esc(g.t)}</div>`; }).join('');
      const sc = d.sc || {};
      $('dgScores').innerHTML = (order.length ? order : keys).map(p => `<span class="chip" style="margin:2px">${p === drawer && ph === 'draw' ? '✏️ ' : ''}${esc(nameOf(d, p))}: <b>${sc[p] || 0}</b>${(d.ok || {})[p] ? ' ✓' : ''}</span>`).join('');
      $('dgCtl').innerHTML = (me === 'p1' && (ph === 'lobby' || ph === 'over'))
        ? (keys.length >= 2 ? `<button class="btn primary" onclick="multi.po('b_dg_start')">▶ ${ph === 'over' ? 'Nochmal spielen' : 'Spiel starten'} (${keys.length} Spieler)</button>` : '<div class="muted">Warte auf mindestens einen Mitspieler …</div>')
        : (ph === 'lobby' ? '<div class="muted">Warte, bis der Host startet …</div>' : '');
      const rs = rsStatus(); if(rs && !/gewinnt/.test(d.status || '')) rs.textContent = d.status || '';
    },
    act(act, val, M, d){
      if(act !== 'b_dg_start' || M.player !== 'p1') return;
      const order = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].filter(p => d.players && d.players[p]);
      if(order.length < 2 || (d.ph && d.ph !== 'lobby' && d.ph !== 'over')) return;
      dg.H = dgNew(order, window.app ? window.app.now() : Date.now(), Math.random); dg.room = M.roomCode; dg.seen = new Set();
      return dgWrite(M, d);
    }
  };

  B._test2 = { dLegal, dCaps, dameInit, dameStep, rMoves, rFlips, revInit, revStep, dotsInit, dotsStep, dgNew, dgGuess, dgTick, dgNorm, dgDrawer, dgHint, WORDS, DG_DUR, DG_PAUSE };
})();
