/* PLAYVERSE – Paket 6: Komfort – Sounds & Musik (WebAudio, keine Dateien nötig), Farbthemen, Vibration,
   Einstellungen und Handy-App (PWA: Installation + Offline-Fähigkeit).
   Einstellungen liegen pro Gerät im localStorage (pv_settings). */
(function(){
  const app = window.app;
  if(!app) return;
  const $ = id => document.getElementById(id);
  const esc = s => app.escapeHtml(s);

  // ======================================================  Einstellungen
  const DEFAULTS = { sfx: true, sfxVol: 0.6, music: 'off', musVol: 0.25, theme: 'default', vibrate: true };
  const THEMES = {
    default: { name: 'Standard',   a: '#8b5cf6', b: '#22d3ee', meta: '#090b18' },
    neon:    { name: 'Neon-Nacht', a: '#ff2e93', b: '#8b5cf6', meta: '#0e0820' },
    ocean:   { name: 'Ozean',      a: '#22d3ee', b: '#3b82f6', meta: '#06141f' },
    forest:  { name: 'Wald',       a: '#84cc16', b: '#22c55e', meta: '#07140d' },
    sunset:  { name: 'Sonnenuntergang', a: '#fb923c', b: '#ef4444', meta: '#1a0b0b' },
    mono:    { name: 'Graphit',    a: '#e5e7eb', b: '#9ca3af', meta: '#0d0d0d' }
  };
  const MOODS = { off: 'Aus', chill: '🌙 Chill', arcade: '🕹️ Arcade', focus: '🎯 Fokus' };
  function load(){
    let s = {}; try { s = JSON.parse(localStorage.getItem('pv_settings') || '{}') || {}; } catch(e) {}
    const o = Object.assign({}, DEFAULTS, s);
    if(!THEMES[o.theme]) o.theme = 'default';
    if(!MOODS[o.music]) o.music = 'off';
    o.sfxVol = Math.max(0, Math.min(1, Number(o.sfxVol))); o.musVol = Math.max(0, Math.min(1, Number(o.musVol)));
    if(!isFinite(o.sfxVol)) o.sfxVol = DEFAULTS.sfxVol; if(!isFinite(o.musVol)) o.musVol = DEFAULTS.musVol;
    o.sfx = !!o.sfx; o.vibrate = !!o.vibrate;
    return o;
  }
  app.settings = load();
  function save(){ try { localStorage.setItem('pv_settings', JSON.stringify(app.settings)); } catch(e) {} }

  // ======================================================  Themes
  app.applyTheme = function(){
    const t = THEMES[app.settings.theme] || THEMES.default;
    const root = document.documentElement;
    if(root && root.setAttribute) root.setAttribute('data-theme', app.settings.theme);
    const meta = document.querySelector && document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content', t.meta);
  };

  // ======================================================  Audio
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, sfxG = null, musG = null;
  function ensure(){
    if(!AC) return false;
    if(!ctx){
      try {
        ctx = new AC(); sfxG = ctx.createGain(); musG = ctx.createGain();
        sfxG.connect(ctx.destination); musG.connect(ctx.destination);
        sfxG.gain.value = app.settings.sfxVol; musG.gain.value = app.settings.musVol * 0.5;
      } catch(e) { ctx = null; return false; }
    }
    if(ctx.state === 'suspended' && ctx.resume) ctx.resume();
    return true;
  }
  function tone(freq, t0, dur, type, vol, dest, slideTo){
    if(!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || sfxG);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  const N = { C5: 523.25, E5: 659.25, G5: 783.99, C6: 1046.5, A5: 880, D6: 1174.7, E6: 1318.5, G6: 1568 };
  const SFX = {
    click:   t => tone(620, t, 0.05, 'square', 0.05),
    coin:    t => { tone(988, t, 0.07, 'square', 0.12); tone(1319, t + 0.07, 0.16, 'square', 0.12); },
    win:     t => [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, t + i * 0.08, 0.18, 'triangle', 0.18)),
    levelup: t => [N.C5, N.E5, N.G5, N.C6, N.E6, N.G6].forEach((f, i) => tone(f, t + i * 0.07, 0.22, 'square', 0.1)),
    ach:     t => { tone(N.G5, t, 0.1, 'triangle', 0.2); tone(N.D6, t + 0.1, 0.35, 'triangle', 0.2); },
    quest:   t => { tone(N.E5, t, 0.09, 'triangle', 0.18); tone(N.A5, t + 0.09, 0.2, 'triangle', 0.18); },
    err:     t => tone(220, t, 0.28, 'sawtooth', 0.1, null, 110),
    ping:    t => tone(880, t, 0.12, 'sine', 0.12),
    power:   t => tone(400, t, 0.2, 'square', 0.09, null, 1200)
  };
  app.sfx = function(name){
    if(!app.settings.sfx || !SFX[name]) return;
    if(!ensure()) return;
    try { SFX[name](ctx.currentTime + 0.005); } catch(e) {}
  };
  function vib(p){ if(app.settings.vibrate && navigator.vibrate) { try { navigator.vibrate(p); } catch(e) {} } }

  // ---- Musik: kleine generative Chiptune-Schleife
  const MOOD = {
    chill:  { bpm: 74,  lead: 'sine',     density: 0.42, lvol: 0.22, bvol: 0.3 },
    arcade: { bpm: 128, lead: 'square',   density: 0.78, lvol: 0.11, bvol: 0.22 },
    focus:  { bpm: 96,  lead: 'triangle', density: 0.3,  lvol: 0.26, bvol: 0.26 }
  };
  const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];          // Am – F – C – G
  const SCALE = [0, 3, 5, 7, 10];                                                     // Moll-Pentatonik
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const music = { timer: null, step: 0, next: 0, mood: 'off' };
  function scheduleStep(m, step, t){
    const spb = 60 / m.bpm / 2, bar = Math.floor(step / 8), chord = CHORDS[bar % 4], r = rng(bar * 977 + (step % 8) * 31 + 7);
    if(step % 4 === 0) tone(mtof(chord[0] - 12), t, spb * 3.6, 'triangle', m.bvol, musG);
    if(r() < m.density){
      const pool = r() < 0.55 ? chord.map(x => x + 12) : SCALE.map(x => 57 + 12 + x);
      tone(mtof(pool[Math.floor(r() * pool.length)]), t, spb * (0.9 + r() * 0.8), m.lead, m.lvol, musG);
    }
  }
  function musicTick(){
    const m = MOOD[music.mood]; if(!m || !ctx) return;
    const spb = 60 / m.bpm / 2;
    if(music.next < ctx.currentTime) music.next = ctx.currentTime + 0.05;
    while(music.next < ctx.currentTime + 0.25){ scheduleStep(m, music.step++, music.next); music.next += spb; }
  }
  app.musicStop = function(){ if(music.timer){ clearInterval(music.timer); music.timer = null; } music.mood = 'off'; };
  app.musicStart = function(mood){
    app.musicStop();
    if(!MOOD[mood] || !ensure()) return;
    music.mood = mood; music.step = 0; music.next = 0;
    musG.gain.value = app.settings.musVol * 0.5;
    musicTick(); music.timer = setInterval(musicTick, 40);
  };
  // Browser erlauben Ton erst nach einer Berührung/Taste
  let gestured = false;
  function onGesture(){
    if(gestured) return; gestured = true;
    if(app.settings.music !== 'off') app.musicStart(app.settings.music); else ensure();
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, onGesture, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if(!ctx) return;
    if(document.hidden){ if(music.timer){ clearInterval(music.timer); music.timer = null; } if(ctx.suspend) ctx.suspend(); }
    else { if(ctx.resume) ctx.resume(); if(app.settings.music !== 'off' && gestured && !music.timer) app.musicStart(app.settings.music); }
  });

  // ======================================================  Setzen & Anwenden
  app.setSetting = function(key, value){
    if(!(key in DEFAULTS)) return;
    if(key === 'sfxVol' || key === 'musVol') value = Math.max(0, Math.min(1, Number(value) || 0));
    if(key === 'theme' && !THEMES[value]) return;
    if(key === 'music' && !MOODS[value]) return;
    if(key === 'sfx' || key === 'vibrate') value = !!value;
    app.settings[key] = value; save();
    if(key === 'theme') app.applyTheme();
    if(key === 'music'){ if(value === 'off') app.musicStop(); else { gestured = true; app.musicStart(value); } }
    if(key === 'musVol' && musG) musG.gain.value = value * 0.5;
    if(key === 'sfxVol' && sfxG) sfxG.gain.value = value;
    if(key === 'sfx' && value) { gestured = true; app.sfx('coin'); }
    if(key === 'vibrate' && value) vib(40);
    if(key === 'sfxVol') app.sfx('click');
    if(key === 'theme' || key === 'music' || key === 'sfx' || key === 'vibrate') app.renderSettings();
  };

  // ======================================================  Töne bei vorhandenen Ereignissen (über die Toast-Meldungen)
  const _toast = app.toast;
  app.toast = function(msg, kind){
    _toast.call(this, msg, kind);
    try {
      const m = String(msg || ''), start = m.slice(0, 2);
      if(kind === 'err' || m.indexOf('⚠️') === 0){ app.sfx('err'); vib(80); }
      else if(m.indexOf('🎉') === 0){ app.sfx('levelup'); vib([30, 40, 30, 40, 60]); }
      else if(m.indexOf('🏅') === 0){ app.sfx('ach'); vib([30, 40, 30]); }
      else if(m.indexOf('✅') === 0){ app.sfx('quest'); vib(30); }
      else if(m.indexOf('🏆') === 0 || m.indexOf('⚔️') === 0){ app.sfx('win'); vib([30, 30, 30]); }
      else if(m.indexOf('🎁') === 0 || m.indexOf('🛍️') === 0 || m.indexOf('🚀') === 0 || m.indexOf('🛡️') === 0){ app.sfx('coin'); vib(25); }
      else if(m.indexOf('⚡') === 0){ app.sfx('power'); }
    } catch(e) {}
  };
  // Klick-Geräusch für Schaltflächen (nicht für Spiele-Steuerkreuze, die nutzen pointerdown)
  document.addEventListener('click', e => { try { if(e.target && e.target.closest && e.target.closest('button')) app.sfx('click'); } catch(x) {} }, true);
  // Ping bei neuer Chat-Nachricht von anderen
  const _chat = app.renderChatMessages;
  app._chatLast = null;
  app.renderChatMessages = function(src){
    _chat.call(this, src);
    try {
      const list = Array.isArray(src) ? src : Object.keys(src || {}).map(k => Object.assign({ _k: k }, src[k]));
      const last = list[list.length - 1], key = last ? (last._k || last.ts || last.text) : null;
      if(app._chatLast !== null && key && key !== app._chatLast && last.uid !== app.currentUser) app.sfx('ping');
      if(key) app._chatLast = key; else if(app._chatLast === null) app._chatLast = '';
    } catch(e) {}
  };

  // ======================================================  Einstellungen-Oberfläche
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if($('settingsBox')) app.renderSettings(); });
  window.addEventListener('appinstalled', () => { installEvt = null; app.toast('🚀 PLAYVERSE wurde installiert!'); if($('settingsBox')) app.renderSettings(); });
  app.installApp = function(){
    if(!installEvt) return;
    installEvt.prompt();
    Promise.resolve(installEvt.userChoice).then(() => { installEvt = null; app.renderSettings(); }).catch(() => {});
  };
  const standalone = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  app.renderSettings = function(){
    const box = $('settingsBox'); if(!box) return;
    const s = app.settings, ios = /iphone|ipad|ipod/i.test((navigator.userAgent || ''));
    const install = standalone() ? '<div class="muted" style="font-size:13px">✓ Du nutzt PLAYVERSE bereits als App.</div>'
      : installEvt ? '<button class="btn primary" onclick="app.installApp()">📲 App installieren</button>'
      : ios ? '<div class="muted" style="font-size:13px">iPhone/iPad: Tippe in Safari auf <b>Teilen</b> und dann auf <b>„Zum Home-Bildschirm“</b>.</div>'
      : '<div class="muted" style="font-size:13px">Öffne das Browser-Menü und wähle <b>„App installieren“</b> bzw. <b>„Zum Startbildschirm hinzufügen“</b>. (Der Button erscheint hier automatisch, sobald dein Browser es anbietet.)</div>';
    box.innerHTML = `
      <h4 class="shop-h" style="margin-top:0">🔊 Ton</h4>
      <label class="set-row"><input type="checkbox" ${s.sfx ? 'checked' : ''} onchange="app.setSetting('sfx', this.checked)"> Soundeffekte</label>
      <label class="set-row">Lautstärke <input type="range" min="0" max="100" value="${Math.round(s.sfxVol * 100)}" oninput="app.setSetting('sfxVol', this.value / 100)" style="flex:1"></label>
      <label class="set-row"><input type="checkbox" ${s.vibrate ? 'checked' : ''} onchange="app.setSetting('vibrate', this.checked)"> Vibration (Handy)</label>
      <h4 class="shop-h">🎵 Hintergrundmusik</h4>
      <div class="chips" style="margin-bottom:8px">${Object.keys(MOODS).map(k => `<button class="btn${s.music === k ? ' primary' : ''}" style="font-size:13px" onclick="app.setSetting('music','${k}')">${MOODS[k]}</button>`).join('')}</div>
      <label class="set-row">Musik-Lautstärke <input type="range" min="0" max="100" value="${Math.round(s.musVol * 100)}" oninput="app.setSetting('musVol', this.value / 100)" style="flex:1"></label>
      <h4 class="shop-h">🎨 Farbthema</h4>
      <div class="theme-grid">${Object.keys(THEMES).map(k => `<button class="theme-opt${s.theme === k ? ' on' : ''}" onclick="app.setSetting('theme','${k}')" aria-label="${esc(THEMES[k].name)}">
        <span class="theme-sw" style="background:linear-gradient(135deg,${THEMES[k].a},${THEMES[k].b})"></span><span>${esc(THEMES[k].name)}</span></button>`).join('')}</div>
      <h4 class="shop-h">📲 Handy-App</h4>${install}
      <div class="muted" style="font-size:11px;margin-top:10px">Die Einstellungen gelten nur für dieses Gerät. Als installierte App läuft PLAYVERSE im Vollbild und startet auch offline (Online-Funktionen brauchen Internet).</div>`;
  };
  const _sub = app.openSubTab;
  app.openSubTab = function(tab){ _sub.call(this, tab); if(tab === 'settings') this.renderSettings(); };

  // ======================================================  PWA: Service Worker
  function registerSW(){
    if(!('serviceWorker' in navigator)) return;
    if(!(location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) return;
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing; if(!w) return;
        w.addEventListener('statechange', () => { if(w.state === 'installed' && navigator.serviceWorker.controller) app.toast('🚀 Neue Version bereit – beim nächsten Neuladen aktiv.'); });
      });
    }).catch(err => console.warn('[PLAYVERSE] Service Worker:', err));
  }
  if(document.readyState === 'complete') registerSW(); else window.addEventListener('load', registerSW);

  app.applyTheme();
})();
