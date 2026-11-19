/* PLAYVERSE – Paket 8: Retro-Mehrspieler in Echtzeit
   Pong (2 Spieler) und Lightcycles / Tron (2–4 Spieler). Wie beim Snake-Battle simuliert der Host (p1) das Spiel
   und schreibt den Zustand nach Firebase; Mitspieler schicken nur ihre Eingaben. */
(function(){
    const B = window.boards;
    if(!B) return;
    const $ = id => document.getElementById(id);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const nameOf = (d, p) => (d.players && d.players[p]) || p;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const rs = () => $('rstatus');
    const COL = { p1: '#66e3ff', p2: '#ff6fa5', p3: '#b8f36b', p4: '#ffd36b' };

    // ==================================================================  PONG
    const PW = 400, PH = 300, PAD_H = 64, PAD_W = 8, PAD_X = 14, BR = 6, WIN = 7, V0 = 230, VMAX = 560;
    function pongNew(){ return { bx: PW / 2, by: PH / 2, vx: 0, vy: 0, s1: 0, s2: 0, y1: PH / 2, y2: PH / 2, serve: 1.2, dir: 1, ov: 0, rally: 0 }; }
    function pongServe(st, rng){
        const a = (rng() - 0.5) * 0.9;
        st.bx = PW / 2; st.by = PH / 2; st.vx = st.dir * V0 * Math.cos(a); st.vy = V0 * Math.sin(a);
    }
    function pongHit(st, who, padY, rng){
        // kleiner Zufallsanteil im Abprallwinkel: Ballwechsel können so nie endlos „perfekt“ weitergehen
        const off = clamp((st.by - padY) / (PAD_H / 2 + BR), -1, 1), sp = Math.min(VMAX, Math.hypot(st.vx, st.vy) * 1.06), ang = off * 0.85 + ((rng || Math.random)() - 0.5) * (0.22 + 0.05 * Math.min(st.rally || 0, 14));   // je länger der Ballwechsel, desto wilder der Winkel
        st.rally = (st.rally || 0) + 1;
        st.vx = (who === 1 ? 1 : -1) * sp * Math.cos(ang); st.vy = sp * Math.sin(ang);
        st.bx = who === 1 ? PAD_X + PAD_W + BR + 0.5 : PW - PAD_X - PAD_W - BR - 0.5;
    }
    // Ein Zeitschritt (rein, testbar). y1/y2 = Schlägermitte in Spielfeldeinheiten.
    function pongStep(st, dt, y1, y2, rng){
        st.y1 = clamp(y1, PAD_H / 2, PH - PAD_H / 2); st.y2 = clamp(y2, PAD_H / 2, PH - PAD_H / 2);
        if(st.ov) return st;
        if(st.serve > 0){ st.serve -= dt; if(st.serve <= 0) pongServe(st, rng || Math.random); return st; }
        st.bx += st.vx * dt; st.by += st.vy * dt;
        if(st.by < BR){ st.by = BR; st.vy = Math.abs(st.vy); }
        if(st.by > PH - BR){ st.by = PH - BR; st.vy = -Math.abs(st.vy); }
        if(st.vx < 0 && st.bx - BR <= PAD_X + PAD_W && st.bx >= PAD_X - BR && Math.abs(st.by - st.y1) <= PAD_H / 2 + BR) pongHit(st, 1, st.y1, rng);
        else if(st.vx > 0 && st.bx + BR >= PW - PAD_X - PAD_W && st.bx <= PW - PAD_X + BR && Math.abs(st.by - st.y2) <= PAD_H / 2 + BR) pongHit(st, 2, st.y2, rng);
        if(st.bx < -BR || st.bx > PW + BR){
            const p1conceded = st.bx < 0;
            if(p1conceded) st.s2++; else st.s1++;
            st.vx = st.vy = 0; st.bx = PW / 2; st.by = PH / 2; st.dir = p1conceded ? -1 : 1; st.serve = 1.1; st.rally = 0;
            if(st.s1 >= WIN || st.s2 >= WIN) st.ov = st.s1 > st.s2 ? 1 : 2;
        }
        return st;
    }
    const pong = { st: null, M: null, timer: null, drawT: null, myY: PH / 2, keys: { up: false, down: false }, net: null, last: 0, sent: -1, sentT: 0, ticks: 0, keysOn: false };
    function pongStop(){ if(pong.timer){ clearInterval(pong.timer); pong.timer = null; } }
    function pongWrite(M, d, force){
        const st = pong.st; if(!st) return;
        const nm = p => nameOf(d, p);
        const status = st.ov === 1 ? `${nm('p1')} gewinnt! (${st.s1} : ${st.s2})` : st.ov === 2 ? `${nm('p2')} gewinnt! (${st.s1} : ${st.s2})` : `${nm('p1')} ${st.s1} : ${st.s2} ${nm('p2')}`;
        M.roomRef.update({ pg: { bx: Math.round(st.bx * 10) / 10, by: Math.round(st.by * 10) / 10, vx: Math.round(st.vx), vy: Math.round(st.vy), s1: st.s1, s2: st.s2,
                y1: Math.round(st.y1), y2: Math.round(st.y2), serve: Math.round(st.serve * 100) / 100, ov: st.ov, t: Date.now() }, status });
    }
    function pongHostStart(M){
        if(pong.timer) return;
        pong.last = Date.now(); pong.ticks = 0;
        pong.timer = setInterval(() => {
            const d = window.td;
            if(!$('pgCvs') || !d || !d.started || !pong.st){ pongStop(); return; }
            const now = Date.now(), dt = Math.min(0.05, (now - pong.last) / 1000); pong.last = now;
            const wasServe = pong.st.serve > 0, s0 = pong.st.s1 + pong.st.s2, y2 = (typeof d.in2 === 'number' ? d.in2 : 0.5) * PH;
            pongStep(pong.st, dt, pong.myY, y2);
            pong.ticks++;
            const scored = pong.st.s1 + pong.st.s2 !== s0;
            if(pong.st.ov || scored || (wasServe && pong.st.serve <= 0) || pong.ticks % 4 === 0) pongWrite(M, d);
            if(pong.st.ov) pongStop();
        }, 16);
    }
    function pongDraw(d){
        const cv = $('pgCvs'); if(!cv){ if(pong.drawT){ clearInterval(pong.drawT); pong.drawT = null; } return; }
        const c = cv.getContext('2d'), me = pong.M ? pong.M.player : 'p1';
        let g = null;
        if(me === 'p1' && pong.st) g = { bx: pong.st.bx, by: pong.st.by, s1: pong.st.s1, s2: pong.st.s2, y1: pong.myY, y2: pong.st.y2, serve: pong.st.serve, ov: pong.st.ov };
        else if(pong.net && pong.net.pg){
            const p = pong.net.pg, dt = Math.min(0.25, (Date.now() - pong.net.recv) / 1000); let by = p.by + p.vy * dt, bx = p.bx + p.vx * dt;
            by = by < BR ? 2 * BR - by : by > PH - BR ? 2 * (PH - BR) - by : by; bx = clamp(bx, 0, PW);
            g = { bx, by, s1: p.s1, s2: p.s2, y1: p.y1, y2: me === 'p2' ? pong.myY : p.y2, serve: p.serve, ov: p.ov };
        }
        c.fillStyle = '#05060f'; c.fillRect(0, 0, PW, PH);
        c.strokeStyle = '#2a3560'; c.setLineDash && c.setLineDash([8, 10]); c.beginPath(); c.moveTo(PW / 2, 0); c.lineTo(PW / 2, PH); c.stroke(); c.setLineDash && c.setLineDash([]);
        if(!g){ c.fillStyle = '#fff'; c.font = 'bold 20px sans-serif'; c.textAlign = 'center'; c.fillText('Bereit?', PW / 2, PH / 2); c.textAlign = 'start'; return; }
        c.fillStyle = COL.p1; c.fillRect(PAD_X, g.y1 - PAD_H / 2, PAD_W, PAD_H); c.fillStyle = COL.p2; c.fillRect(PW - PAD_X - PAD_W, g.y2 - PAD_H / 2, PAD_W, PAD_H);
        c.fillStyle = '#fff'; c.beginPath(); c.arc(g.bx, g.by, BR, 0, 7); c.fill();
        c.font = 'bold 34px monospace'; c.textAlign = 'center'; c.fillStyle = COL.p1; c.fillText(String(g.s1), PW / 2 - 50, 44); c.fillStyle = COL.p2; c.fillText(String(g.s2), PW / 2 + 50, 44); c.textAlign = 'start';
        if(g.serve > 0 && !g.ov){ c.fillStyle = '#fff'; c.font = 'bold 16px sans-serif'; c.textAlign = 'center'; c.fillText('Aufschlag …', PW / 2, PH - 16); c.textAlign = 'start'; }
        // eigener Schläger per Tastatur
        const k = pong.keys; if(k.up || k.down){ pong.myY = clamp(pong.myY + (k.down ? 1 : 0) * 5 - (k.up ? 1 : 0) * 5, PAD_H / 2, PH - PAD_H / 2); }
        if(me === 'p2' && pong.M && d){
            const v = Math.round(pong.myY / PH * 100) / 100, t = Date.now();
            if(v !== pong.sent && t - pong.sentT > 45){ pong.sent = v; pong.sentT = t; pong.M.roomRef.update({ in2: v }).catch(() => {}); }
        }
    }
    B.pong = {
        resetStatus: 'Warte auf Spieler 2 …',
        init(){ return { started: false, turn: 'p1', pg: null, in2: 0.5 }; },
        begin(M){ pong.st = pongNew(); pong.myY = PH / 2; pong.last = Date.now(); return M.roomRef.update({ started: true, in2: 0.5, pg: { bx: PW / 2, by: PH / 2, vx: 0, vy: 0, s1: 0, s2: 0, y1: PH / 2, y2: PH / 2, serve: 1.2, ov: 0, t: Date.now() }, status: 'Spiel läuft' }); },
        render(d, M, og){
            let cv = $('pgCvs');
            if(!cv){
                og.innerHTML = `<div style="text-align:center"><div id="pgInfo" style="margin-bottom:8px"></div>
          <canvas id="pgCvs" width="${PW}" height="${PH}" style="max-width:100%;border-radius:12px;border:1px solid #2a3560;touch-action:none;cursor:ns-resize"></canvas>
          <div id="pgCtl" style="margin-top:10px;min-height:40px"></div>
          <div class="muted" style="font-size:12px;margin-top:6px">Maus/Finger auf dem Spielfeld hoch und runter bewegen, oder ↑/↓ bzw. W/S. Wer zuerst ${WIN} Punkte hat, gewinnt.</div></div>`;
                cv = $('pgCvs');
                const mv = e => { const r = cv.getBoundingClientRect(); pong.myY = clamp((e.clientY - r.top) * PH / r.height, PAD_H / 2, PH - PAD_H / 2); e.preventDefault(); };
                cv.addEventListener('pointermove', mv); cv.addEventListener('pointerdown', mv); cv.addEventListener('touchmove', e => { const t = e.touches[0]; mv({ clientY: t.clientY, preventDefault: () => e.preventDefault() }); }, { passive: false });
            }
            pong.M = M;
            if(!pong.keysOn){
                pong.keysOn = true;
                const map = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down' };
                const kd = e => { if(!$('pgCvs')){ document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); pong.keysOn = false; return; } const n = map[e.key]; if(n){ pong.keys[n] = true; e.preventDefault(); } };
                const ku = e => { const n = map[e.key]; if(n) pong.keys[n] = false; };
                document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
            }
            if(d.pg && (!pong.net || pong.net.pg.t !== d.pg.t)) pong.net = { pg: d.pg, recv: Date.now() };
            if(!pong.drawT) pong.drawT = setInterval(() => pongDraw(window.td || d), 16);
            if(M.player === 'p1' && d.started && d.pg && !d.pg.ov){
                if(!pong.st){ pong.st = Object.assign(pongNew(), d.pg, { serve: d.pg.serve || 0, dir: 1 }); }
                pongHostStart(M);
            }
            const p1 = nameOf(d, 'p1'), p2 = d.players && d.players.p2 ? nameOf(d, 'p2') : '…';
            $('pgInfo').innerHTML = `<span style="color:${COL.p1}">● ${esc(p1)}</span> &nbsp;vs&nbsp; <span style="color:${COL.p2}">● ${esc(p2)}</span> &nbsp;·&nbsp; Du bist <b style="color:${M.player === 'p1' ? COL.p1 : COL.p2}">${M.player === 'p1' ? 'links' : 'rechts'}</b>`;
            const over = d.pg && d.pg.ov, running = d.started && d.pg && !over;
            $('pgCtl').innerHTML = running ? '' : (M.player === 'p1'
                ? (d.players && d.players.p2 ? `<button class="btn primary" onclick="multi.po('b_pong_start')">▶ ${d.pg ? 'Nochmal spielen' : 'Spiel starten'}</button>` : `<div class="muted">Warte auf Spieler 2 … Code: <b>${esc(M.roomCode)}</b></div>`)
                : '<div class="muted">Warte, bis der Host das Spiel startet …</div>');
            if(over) pongStop();
            const r = rs(); if(r && !/gewinnt/.test(d.status || '')) r.textContent = d.status || '';
        },
        act(act, val, M, d){
            if(act !== 'b_pong_start' || M.player !== 'p1' || !(d.players && d.players.p2)) return;
            if(d.started && d.pg && !d.pg.ov) return;
            pongStop(); return B.pong.begin(M);
        }
    };

    // ==================================================================  LIGHTCYCLES (2–4 Spieler)
    const LW = 40, LH = 30, CELL = 12, TICK = 110;
    const LV = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }, LOPP = { U: 'D', D: 'U', L: 'R', R: 'L' };
    const STARTS = { p1: [6, 15, 'R'], p2: [33, 15, 'L'], p3: [20, 5, 'D'], p4: [20, 24, 'U'] };
    const ID = { p1: '1', p2: '2', p3: '3', p4: '4' };
    function lcNew(order){
        const g = Array(LW * LH).fill('0'), h = {}, dd = {}, al = {};
        order.forEach(p => { const [x, y, dir] = STARTS[p]; h[p] = [x, y]; dd[p] = dir; al[p] = 1; g[y * LW + x] = ID[p]; });
        return { g: g.join(''), h, d: dd, al, ov: 0, win: '', order: order.slice(), t: 0 };
    }
    // Ein Schritt (rein, testbar). inputs = {p1:'U', …}
    function lcStep(st, inputs){
        if(st.ov) return st;
        const g = st.g.split(''), heads = {}, dead = [];
        st.order.forEach(p => {
            if(!st.al[p]) return;
            const want = inputs && inputs[p];
            if(want && LV[want] && want !== LOPP[st.d[p]]) st.d[p] = want;
            heads[p] = [st.h[p][0] + LV[st.d[p]][0], st.h[p][1] + LV[st.d[p]][1]];
        });
        const alive = Object.keys(heads);
        alive.forEach(p => {
            const [x, y] = heads[p];
            if(x < 0 || y < 0 || x >= LW || y >= LH || g[y * LW + x] !== '0') dead.push(p);
            else alive.forEach(q => { if(q !== p && heads[q][0] === x && heads[q][1] === y && dead.indexOf(p) < 0) dead.push(p); });   // Kopf an Kopf: beide scheiden aus
        });
        alive.forEach(p => { if(dead.indexOf(p) >= 0) st.al[p] = 0; else { st.h[p] = heads[p]; g[heads[p][1] * LW + heads[p][0]] = ID[p]; } });
        st.g = g.join(''); st.t++;
        const left = st.order.filter(p => st.al[p]);
        if(left.length <= 1){ st.ov = left.length === 1 ? 1 : 2; st.win = left.length === 1 ? left[0] : ''; }
        return st;
    }
    const lc = { st: null, timer: null, dir: 'R', sent: '', keysOn: false, room: '' };
    function lcStopHost(){ if(lc.timer){ clearInterval(lc.timer); lc.timer = null; } }
    function lcHostStart(M){
        if(lc.timer) return;
        lc.timer = setInterval(() => {
            const d = window.td;
            if(!$('lcCvs') || !d || !d.started || !lc.st || lc.st.ov){ lcStopHost(); return; }
            const inputs = Object.assign({}, d.ins || {}, { p1: lc.dir });
            lcStep(lc.st, inputs);
            const st = lc.st, nm = p => nameOf(d, p);
            const status = st.ov === 1 ? `${nm(st.win)} gewinnt!` : st.ov === 2 ? 'Unentschieden – gleich geht es weiter' : 'Runde läuft';
            M.roomRef.update({ lc: JSON.parse(JSON.stringify(st)), status });
            if(st.ov){ lcStopHost(); if(st.ov === 2) setTimeout(() => { if($('lcCvs') && window.td && window.td.started) B.lightcycles.begin(M, window.td); }, 3000); }
        }, TICK);
    }
    B.lcDir = function(dir){
        const M = window.multi, d = window.td;
        if(!M || !d || !d.started || !LV[dir]) return;
        if(M.player === 'p1') lc.dir = dir;
        else if(lc.sent !== dir){ lc.sent = dir; M.roomRef.child('ins/' + M.player).set(dir).catch(() => {}); }
    };
    function lcDraw(cv, d, M){
        const c = cv.getContext('2d'), st = d.lc;
        c.fillStyle = '#05060f'; c.fillRect(0, 0, LW * CELL, LH * CELL);
        c.strokeStyle = '#0d1432'; c.lineWidth = 1; for(let x = 0; x <= LW; x += 4){ c.beginPath(); c.moveTo(x * CELL, 0); c.lineTo(x * CELL, LH * CELL); c.stroke(); } for(let y = 0; y <= LH; y += 4){ c.beginPath(); c.moveTo(0, y * CELL); c.lineTo(LW * CELL, y * CELL); c.stroke(); }
        if(st && st.g){
            const col = { '1': COL.p1, '2': COL.p2, '3': COL.p3, '4': COL.p4 };
            for(let i = 0; i < st.g.length; i++){ const ch = st.g[i]; if(ch !== '0'){ c.fillStyle = col[ch]; c.fillRect((i % LW) * CELL + 1, ((i / LW) | 0) * CELL + 1, CELL - 2, CELL - 2); } }
            (st.order || []).forEach(p => { const h = st.h && st.h[p]; if(h){ c.fillStyle = st.al[p] ? '#ffffff' : '#555a77'; c.fillRect(h[0] * CELL + 2, h[1] * CELL + 2, CELL - 4, CELL - 4); } });
        }
        if(!d.started || (st && st.ov)){
            c.fillStyle = '#05060fcc'; c.fillRect(0, LH * CELL / 2 - 26, LW * CELL, 52); c.fillStyle = '#fff'; c.font = 'bold 20px sans-serif'; c.textAlign = 'center';
            c.fillText(!d.started ? 'Bereit?' : (d.status || ''), LW * CELL / 2, LH * CELL / 2 + 7); c.textAlign = 'start';
        }
    }
    B.lightcycles = {
        resetStatus: 'Warte auf Mitspieler (2–4) – der Host startet das Spiel',
        maxP: 4,
        init(){ return { started: false, turn: 'p1', lc: null, ins: null }; },
        canJoin(d){ return d.started && d.lc && !d.lc.ov ? 'Die Runde läuft bereits.' : null; },
        begin(M, d){
            const order = ['p1', 'p2', 'p3', 'p4'].filter(p => d.players && d.players[p]);
            lc.st = lcNew(order); lc.dir = lc.st.d.p1; lc.sent = '';
            return M.roomRef.update({ started: true, lc: JSON.parse(JSON.stringify(lc.st)), ins: null, status: 'Runde läuft' });
        },
        render(d, M, og){
            let cv = $('lcCvs');
            if(!cv){
                og.innerHTML = `<div style="text-align:center"><div id="lcInfo" style="margin-bottom:8px"></div>
          <canvas id="lcCvs" width="${LW * CELL}" height="${LH * CELL}" style="max-width:100%;border-radius:12px;border:1px solid #2a3560"></canvas>
          <div class="dpad" style="margin-top:8px"><div></div><button type="button" onpointerdown="boards.lcDir('U')">⬆️</button><div></div>
            <button type="button" onpointerdown="boards.lcDir('L')">⬅️</button><button type="button" onpointerdown="boards.lcDir('D')">⬇️</button><button type="button" onpointerdown="boards.lcDir('R')">➡️</button></div>
          <div id="lcCtl" style="margin-top:10px;min-height:40px"></div>
          <div class="muted" style="font-size:12px;margin-top:6px">Steuere dein Lichtband mit Pfeiltasten/WASD oder dem Steuerkreuz. Wer gegen eine Wand oder ein Band fährt, scheidet aus – der Letzte gewinnt!</div></div>`;
                cv = $('lcCvs');
            }
            if(!lc.keysOn){
                lc.keysOn = true;
                const map = { ArrowUp: 'U', w: 'U', W: 'U', ArrowDown: 'D', s: 'D', S: 'D', ArrowLeft: 'L', a: 'L', A: 'L', ArrowRight: 'R', d: 'R', D: 'R' };
                const h = e => { if(!$('lcCvs')){ document.removeEventListener('keydown', h); lc.keysOn = false; return; } const dir = map[e.key]; if(dir){ B.lcDir(dir); e.preventDefault(); } };
                document.addEventListener('keydown', h);
            }
            if(d.lc && d.lc.t === 0) lc.sent = '';
            if(M.player === 'p1' && d.started && d.lc && !d.lc.ov){
                if(!lc.timer){ lc.st = JSON.parse(JSON.stringify(d.lc)); lc.dir = lc.st.d.p1 || 'R'; lcHostStart(M); }
            } else if(lc.timer){ lcStopHost(); }
            const keys = Object.keys(d.players || {}).sort();
            $('lcInfo').innerHTML = keys.map(p => `<span style="color:${COL[p]};margin:0 6px;${d.lc && d.lc.al && d.lc.order && d.lc.order.indexOf(p) >= 0 && !d.lc.al[p] ? 'text-decoration:line-through;opacity:.6' : ''}">● ${esc(nameOf(d, p))}${p === M.player ? ' (du)' : ''}</span>`).join('');
            const running = d.started && d.lc && !d.lc.ov;
            $('lcCtl').innerHTML = running ? '' : (M.player === 'p1'
                ? (keys.length >= 2 ? `<button class="btn primary" onclick="multi.po('b_lc_start')">▶ ${d.lc ? 'Neue Runde' : 'Runde starten'} (${keys.length} Spieler)</button>` : `<div class="muted">Warte auf mindestens einen Mitspieler … Code: <b>${esc(M.roomCode)}</b></div>`)
                : '<div class="muted">Warte, bis der Host die Runde startet …</div>');
            lcDraw(cv, d, M);
            const r = rs(); if(r && !/gewinnt/.test(d.status || '')) r.textContent = d.status || '';
        },
        act(act, val, M, d){
            if(act !== 'b_lc_start' || M.player !== 'p1') return;
            const n = Object.keys(d.players || {}).length; if(n < 2) return;
            if(d.started && d.lc && !d.lc.ov) return;
            lcStopHost(); return B.lightcycles.begin(M, d);
        }
    };

    B._test3 = { pongNew, pongStep, pongServe, lcNew, lcStep, PW, PH, PAD_H, WIN, LW, LH };
})();