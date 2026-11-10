
window.multi = (function(){
    const M = {};
    M.gameType=''; M.roomRef=null; M.roomCode=''; M.player='p1'; M.playerName=''; M.roomListener=null;

    M.prepare = function(type){ 
        app.clrAll(); 
        M.gameType=type; 
        document.getElementById('ra').style.display='none'; 
        document.querySelectorAll('.view').forEach(x=>x.classList.remove('active')); 
        let ot = document.getElementById('online');
        if(ot) ot.classList.add('active'); 
    };
    
    function ready(){if(!db){alert('Firebase nicht initialisiert.');return false}return true}
    function scramble(w){ let a=w.split(''); for(let i=0;i<a.length;i++){let j=Math.floor(Math.random()*a.length); let t=a[i]; a[i]=a[j]; a[j]=t;} return a.join(''); }
    const multiWords=["APFEL","SPIEL","STROM","LICHT","KRAFT"];
    const multiTexts=["PLAYVERSE IST SUPER","SCHNELLER TIPPEN GEWINNT","ONLINE GAMING MACHT SPASS"];

    M.createRoom = function(){
      if(!ready())return; M.player='p1'; M.playerName=document.getElementById('hn').value.trim()||'Spieler 1'; M.roomCode=Math.random().toString(36).slice(2,8).toUpperCase(); M.roomRef=db.ref('playverseRooms/'+M.roomCode);
      M.roomRef.onDisconnect().remove();
      let d = {game:M.gameType, players:{p1:M.playerName}, turn:'p1', status:'Warte auf Spieler 2'};
      if(M.gameType==='chess') d.fen='start';
      else if(M.gameType==='uno') { d.hands={p1:unoHand(),p2:[]}; d.pile=[unoDraw()]; }
      else if(M.gameType==='c4o') d.c4 = Array(42).fill(0);
      else if(M.gameType==='ttto') d.ttt = Array(9).fill('');
      else if(M.gameType==='bato') { d.b1=[]; d.b2=[]; for(let i=0;i<5;i++){d.b1.push(Math.floor(Math.random()*25));d.b2.push(Math.floor(Math.random()*25));} d.h1=[]; d.h2=[]; }
      else if(M.gameType==='rpso') { d.c1=''; d.c2=''; }
      else if(M.gameType==='diceo') { d.d1=0; d.d2=0; }
      else if(M.gameType==='bingo') { d.b1=0; d.b2=0; }
      else if(M.gameType==='wordo') { let word=multiWords[Math.floor(Math.random()*multiWords.length)]; d.w=word; d.scr=scramble(word); }
      else if(M.gameType==='coin_o') { d.c1=''; d.c2=''; d.r=''; }
      else if(M.gameType==='guess_o') { d.sec=Math.floor(Math.random()*100)+1; }
      else if(M.gameType==='react_o') { d.go=Date.now()+5000+Math.random()*3000; d.w=''; }
      else if(M.gameType==='click_o') { d.c1=0; d.c2=0; }
      else if(M.gameType==='type_o') { d.text=multiTexts[Math.floor(Math.random()*multiTexts.length)]; d.w=''; }
      else if(M.gameType==='war_o') { d.c1=0; d.c2=0; d.s1=0; d.s2=0; }
      else if(M.gameType==='treasure_o') { d.tr=Math.floor(Math.random()*25); d.w=''; }
      else if(M.gameType==='math_o') { let a=Math.floor(Math.random()*20),b=Math.floor(Math.random()*20); d.q=`${a}+${b}`; d.ans=a+b; d.w=''; }
      else if(M.gameType==='roulette_o') { d.c1=''; d.c2=''; d.r=''; }
      else if(M.gameType==='color_o') { d.c1=Math.floor(Math.random()*3); d.c2=Math.floor(Math.random()*3); d.w=''; d.nxt=Date.now()+2000; }
      else if(M.gameType==='colorwar') { d.grid = Array(100).fill(0); d.started = false; d.endTime = 0; }
      M.roomRef.set(d).then(M.watch);
    };

    M.joinRoom = function(){
      if(!ready())return; M.roomCode=document.getElementById('jc').value.trim().toUpperCase(); M.playerName=document.getElementById('jn').value.trim()||'Spieler 2'; M.roomRef=db.ref('playverseRooms/'+M.roomCode);
      M.roomRef.once('value').then(s=>{
        if(!s.exists()) return alert('Raum nicht gefunden.');
        let d = s.val();
        let pCount = Object.keys(d.players||{}).length;
        let maxP = (d.game === 'colorwar') ? 4 : 2;
        if(pCount >= maxP) return alert('Raum ist bereits voll.');
        M.player = 'p' + (pCount + 1); 
        let setp = M.roomRef.child('players/'+M.player).set(M.playerName);
        if(d.game==='uno' && M.player==='p2') setp=Promise.all([setp,M.roomRef.child('hands/p2').set(unoHand())]);
        if(d.game==='react_o' && M.player==='p2') setp=Promise.all([setp,M.roomRef.update({go:Date.now()+3000+Math.random()*3000})]);
        setp.then(M.watch);
      });
    };

    
    M.acceptDirectInvite = function(game, code, joinerName) {
        M.prepare(game);
        document.getElementById('jc').value = code;
        document.getElementById('jn').value = joinerName || 'Spieler 2';
        M.joinRoom();
    };
    M.renderQuickInvites = function() {
        let bar = document.getElementById('quickInviteBar');
        if(!bar) return;
        if(!app.currentUser || !app.userData || !app.userData.friends) {
            bar.innerHTML = `<button class="btn" style="font-size:12px" onclick="app.openModal('friends')">👥 Freunde einladen (Account nötig)</button>`;
            return;
        }
        let frs = app.userData.friends;
        let fKeys = Object.keys(frs);
        if(fKeys.length === 0) {
            bar.innerHTML = `<button class="btn" style="font-size:12px" onclick="app.openModal('friends')">👥 Freunde hinzufügen & einladen</button>`;
            return;
        }
        bar.innerHTML = `<div class="row"><span class="muted" style="font-size:12px">Schnell-Einladung:</span>` +
            fKeys.map(fk => `<button class="btn primary" style="padding:6px 11px;font-size:12px" onclick="app.sendInvite('${fk}')">📩 ${frs[fk]} einladen</button>`).join('') +
            `</div>`;
    };

    M.watch = function(){
      M.renderQuickInvites();
      document.getElementById('ra').style.display='block'; document.getElementById('rc').textContent=M.roomCode;
      if(M.roomListener) M.roomRef.off('value',M.roomListener);
      M.roomListener=s=>{
        let d=s.val(); 
        if(!d){
            if(document.getElementById('online').classList.contains('active')) { alert('Raum geschlossen.'); app.home(); }
            return;
        }
        window.td=d; let op=M.player==='p1'?'p2':'p1';
        
        if(app.idleTimer) clearTimeout(app.idleTimer);
        app.idleTimer = setTimeout(() => {
            alert('Sitzung wurde wegen Inaktivität (1 Min) beendet!');
            if(M.player==='p1' && M.roomRef) M.roomRef.remove();
            app.home();
        }, 60000);
        
        let isFinished = false;
        let stat = d.status || '';
        if(stat.includes('gewinnt') || stat.includes('Unentschieden') || stat.includes('GEWINNT') || d.w || (stat.includes('P1') && stat.includes('P2'))) isFinished = true;
        if(d.game==='colorwar' && d.started && Date.now()>d.endTime) isFinished = true;
        
        if(isFinished) {
            document.getElementById('rstatus').textContent = Object.values(d.players||{}).join(' VS ')+' · '+stat + ' (Neustart in 5s...)';
            if(M.player==='p1' && !app.resetTimer) app.resetTimer = setTimeout(() => { M.po('auto_reset'); app.resetTimer=null; }, 5000);
        } else {
            if(app.resetTimer){ clearTimeout(app.resetTimer); app.resetTimer=null; }
            document.getElementById('rstatus').textContent = Object.values(d.players||{}).join(' VS ')+' · '+stat;
        }

        let og=document.getElementById('og');
        if(d.game==='ttto'){
          let h = `<div class="ttt">`; d.ttt.forEach((v, i) => { h+=`<button ${(!d.players.p2||d.turn!==M.player||v!==''||isFinished)?'disabled':''} onclick="multi.po('ttt',${i})">${v}</button>`; }); h+=`</div>`; og.innerHTML=h;
        } else if(d.game==='c4o'){
          let h=`<div class="board">`; for(let r=0;r<6;r++)for(let c=0;c<7;c++){ let val=d.c4[r*7+c]; h+=`<button class="hole" ${(!d.players.p2||d.turn!==M.player||isFinished)?'disabled':''} onclick="multi.po('c4',${c})"><div class="disc ${val===1?'red':val===2?'yellow':''}"></div></button>`; } h+=`</div>`; og.innerHTML=h;
        } else if(d.game==='rpso'){
          let done = d.c1!=='' && d.c2!=='';
          let h=`<div class="row" style="font-size:50px;margin:20px"><div style="opacity:${d.c1?1:0.3}">${done?d.c1:'🔒'}</div><div>VS</div><div style="opacity:${d.c2?1:0.3}">${done?d.c2:'🔒'}</div></div>`;
          if(!done) h+=`<div class="row"><button class="btn" onclick="multi.po('rps','✊')">✊</button><button class="btn" onclick="multi.po('rps','✋')">✋</button><button class="btn" onclick="multi.po('rps','✌️')">✌️</button></div>`;
          if(done){ let w='Unentschieden'; if((d.c1==='✊'&&d.c2==='✌️')||(d.c1==='✋'&&d.c2==='✊')||(d.c1==='✌️'&&d.c2==='✋'))w='P1 gewinnt'; else if(d.c1!==d.c2)w='P2 gewinnt'; d.status=w; document.getElementById('rstatus').textContent=w + ' (Neustart in 5s...)';}
          og.innerHTML=h;
        } else if(d.game==='diceo'){
          let done = d.d1!==0 && d.d2!==0;
          let h=`<div class="row" style="font-size:50px;margin:20px"><div style="opacity:${d.d1?1:0.3}">${d.d1||'🎲'}</div><div>VS</div><div style="opacity:${d.d2?1:0.3}">${d.d2||'🎲'}</div></div>`;
          if(!done) h+=`<button class="btn primary" onclick="multi.po('dice')">Würfeln</button>`;
          if(done){ let w = d.d1===d.d2?'Unentschieden':(d.d1>d.d2?'P1 gewinnt':'P2 gewinnt'); d.status=w; document.getElementById('rstatus').textContent=w + ' (Neustart in 5s...)'; }
          og.innerHTML=h;
        } else if(d.game==='bato'){
          let eMe=M.player==='p1'?d.h1:d.h2, eEn=M.player==='p1'?d.h2:d.h1, bMe=M.player==='p1'?d.b1:d.b2, bEn=M.player==='p1'?d.b2:d.b1;
          let h=`<div class="row"><div style="text-align:center"><p>Gegner</p><div class="grid5x5">`;
          for(let i=0;i<25;i++){ let c=(eEn||[]).includes(i)?(bEn.includes(i)?'#e34251':'#fff'):'#26314f'; h+=`<div style="background:${c};cursor:pointer;border-radius:4px" ${isFinished?'':'onclick="multi.po(\'bat\','+i+')"'}></div>`; }
          h+=`</div></div><div style="text-align:center"><p>Dein Feld</p><div class="grid5x5">`;
          for(let i=0;i<25;i++){ let c=bMe.includes(i)?'#b8f36b':'#26314f'; if((eMe||[]).includes(i)) c='#e34251'; h+=`<div style="background:${c};border-radius:4px"></div>`; }
          h+=`</div></div></div>`; 
          let allHit = bEn.every(s => (eEn||[]).includes(s));
          if(allHit) h+= `<h2>${M.playerName} GEWINNT! (Neustart in 5s...)</h2>`;
          og.innerHTML=h;
        } else if(d.game==='wordo'){
          let h=`<p class="big" style="letter-spacing:10px">${d.scr}</p><input id="wdi" maxlength="5" style="text-transform:uppercase;width:150px;text-align:center;font-weight:bold" placeholder="Lösung" onkeydown="if(event.key==='Enter')multi.po('word')"><button class="btn primary" onclick="multi.po('word')">Prüfen</button>`;
          if(isFinished) h=`<h2>${d.status} (Neustart in 5s...)</h2>`; og.innerHTML=h;
        } else if(d.game==='bingo'){
          let h=`<button class="btn primary" style="font-size:40px;padding:30px" onclick="multi.po('bingo')">BINGO! (${M.player==='p1'?d.b1:d.b2}/5)</button>`;
          if(isFinished) h=`<h2>${d.status} (Neustart in 5s...)</h2>`; og.innerHTML=h;
        } else if(d.game==='coin_o'){
          let h = `<div class="row"><button class="btn" onclick="multi.po('coin','Kopf')">KOPF</button><button class="btn" onclick="multi.po('coin','Zahl')">ZAHL</button></div>`;
          if(d.c1&&d.c2) { h = `<div class="big">${d.r}</div><p>P1: ${d.c1} | P2: ${d.c2}</p>`; document.getElementById('rstatus').textContent='Beendet (Neustart in 5s...)'; }
          og.innerHTML=h;
        } else if(d.game==='guess_o'){
          let h=`<input id="gsoi" type="number" placeholder="1-100" onkeydown="if(event.key==='Enter')multi.po('guess')"><button class="btn primary" onclick="multi.po('guess')">Raten</button>`;
          if(isFinished) h=`<h2>${d.status} (Neustart in 5s...)</h2>`; og.innerHTML=h;
        } else if(d.game==='react_o'){
          let isGo = Date.now() >= d.go;
          let h=`<button class="btn primary" style="font-size:30px;padding:40px;background:${isGo?'#2aa66c':'#e34251'}" onclick="multi.po('react')">${isGo?'DRÜCKEN!':'WARTE...'}</button>`;
          if(d.w) h=`<h2>${d.w} gewinnt! (Neustart in 5s...)</h2>`;
          if(!d.w && !isGo) app.stTo(M.watch, 500); 
          og.innerHTML=h;
        } else if(d.game==='click_o'){
          let h=`<div class="row" style="margin:20px;font-size:24px">Du: ${d[M.player==='p1'?'c1':'c2']} | Gegner: ${d[op==='p1'?'c1':'c2']}</div><button class="btn primary" style="font-size:40px;padding:30px" onclick="multi.po('click')">KLICK</button>`;
          if(isFinished) h=`<h2>${d.status} (Neustart in 5s...)</h2>`; og.innerHTML=h;
        } else if(d.game==='type_o'){
          let h=`<p class="big" style="font-size:24px">${d.text}</p><input id="tyo" style="width:80%" placeholder="Tippe exakt ab" onkeydown="if(event.key==='Enter')multi.po('type')"><button class="btn primary" onclick="multi.po('type')">Fertig</button>`;
          if(d.w) h=`<h2>${d.w} gewinnt! (Neustart in 5s...)</h2>`; og.innerHTML=h;
        } else if(d.game==='war_o'){
          let h=`<div class="row" style="font-size:50px;margin:20px"><div style="opacity:${d.c1?1:0.3}">${d.c1||'🃏'}</div><div>VS</div><div style="opacity:${d.c2?1:0.3}">${d.c2||'🃏'}</div></div><p>Punkte: P1 ${d.s1} - ${d.s2} P2</p>`;
          if(!d[M.player==='p1'?'c1':'c2']) h+=`<button class="btn primary" onclick="multi.po('war')">Karte ziehen</button>`;
          if(d.c1&&d.c2&&M.player==='p1') app.stTo(()=>M.roomRef.update({c1:0,c2:0}), 2000);
          og.innerHTML=h;
        } else if(d.game==='treasure_o'){
          let h=`<div class="grid5x5">`; for(let i=0;i<25;i++){ let c='#26314f'; if(d.w&&i===d.tr)c='#e6b72d'; h+=`<div style="background:${c};cursor:pointer;border-radius:4px" onclick="multi.po('tres',${i})"></div>`; } h+=`</div>`;
          if(d.w) h+=`<h2>${d.w} hat den Schatz gefunden! (Neustart in 5s...)</h2>`; og.innerHTML=h;
        } else if(d.game==='math_o'){
          let h=`<p class="big">${d.q} = ?</p><input id="mto" type="number" style="width:100px" onkeydown="if(event.key==='Enter')multi.po('math')"><button class="btn primary" onclick="multi.po('math')">Lösen</button>`;
          if(d.w) h=`<h2>${d.w} gewinnt! (Neustart in 5s...)</h2>`; og.innerHTML=h;
        } else if(d.game==='roulette_o'){
          let h = `<div class="row"><button class="btn" style="background:#e34251" onclick="multi.po('roul','Rot')">ROT</button><button class="btn" style="background:#111" onclick="multi.po('roul','Schwarz')">SCHWARZ</button></div>`;
          if(d.c1&&d.c2) { h = `<div class="big">${d.r}</div><p>P1: ${d.c1} | P2: ${d.c2}</p>`; document.getElementById('rstatus').textContent='Beendet (Neustart in 5s...)'; }
          og.innerHTML=h;
        } else if(d.game==='color_o'){
          let cols=['#e34251','#347de4','#2aa66c'];
          let h=`<div class="row"><div style="width:60px;height:60px;border-radius:8px;background:${cols[d.c1]}"></div><div style="width:60px;height:60px;border-radius:8px;background:${cols[d.c2]}"></div></div>`;
          if(d.w) h+=`<h2>${d.w} gewinnt! (Neustart in 5s...)</h2>`; else h+=`<button class="btn primary" style="margin-top:20px" onclick="multi.po('color')">MATCH!</button>`;
          if(!d.w && M.player==='p1' && Date.now()>d.nxt) M.roomRef.update({c1:Math.floor(Math.random()*3),c2:Math.floor(Math.random()*3),nxt:Date.now()+1500});
          if(!d.w) app.stTo(M.watch, 500);
          og.innerHTML=h;
        } else if(d.game==='colorwar'){
          let cols = {p1:'#e34251', p2:'#347de4', p3:'#2aa66c', p4:'#e6b72d'};
          let h = `<div class="row" style="margin-bottom:15px">`;
          for(let p in d.players) h+= `<div class="pill" style="background:${cols[p]};color:#fff;border:0">${d.players[p]}</div>`;
          h += `</div>`;
          let isOver = d.started && Date.now() > d.endTime;
          if(!d.started) {
            h += `<h3>Warten auf Spieler... (${Object.keys(d.players).length}/4)</h3>`;
            if(M.player==='p1') h += `<button class="btn primary" onclick="multi.po('cw_start')">Spiel Starten (30s)</button>`;
          } else if (!isOver) {
            let left = Math.ceil((d.endTime - Date.now())/1000);
            h += `<h3>Zeit läuft! ${left}s</h3>`;
            app.stTo(M.watch, 500); 
          } else {
            let counts = {p1:0, p2:0, p3:0, p4:0};
            (d.grid||[]).forEach(v => { if(v) counts[v]++; });
            let winP = Object.keys(counts).reduce((a,b)=>counts[a]>counts[b]?a:b);
            h += `<h2>${d.players[winP]||winP} gewinnt mit ${counts[winP]} Feldern! (Neustart in 5s)</h2>`;
          }
          h += `<div style="display:grid;grid-template-columns:repeat(10,min(8vw,35px));gap:2px;justify-content:center;margin:20px auto">`;
          (d.grid||Array(100).fill(0)).forEach((v, i) => {
            let bg = v ? cols[v] : '#26314f';
            h += `<div style="aspect-ratio:1;background:${bg};cursor:pointer;border-radius:4px" ${(!d.started || isOver)?'':'onclick="multi.po(\'cw_paint\','+i+')"'} ></div>`;
          });
          h += `</div>`;
          og.innerHTML = h;
        } else if(d.game==='uno'){ renderUno(d); } else if(d.game==='chess'){ renderChess(d); }
      };
      M.roomRef.on('value',M.roomListener);
    };

    M.po = function(act, val){
      let d=window.td, n=structuredClone(d), p1=M.player==='p1', pStr=p1?'p1':'p2', pMe=p1?'c1':'c2', pEn=p1?'c2':'c1';
      if(act==='ttt'){ n.ttt[val]=p1?'X':'O'; n.turn=p1?'p2':'p1'; M.roomRef.set(n); }
      else if(act==='c4'){ for(let r=5;r>=0;r--){if(!n.c4[r*7+val]){n.c4[r*7+val]=p1?1:2; n.turn=p1?'p2':'p1'; M.roomRef.set(n); return;}} }
      else if(act==='rps'){ M.roomRef.child(pMe).set(val); }
      else if(act==='dice'){ M.roomRef.child(p1?'d1':'d2').set(Math.floor(Math.random()*6)+1); }
      else if(act==='bat'){ if(d.turn!==M.player)return; let arr=n[p1?'h2':'h1']||[]; if(!arr.includes(val)){arr.push(val); M.roomRef.update({[p1?'h2':'h1']:arr, turn:p1?'p2':'p1'});} }
      else if(act==='word'){ if(document.getElementById('wdi').value.toUpperCase()===d.w) M.roomRef.update({status:M.playerName+' gewinnt!'}); }
      else if(act==='bingo'){ let v=(d[p1?'b1':'b2']||0)+1; if(v>=5)M.roomRef.update({status:M.playerName+' gewinnt!'}); else M.roomRef.update({[p1?'b1':'b2']:v}); }
      else if(act==='coin'){ let r=Math.random()>0.5?'Kopf':'Zahl'; M.roomRef.update({[pMe]:val, r:r, status:(d[pEn]?'Beendet':'Warte...')}); }
      else if(act==='guess'){ if(parseInt(document.getElementById('gsoi').value)===d.sec) M.roomRef.update({status:M.playerName+' gewinnt!'}); }
      else if(act==='react'){ if(Date.now()>=d.go && !d.w) M.roomRef.update({w:M.playerName, status:M.playerName+' war schneller!'}); }
      else if(act==='click'){ let v=(d[pMe]||0)+1; if(v>=50)M.roomRef.update({status:M.playerName+' gewinnt!'}); else M.roomRef.update({[pMe]:v}); }
      else if(act==='type'){ if(document.getElementById('tyo').value===d.text) M.roomRef.update({w:M.playerName, status:M.playerName+' gewinnt!'}); }
      else if(act==='war'){ let card=Math.floor(Math.random()*13)+1; if(d[pEn]){ let n1=p1?card:d.c1, n2=p1?d.c2:card; let sw=n1>n2?1:(n2>n1?2:0); M.roomRef.update({[pMe]:card, s1:d.s1+(sw===1?1:0), s2:d.s2+(sw===2?1:0)}); }else{M.roomRef.update({[pMe]:card});} }
      else if(act==='tres'){ if(val===d.tr) M.roomRef.update({w:M.playerName}); }
      else if(act==='math'){ if(parseInt(document.getElementById('mto').value)===d.ans) M.roomRef.update({w:M.playerName}); }
      else if(act==='roul'){ let r=Math.random()>0.5?'Rot':'Schwarz'; M.roomRef.update({[pMe]:val, r:r, status:(d[pEn]?'Beendet':'Warte...')}); }
      else if(act==='color'){ if(d.c1===d.c2 && !d.w) M.roomRef.update({w:M.playerName}); }
      else if(act==='cw_start'){ M.roomRef.update({started:true, endTime:Date.now()+30000, grid:Array(100).fill(0)}); }
      else if(act==='cw_paint'){ if(d.started && Date.now()<d.endTime){ M.roomRef.child('grid/'+val).set(M.player); } }
      else if(act==='auto_reset'){
        let rd = {status:'Warte auf Spieler...', turn:'p1', w:'', c1:'', c2:'', s1:(d.s1||0), s2:(d.s2||0)};
        if(d.game==='chess') rd.fen='start';
        else if(d.game==='uno') { rd.hands={p1:unoHand(),p2:unoHand()}; rd.pile=[unoDraw()]; rd.turn='p1'; rd.status='Runde 2!'; }
        else if(d.game==='c4o') { rd.c4 = Array(42).fill(0); rd.status = 'Neue Runde'; }
        else if(d.game==='ttto') { rd.ttt = Array(9).fill(''); rd.status = 'Neue Runde'; }
        else if(d.game==='bato') { rd.b1=[]; rd.b2=[]; for(let i=0;i<5;i++){rd.b1.push(Math.floor(Math.random()*25));rd.b2.push(Math.floor(Math.random()*25));} rd.h1=[]; rd.h2=[]; rd.status='Schiffe neu versteckt'; }
        else if(d.game==='diceo') { rd.d1=0; rd.d2=0; rd.status = 'Neu würfeln!'; }
        else if(d.game==='bingo') { rd.b1=0; rd.b2=0; rd.status = 'Neues Bingo'; }
        else if(d.game==='wordo') { let word=multiWords[Math.floor(Math.random()*multiWords.length)]; rd.w=word; rd.scr=scramble(word); rd.status = 'Neues Wort'; }
        else if(d.game==='coin_o') { rd.r=''; rd.status='Münze bereit'; }
        else if(d.game==='guess_o') { rd.sec=Math.floor(Math.random()*100)+1; rd.status='Neue Zahl'; }
        else if(d.game==='react_o') { rd.go=Date.now()+5000+Math.random()*3000; rd.w=''; rd.status='Aufpassen...'; }
        else if(d.game==='click_o') { rd.c1=0; rd.c2=0; rd.status='Neues Rennen'; }
        else if(d.game==='type_o') { rd.text=multiTexts[Math.floor(Math.random()*multiTexts.length)]; rd.w=''; rd.status='Neu tippen'; }
        else if(d.game==='war_o') { rd.c1=0; rd.c2=0; } 
        else if(d.game==='treasure_o') { rd.tr=Math.floor(Math.random()*25); rd.w=''; rd.status='Schatz versteckt'; }
        else if(d.game==='math_o') { let a=Math.floor(Math.random()*20),b=Math.floor(Math.random()*20); rd.q=`${a}+${b}`; rd.ans=a+b; rd.w=''; rd.status='Neue Aufgabe'; }
        else if(d.game==='roulette_o') { rd.r=''; rd.status='Einsätze bitte'; }
        else if(d.game==='color_o') { rd.c1=Math.floor(Math.random()*3); rd.c2=Math.floor(Math.random()*3); rd.w=''; rd.nxt=Date.now()+2000; rd.status='Achtung...'; }
        else if(d.game==='colorwar') { rd.grid = Array(100).fill(0); rd.started=false; rd.endTime=0; rd.status='Bereit'; }
        M.roomRef.update(rd);
      }
    };

    const colors=['red','blue','green','yellow'];function unoDeck(){let a=[];for(let c of colors){a.push({c,v:'0'});for(let v of ['1','1','2','2','3','3','4','4','5','5','6','6','7','7','8','8','9','9','skip','reverse','+2'])a.push({c,v})}for(let i=0;i<4;i++)a.push({c:'wild',v:'wild'},{c:'wild',v:'+4'});return a.sort(()=>Math.random()-.5)}function unoDraw(){return unoDeck()[0]}function unoHand(){return Array.from({length:7},unoDraw)}function unoText(c){return c.v==='skip'?'⊘':c.v==='reverse'?'⇄':c.v}
    function renderUno(d){let el=document.getElementById('og'),hand=d.hands[M.player]||[],op=M.player==='p1'?'p2':'p1',top=d.pile[d.pile.length-1],myTurn=d.turn===M.player&&d.players.p2;el.innerHTML=`<div class="muted">Deine Karten: ${hand.length} · Gegner: ${(d.hands[op]||[]).length}</div><div style="margin:15px">Obere Karte<div class="code" style="font-size:24px">${top.c} ${unoText(top)}</div></div><div class="status">${myTurn?'Du bist dran!':'Warten...'}</div><div id="uh" class="row"></div><button class="btn" id="udraw" ${myTurn?'':'disabled'}>Ziehen</button>`;let h=document.getElementById('uh');hand.forEach((c,i)=>{let b=document.createElement('button');b.className='btn';b.textContent=c.c+' '+unoText(c);b.disabled=!myTurn||!(c.c==='wild'||c.c===top.c||c.v===top.v);b.onclick=()=>{let n=structuredClone(d),c2=n.hands[M.player].splice(i,1)[0];if(c2.c==='wild')c2.c=({rot:'red',blau:'blue',grün:'green',gelb:'yellow'})[(prompt('Farbe: rot, blau, grün, gelb','rot')||'rot').toLowerCase()]||'blue';n.pile.push(c2);n.turn=op;if(['skip','reverse'].includes(c2.v))n.turn=M.player;if(c2.v==='+2')n.hands[n.turn].push(unoDraw(),unoDraw());if(c2.v==='+4')n.hands[n.turn].push(unoDraw(),unoDraw(),unoDraw(),unoDraw());n.status=n.hands[M.player].length===0?M.playerName+' gewinnt!':'Läuft';M.roomRef.set(n);};h.append(b)});document.getElementById('udraw').onclick=()=>{let n=structuredClone(d);n.hands[M.player].push(unoDraw());n.turn=op;M.roomRef.set(n)}}
    let chess=null,selSq=null;
    function renderChess(d){if(!window.Chess)return;if(!chess)chess=new Chess(d.fen==='start'?undefined:d.fen);else if(chess.fen()!==d.fen)chess.load(d.fen);let my=M.player==='p1'?'w':'b',board=document.createElement('div');board.className='chessboard';let pieces={wK:'♔',wQ:'♕',wR:'♖',wB:'♗',wN:'♘',wP:'♙',bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟'};chess.board().forEach((row,r)=>row.forEach((p,c)=>{let sq='abcdefgh'[c]+(8-r),b=document.createElement('button');b.className='square '+((r+c)%2?'dark':'light');b.textContent=p?pieces[p.color+p.type.toUpperCase()]||'':'';b.onclick=()=>{if(d.turn!==M.player||chess.turn()!==my)return;if(!selSq){let pc=chess.get(sq);if(pc&&pc.color===my)selSq=sq;return}let m=chess.move({from:selSq,to:sq,promotion:'q'});selSq=null;if(!m){renderChess(d);return}M.roomRef.update({fen:chess.fen(),turn:M.player==='p1'?'p2':'p1',status:chess.game_over()?'Beendet':'Partie läuft'});};board.append(b)}));let el=document.getElementById('og');el.innerHTML=`<div class="status">${d.status}</div>`;el.append(board);}
    
    return M;
})();
