/* PLAYVERSE – News-Seite
   1) Eingebaute News (BUILTIN, hier im Code pflegen)  2) Live-News aus Firebase: playverseNews (vom Admin per PIN)  */
(function(){
  const app = window.app;
  if(!app) return;

  // ---- Hier neue Einträge oben ergänzen (ts = Date.UTC(Jahr, Monat-1, Tag, Stunde)) ----
  const BUILTIN = [
    { ts: Date.UTC(2026, 10, 14, 12), tag: 'NEU',    title: 'Profile, Wochen-Turnier, Events & Clans',
      text: 'Klicke auf einen Namen, um das Profil zu öffnen. Jede Woche gibt es ein neues Turnier-Spiel mit Ticket-Preisen für die Top 3. Gründe einen Clan und zeige dein Kürzel [TAG] überall. Dazu kommen Events wie Doppel-Tickets – schau im Bereich „Turniere“ vorbei!' },
    { ts: Date.UTC(2026, 10, 13, 18), tag: 'NEU',    title: 'Shop, Tagesbelohnung & Erfolge',
      text: 'Hol dir jeden Tag Gratis-Tickets (je länger deine Serie, desto mehr – VIP +50 %). Im neuen Shop kaufst du Namensfarben, Titel, Avatare und den Doppel-Bonus. 14 Erfolge bringen zusätzliche Tickets!' },
    { ts: Date.UTC(2026, 10, 13, 12), tag: 'NEU',    title: 'Action-Paket: Neon Arena, Space Shooter & Snake-Battle',
      text: 'Zwei neue Solo-Shooter (Top-Down-Arena mit Wellen und Powerups, vertikaler Space Shooter mit Bossen) und Snake-Battle: Echtzeit-Duell für 2 Spieler im Mehrspieler-Tab!' },
    { ts: Date.UTC(2026, 10, 12, 18), tag: 'NEU',    title: '4 neue Arcade-Klassiker',
      text: 'Pac-Man, Donkey Kong, Frogger und Asteroids sind jetzt als Solo-Spiele dabei – mit Bestenliste und Ticket-Bonus nach der Runde.' },
    { ts: Date.UTC(2026, 10, 12, 17), tag: 'NEU',    title: 'Brettspiele online',
      text: 'Mensch ärgere dich nicht (2–4 Spieler) und Mühle (2 Spieler) warten im Mehrspieler-Tab. Raum erstellen, Code teilen, los geht’s!' },
    { ts: Date.UTC(2026, 10, 12, 12), tag: 'VIP',    title: 'VIP-Rang ist da',
      text: 'Im Ticket-Menü kannst du dir für 100 Arcade-Tickets 30 Tage VIP kaufen. Dein goldener VIP-Stern erscheint im Header, im Chat, in der Freundesliste und in den Bestenlisten.' },
    { ts: Date.UTC(2026, 10, 12, 11), tag: 'UPDATE', title: 'Bestenlisten für 20+ Spiele',
      text: 'Wähle in der Bestenliste dein Spiel aus. Highscores werden jetzt zuverlässig gespeichert und korrekt sortiert.' },
    { ts: Date.UTC(2026, 10, 12, 10), tag: 'FIX',    title: 'Public Chat & Ticket-Button repariert',
      text: 'Der Chat synchronisiert wieder, und der Abschluss-Bonus nach einem Spiel funktioniert mit Wartezeit-Anzeige und Tageslimit.' }
  ];

  const TAG_COL = { NEU:'#b8f36b', UPDATE:'#66e3ff', FIX:'#ffb347', VIP:'#ffd36b', EVENT:'#ff6fa5', INFO:'#c9a0ff' };
  app.newsDb = {};
  app.newsAdmin = false;

  app.allNews = function(){
    const list = BUILTIN.map((n, i) => Object.assign({ _id: 'b' + i, builtin: true }, n));
    Object.keys(app.newsDb || {}).forEach(k => {
      const v = app.newsDb[k];
      if(v && v.title) list.push({ _id: k, builtin: false, ts: Number(v.ts) || 0, tag: v.tag || 'INFO', title: v.title, text: v.text || '' });
    });
    return list.sort((a, b) => b.ts - a.ts);
  };
  app.updateNewsBadge = function(){
    const b = document.getElementById('newsBadge');
    if(!b) return;
    const latest = (app.allNews()[0] || {}).ts || 0;
    let seen = 0; try { seen = Number(localStorage.getItem('pv_news_seen') || 0); } catch(e) {}
    b.style.display = latest > seen ? 'inline-block' : 'none';
  };
  app.renderNews = function(){
    const box = document.getElementById('newsList');
    if(!box) return;
    const list = app.allNews();
    box.innerHTML = list.map(n => {
      const col = TAG_COL[n.tag] || TAG_COL.INFO;
      const del = (app.newsAdmin && !n.builtin) ? `<button class="btn" style="padding:3px 9px;font-size:11px" onclick="app.deleteNews('${app.escapeHtml(n._id)}')">🗑 Löschen</button>` : '';
      return `<article class="news-item" style="border:1px solid #2a3560;border-left:4px solid ${col};border-radius:12px;padding:14px 16px;margin-bottom:12px;background:#121935">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px">
          <span><span class="pill" style="display:inline;padding:2px 9px;font-size:10px;font-weight:800;color:#0a0d1e;background:${col}">${app.escapeHtml(n.tag)}</span>
          <span class="muted" style="font-size:12px;margin-left:8px">${new Date(n.ts).toLocaleDateString('de-DE', { day:'2-digit', month:'long', year:'numeric' })}</span></span>${del}
        </div>
        <h3 style="margin:0 0 6px;font-size:17px">${app.escapeHtml(n.title)}</h3>
        <div style="font-size:14px;line-height:1.5;white-space:pre-wrap;color:#cfd6f5">${app.escapeHtml(n.text)}</div>
      </article>`;
    }).join('') || '<div class="muted">Noch keine News.</div>';
    const adm = document.getElementById('newsAdminBox');
    if(adm) adm.style.display = app.newsAdmin ? 'block' : 'none';
  };
  app.openNews = function(){
    app.clrAll();
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
    const v = document.getElementById('news');
    if(v) v.classList.add('active');
    app.renderNews();
    const latest = (app.allNews()[0] || {}).ts || 0;
    try { localStorage.setItem('pv_news_seen', String(latest)); } catch(e) {}
    app.updateNewsBadge();
  };
  app.newsAdminLogin = function(){
    if(app.newsAdmin){ app.newsAdmin = false; app.renderNews(); return; }
    const pin = prompt('Admin-PIN eingeben:');
    if(!pin) return;
    const ok = (typeof app.verifyPinWithServer === 'function') ? app.verifyPinWithServer(pin) : Promise.resolve(false);
    Promise.resolve(ok).then(good => {
      if(good){ app.newsAdmin = true; app.renderNews(); }
      else app.toast('Falsche PIN.', 'err');
    }).catch(err => app.dbErr('Admin-PIN', err));
  };
  app.postNews = function(){
    const t = document.getElementById('newsTitle'), x = document.getElementById('newsText'), g = document.getElementById('newsTag');
    const title = (t.value || '').trim().slice(0, 80), text = (x.value || '').trim().slice(0, 1500);
    if(!title || !text){ app.toast('Bitte Titel und Text ausfüllen.', 'err'); return; }
    if(!db){ app.toast('Firebase nicht erreichbar.', 'err'); return; }
    db.ref('playverseNews').push({ title, text, tag: g.value || 'INFO', ts: firebase.database.ServerValue.TIMESTAMP })
      .then(() => { t.value = ''; x.value = ''; app.toast('📰 News veröffentlicht!'); })
      .catch(err => app.dbErr('News veröffentlichen', err));
  };
  app.deleteNews = function(id){
    if(!db || !confirm('Diese News wirklich löschen?')) return;
    db.ref('playverseNews/' + id).remove().catch(err => app.dbErr('News löschen', err));
  };

  function listen(){
    if(typeof db === 'undefined' || !db) { app.updateNewsBadge(); return; }
    db.ref('playverseNews').limitToLast(30).on('value', s => {
      app.newsDb = s.val() || {};
      app.updateNewsBadge();
      const v = document.getElementById('news');
      if(v && v.classList.contains('active')) app.renderNews();
    }, err => console.warn('[PLAYVERSE] News-Listener:', err));
    app.updateNewsBadge();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', listen); else listen();
})();
