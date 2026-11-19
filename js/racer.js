/* PLAYVERSE – Paket 8: Turbo Rush (Solo-Rennspiel, Pseudo-3D im Stil klassischer Arcade-Racer)
   Zeitrennen: Du startest mit 45 Sekunden, an jedem Checkpoint gibt es +20 Sekunden. Wenn die Zeit abläuft, zählt deine Strecke (m).
   Technik: Straße aus Segmenten, perspektivisch projiziert (Standardverfahren für Pseudo-3D-Straßen). Eigene Umsetzung. */
(function(){
    const S = window.solo;
    const $ = id => document.getElementById(id);
    const say = (id, t) => { const e = $(id); if(e) e.textContent = t; };

    // ======================================================  Konstanten
    const W = 320, H = 240;
    const SEG = 200, ROAD = 2000, CAMH = 1000, DEPTH = 1 / Math.tan((100 / 2) * Math.PI / 180), DRAW = 140;
    const MAXV = SEG * 60, ACC = MAXV / 5, BRAKE = -MAXV, OFFDEC = -MAXV / 2, OFFLIM = MAXV / 4, CENTRI = 0.3;
    const START_TIME = 45, CHECK_BONUS = 20, CHECK_EVERY_M = 1200, M_PER_UNIT = 1 / 154.3;     // 12000 Einheiten/s ≈ 280 km/h ≈ 77,8 m/s
    const PZ = CAMH * DEPTH;                                                        // Abstand Kamera -> Spielerauto
    const CAR_COLORS = ['#ff5d73', '#ffb347', '#b8f36b', '#66e3ff', '#c9a0ff', '#ffffff', '#ffd36b'];

    // ======================================================  Strecke (Kurven mit weichem Ein- und Ausgang)
    function buildTrack(){
        const segs = []; let last = 0;
        const ease = (a, b, p) => a + (b - a) * (p * p * (3 - 2 * p));
        const section = (enter, hold, leave, curve) => {
            for(let i = 0; i < enter; i++) segs.push({ curve: ease(last, curve, i / enter) });
            for(let i = 0; i < hold; i++) segs.push({ curve });
            for(let i = 0; i < leave; i++) segs.push({ curve: ease(curve, 0, i / leave) });
            last = 0;
        };
        const straight = n => section(0, n, 0, 0);
        straight(40);
        [[25, 40, 25, 2], [20, 30, 20, -3], [30, 50, 30, 4], [25, 20, 25, -2], [20, 30, 20, 3], [35, 60, 35, -4], [20, 15, 20, 5], [20, 15, 20, -5], [30, 40, 30, 2.5]]
            .forEach(([e, h, l, c], i) => { straight(25 + (i * 17) % 35); section(e, h, l, c); });
        straight(40);
        segs.forEach((s, i) => { s.index = i; });
        return segs;
    }
    const TRACK = buildTrack(), N = TRACK.length, LEN = N * SEG;
    const seg = z => TRACK[Math.floor((((z % LEN) + LEN) % LEN) / SEG)];

    // ======================================================  Spielzustand (reine Logik, ohne Zeichnen)
    function newState(rng){
        rng = rng || Math.random;
        const cars = [];
        for(let i = 0; i < 36; i++){
            const lane = [-0.7, -0.25, 0.25, 0.7][Math.floor(rng() * 4)];
            cars.push({ z: 3000 + rng() * (LEN - 3000), off: lane, speed: MAXV / 5 + rng() * MAXV / 4, color: CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)] });
        }
        return { pos: 0, dist: 0, speed: 0, x: 0, time: START_TIME, over: false, score: 0, cars, nextCheck: CHECK_EVERY_M, crash: 0, flash: 0, bonus: 0, hits: 0, steer: 0, bg: 0 };
    }
    // Ein Zeitschritt. input = { left, right, brake }
    function step(st, dt, input){
        if(st.over) return st;
        dt = Math.min(dt, 0.05);
        const cs = seg(st.pos + PZ), pct = st.speed / MAXV;
        st.pos = (st.pos + dt * st.speed) % LEN;
        st.dist += dt * st.speed;
        const dx = dt * 2 * pct;
        st.steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
        st.x += st.steer * dx;
        st.x -= dx * pct * cs.curve * CENTRI;
        st.bg += cs.curve * pct * dt * 0.5;
        st.speed += (input.brake ? BRAKE : ACC) * dt;
        if(Math.abs(st.x) > 1 && st.speed > OFFLIM) st.speed += OFFDEC * dt;           // neben der Straße bremst Gras
        st.x = Math.max(-2, Math.min(2, st.x));
        st.speed = Math.max(0, Math.min(MAXV, st.speed));
        if(st.crash > 0) st.crash -= dt;
        if(st.flash > 0) st.flash -= dt;
        // Verkehr
        st.cars.forEach(c => {
            c.z = (c.z + dt * c.speed) % LEN;
            const rel = (((c.z - (st.pos + PZ) + SEG * 2) % LEN) + LEN) % LEN - SEG * 2;           // Abstand zum Spielerauto (negativ = hinter ihm)
            const swept = Math.max(0, st.speed - c.speed) * dt;                                    // in diesem Bild zurückgelegter Weg (sonst fährt man bei Höchsttempo durch Autos hindurch)
            if(rel > -SEG * 0.3 - swept && rel < SEG * 0.9 && st.speed > c.speed && Math.abs(st.x - c.off) < 0.42 && st.crash <= 0){
                st.speed = c.speed * (c.speed / Math.max(1, st.speed)) * 0.9;     // Aufprall: stark abbremsen
                st.crash = 0.8; st.hits++;
            }
        });
        // Checkpoints
        if(st.dist * M_PER_UNIT >= st.nextCheck){ st.time += CHECK_BONUS; st.nextCheck += CHECK_EVERY_M; st.flash = 1.6; st.bonus++; }
        st.time -= dt;
        if(st.time <= 0){ st.time = 0; st.over = true; st.score = Math.floor(st.dist * M_PER_UNIT); }
        return st;
    }

    // ======================================================  Zeichnen
    function poly(c, x1, y1, x2, y2, x3, y3, x4, y4, col){ c.fillStyle = col; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x3, y3); c.lineTo(x4, y4); c.closePath(); c.fill(); }
    function draw(c, st){
        // Himmel + Berge
        const g = c.createLinearGradient ? c.createLinearGradient(0, 0, 0, H / 2) : null;
        if(g){ g.addColorStop(0, '#1b0f3a'); g.addColorStop(1, '#ff6fa5'); c.fillStyle = g; } else c.fillStyle = '#2b1a5a';
        c.fillRect(0, 0, W, H / 2 + 2);
        c.fillStyle = '#ffd36b'; c.beginPath(); c.arc(W * 0.5 - st.bg * 20 % W, H * 0.28, 22, 0, 7); c.fill();
        c.fillStyle = '#2a1650';
        const off = (st.bg * 40) % 160;
        for(let k = -1; k < 4; k++){ const bx = k * 160 - off; c.beginPath(); c.moveTo(bx, H / 2); c.lineTo(bx + 60, H / 2 - 34 - (k & 1) * 12); c.lineTo(bx + 120, H / 2); c.closePath(); c.fill(); }
        c.fillStyle = '#0d3b1e'; c.fillRect(0, H / 2, W, H / 2);
        // Straße
        const base = Math.floor(st.pos / SEG), basePct = (st.pos % SEG) / SEG;   // Kamera-Segment
        let dxc = -(TRACK[base % N].curve * basePct), xo = 0, maxy = H; const scr = [];
        for(let n = 0; n < DRAW; n++){
            const sg = TRACK[(base + n) % N], i = base + n;
            const z1 = i * SEG - st.pos, z2 = (i + 1) * SEG - st.pos;
            if(z1 <= DEPTH){ xo += dxc; dxc += sg.curve; scr.push(null); continue; }       // hinter/an der Kamera: überspringen (aber Kurve mitzählen)
            const camX1 = st.x * ROAD - xo, camX2 = st.x * ROAD - xo - dxc;
            const s1 = DEPTH / z1, s2 = DEPTH / z2;
            const x1 = Math.round(W / 2 + s1 * (-camX1) * W / 2), y1 = Math.round(H / 2 + s1 * CAMH * H / 2), w1 = Math.round(s1 * ROAD * W / 2);
            const x2 = Math.round(W / 2 + s2 * (-camX2) * W / 2), y2 = Math.round(H / 2 + s2 * CAMH * H / 2), w2 = Math.round(s2 * ROAD * W / 2);
            scr.push({ x: x1, y: y1, w: w1, s: s1, clip: maxy });
            xo += dxc; dxc += sg.curve;
            if(y2 >= y1 || y2 >= maxy) continue;
            const dark = Math.floor(i / 3) % 2, grass = dark ? '#0d3b1e' : '#115028', rumble = Math.floor(i / 3) % 2 ? '#ffffff' : '#ff3b5c', road = dark ? '#3a3f55' : '#434961';
            c.fillStyle = grass; c.fillRect(0, y2, W, y1 - y2);
            const r1 = w1 / 6, r2 = w2 / 6;
            poly(c, x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, rumble);
            poly(c, x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, rumble);
            poly(c, x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, road);
            if(dark){ const l1 = w1 / 32, l2 = w2 / 32; for(let ln = 1; ln < 3; ln++){ const o1 = w1 * (ln * 2 / 3 - 1), o2 = w2 * (ln * 2 / 3 - 1); poly(c, x1 + o1 - l1, y1, x1 + o1 + l1, y1, x2 + o2 + l2, y2, x2 + o2 - l2, y2, '#e8ecff'); } }
            maxy = y1;
        }
        // Verkehr (von hinten nach vorn)
        st.cars.map(car => ({ car, rel: (((car.z - st.pos) % LEN) + LEN) % LEN })).filter(o => o.rel < DRAW * SEG && o.rel > SEG * 0.3).sort((a, b) => b.rel - a.rel).forEach(o => {
            const n = Math.floor(o.rel / SEG), p = scr[n]; if(!p) return;
            const wpx = Math.max(3, p.s * 0.32 * ROAD * W / 2 * 0.5), hpx = wpx * 0.62, cx = p.x + p.s * o.car.off * ROAD * W / 2, cy = p.y;
            if(cy > p.clip + 1) return;
            c.fillStyle = '#0a0d1e'; c.fillRect(cx - wpx / 2 - 1, cy - hpx - 1, wpx + 2, hpx + 2);
            c.fillStyle = o.car.color; c.fillRect(cx - wpx / 2, cy - hpx, wpx, hpx * 0.8);
            c.fillStyle = '#0a0d1e'; c.fillRect(cx - wpx * 0.3, cy - hpx * 0.95, wpx * 0.6, hpx * 0.32);
            c.fillStyle = '#ff2e2e'; c.fillRect(cx - wpx / 2, cy - hpx * 0.35, Math.max(1, wpx * 0.14), Math.max(1, hpx * 0.2)); c.fillRect(cx + wpx / 2 - Math.max(1, wpx * 0.14), cy - hpx * 0.35, Math.max(1, wpx * 0.14), Math.max(1, hpx * 0.2));
        });
        // Spielerauto
        const px = W / 2 + st.steer * 4 + (st.crash > 0 ? Math.sin(st.crash * 60) * 3 : 0), py = H - 18;
        c.fillStyle = '#0a0d1e'; c.fillRect(px - 20, py - 21, 40, 22);
        c.fillStyle = '#66e3ff'; c.fillRect(px - 18, py - 19, 36, 14);
        c.fillStyle = '#0a0d1e'; c.fillRect(px - 11, py - 23, 22, 9); c.fillStyle = '#b8f4ff'; c.fillRect(px - 9, py - 22, 18, 6);
        c.fillStyle = '#ff2e2e'; c.fillRect(px - 18, py - 12, 7, 4); c.fillRect(px + 11, py - 12, 7, 4);
        if(st.speed > MAXV * 0.9 && st.crash <= 0){ c.fillStyle = '#ffb347'; c.fillRect(px - 5, py + 1, 10, 3); }
        // Anzeige
        c.fillStyle = '#000a'; c.fillRect(0, 0, W, 16);
        c.fillStyle = '#fff'; c.font = 'bold 11px monospace'; c.textBaseline = 'top';
        c.fillText('ZEIT ' + Math.ceil(st.time), 6, 3); c.fillText(Math.round(st.speed / MAXV * 280) + ' km/h', 100, 3); c.fillText(Math.floor(st.dist * M_PER_UNIT) + ' m', 215, 3);
        if(st.flash > 0){ c.fillStyle = '#b8f36b'; c.font = 'bold 20px monospace'; c.fillText('CHECKPOINT +' + CHECK_BONUS + ' s', 50, 70); }
    }

    // ======================================================  Spiel starten
    let rc = null;
    S.racerKey = (name, v) => { if(rc) rc.keys[name] = v; };
    S.racerStart = function(){
        const cv = $('rcCvs'); if(!cv) return;
        rc = { ctx: cv.getContext('2d'), st: newState(), keys: { left: false, right: false, brake: false }, last: Date.now(), txt: 0 };
        const map = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowDown: 'brake', s: 'brake', S: 'brake', ' ': 'brake' };
        window.activeKeyListener = e => { const n = map[e.key]; if(n){ rc.keys[n] = true; e.preventDefault(); } };
        window.activeKeyUpListener = e => { const n = map[e.key]; if(n) rc.keys[n] = false; };
        document.addEventListener('keydown', window.activeKeyListener); document.addEventListener('keyup', window.activeKeyUpListener);
        app.stInt(() => {
            if(!rc) return;
            const now = Date.now(), dt = (now - rc.last) / 1000; rc.last = now;
            const wasOver = rc.st.over; step(rc.st, dt, rc.keys); draw(rc.ctx, rc.st);
            if(now - rc.txt > 250 || rc.st.over){ rc.txt = now; say('rcs', rc.st.over ? `Zeit abgelaufen! Strecke: ${rc.st.score} m` : `Zeit: ${Math.ceil(rc.st.time)} s · ${Math.floor(rc.st.dist * M_PER_UNIT)} m · Checkpoints: ${rc.st.bonus}`); }
            if(rc.st.over && !wasOver){
                app.submitScore('racer', rc.st.score);
                if(rc.st.score >= 3000) app.offerCompletionBonus('Turbo Rush beendet (' + rc.st.score + ' m)');
            }
        }, 16);
        draw(rc.ctx, rc.st);
    };
    S._racer = { PZ, newState, step, draw, TRACK, LEN, MAXV, SEG, START_TIME, CHECK_BONUS, CHECK_EVERY_M, M_PER_UNIT };
})();