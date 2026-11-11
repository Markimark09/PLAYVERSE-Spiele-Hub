
window.solo = (function(){
    const S = {};
    
    S.cwD=['HTML*','*I*O*','CODE*','A*O*S','*CSS*'];
    S.cwStart = function(){
        let e=document.getElementById('cwg');e.innerHTML='';
        for(let r=0;r<5;r++){
            for(let c=0;c<5;c++){
                if(S.cwD[r][c]==='*'){
                    let d=document.createElement('div');
                    d.style="background:#26314f;border-radius:6px";
                    e.append(d);
                }else{
                    let i=document.createElement('input');
                    i.id=`cw_${r}_${c}`; i.maxLength=1;
                    i.autocomplete="off"; i.autocapitalize="characters";
                    i.style="text-align:center;text-transform:uppercase;padding:0;font-weight:bold;background:#0b1020;color:#fff;border:1px solid var(--cyan);border-radius:6px;width:100%;height:100%;font-size:20px";
                    i.oninput=(ev)=>{ if(i.value.length>=1) S.cwNav({key:'ArrowRight'},r,c); };
                    i.onkeydown=(ev)=>{ if(['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Backspace'].includes(ev.key)) S.cwNav(ev,r,c); };
                    e.append(i);
                }
            }
        }
        document.getElementById('cws').textContent='Viel Erfolg! (Pfeiltasten zur Navigation)';
    };
    S.cwNav = function(ev, r, c){
        let k = ev.key;
        if(k==='ArrowRight' || (k.length===1 && k.match(/[a-zA-Z]/))) {
            for(let i=r; i<5; i++){ let sc=(i===r)?c+1:0; for(let j=sc; j<5; j++){ let nxt=document.getElementById(`cw_${i}_${j}`); if(nxt){ nxt.focus(); return; } } }
        } else if(k==='ArrowLeft' || k==='Backspace') {
            for(let i=r; i>=0; i--){ let sc=(i===r)?c-1:4; for(let j=sc; j>=0; j--){ let prv=document.getElementById(`cw_${i}_${j}`); if(prv){ prv.focus(); return; } } }
        } else if(k==='ArrowDown') {
            for(let i=r+1; i<5; i++){ let nxt=document.getElementById(`cw_${i}_${c}`); if(nxt){ nxt.focus(); return; } }
        } else if(k==='ArrowUp') {
            for(let i=r-1; i>=0; i--){ let prv=document.getElementById(`cw_${i}_${c}`); if(prv){ prv.focus(); return; } }
        }
    };
    S.cwCheck = function(){let ok=true;for(let r=0;r<5;r++)for(let c=0;c<5;c++){if(S.cwD[r][c]!=='*'){let i=document.getElementById(`cw_${r}_${c}`); if(i && i.value.toUpperCase()!==S.cwD[r][c])ok=false;}}if(ok){document.getElementById('cws').textContent='Richtig gelöst! (+5 🎟️)';app.addArcadeTickets(5);}else{document.getElementById('cws').textContent='Fehler vorhanden!';}};

    let hmWords=["COMPUTER","INTERNET","SOFTWARE","GAMING"], hmW="", hmG=[], hmE=0;
    S.hmStart = function(){hmW=hmWords[Math.floor(Math.random()*hmWords.length)];hmG=[];hmE=0;S.hmR();};
    S.hmR = function(){let t="";let win=true;for(let c of hmW){if(hmG.includes(c)){t+=c;}else{t+="_";win=false;}}document.getElementById('hmw').textContent=t;document.getElementById('hms').textContent=win?'Gewonnen!':hmE>=6?'Verloren! Wort: '+hmW:'Fehler: '+hmE+'/6';let kb=document.getElementById('hmkb');kb.innerHTML='';if(win||hmE>=6)return;for(let i=65;i<=90;i++){let l=String.fromCharCode(i);let b=document.createElement('button');b.className='btn';b.textContent=l;b.disabled=hmG.includes(l);b.onclick=()=>{hmG.push(l);if(!hmW.includes(l))hmE++;S.hmR();};kb.append(b);}};

    let aimS=0; S.aimStart = function(){aimS=0;S.aimR();app.stTo(()=>{document.getElementById('aims').textContent='Zeit um! Punkte: '+aimS;document.getElementById('aimb').innerHTML='';},10000);document.getElementById('aims').textContent='Klicke das Ziel!';};
    S.aimR = function(){let e=document.getElementById('aimb');e.innerHTML='';let x=Math.random()*80,y=Math.random()*80;let b=document.createElement('div');b.style=`position:absolute;left:${x}%;top:${y}%;width:40px;height:40px;background:#ff526f;border-radius:50%;cursor:pointer`;b.onpointerdown=()=>{aimS++;S.aimR();};e.append(b);};

    let mthA=0; S.mathStart = function(){let a=Math.floor(Math.random()*50),b=Math.floor(Math.random()*50);mthA=a+b;document.getElementById('mthq').textContent=`${a} + ${b} = ?`;document.getElementById('mthi').value='';document.getElementById('mths').textContent='Tippe das Ergebnis!';};
    S.mthTry = function(){document.getElementById('mths').textContent = parseInt(document.getElementById('mthi').value)===mthA ? 'Richtig!' : 'Falsch!';};

    S.slotStart = function(){document.getElementById('sltb').innerHTML='<span>❓</span><span>❓</span><span>❓</span>'; document.getElementById('slts').textContent='Viel Glück!';};
    S.sltRoll = function(){let a=['🍒','🍋','🍉','⭐'], r=[]; for(let i=0;i<3;i++)r.push(a[Math.floor(Math.random()*a.length)]); let e=document.getElementById('sltb').children; for(let i=0;i<3;i++)e[i].textContent=r[i]; document.getElementById('slts').textContent = (r[0]===r[1]&&r[1]===r[2]) ? 'JACKPOT! (+15 🎟️)' : 'Leider nichts.';};

    S.coinStart = function(){document.getElementById('cnd').textContent='🪙'; document.getElementById('cns').textContent='Kopf oder Zahl?';};
    S.coinFlip = function(){document.getElementById('cnd').textContent = Math.random()>0.5?'KOPF':'ZAHL';};

    let m8Ans=["Ja","Nein","Vielleicht","Sicher","Niemals","Frag später"]; 
    S.m8Start = function(){document.getElementById('m8a').textContent='8'; document.getElementById('m8a').style.fontSize='50px';};
    S.m8Ask = function(){document.getElementById('m8a').textContent=m8Ans[Math.floor(Math.random()*m8Ans.length)];document.getElementById('m8a').style.fontSize='25px';};

    let tmT=0; 
    S.timerStart = function(){tmT=0; document.getElementById('tmd').textContent='0.00'; document.getElementById('tmb').textContent='Start';};
    S.tmAct = function(){let b=document.getElementById('tmb'); if(tmT===0){tmT=Date.now();b.textContent='Stopp';document.getElementById('tmd').textContent='Läuft...';}else{let d=(Date.now()-tmT)/1000;document.getElementById('tmd').textContent=d.toFixed(2)+'s';document.getElementById('tms').textContent=Math.abs(10-d)<0.15?'Perfekt!':'Daneben.';tmT=0;b.textContent='Start';}};

    let clkS=0, clkC=1, clkP=10; S.clickerStart = function(){clkS=0;clkC=1;clkP=10;S.clkR();}; S.clkR = function(){document.getElementById('clks').textContent='Kekse: '+clkS;document.getElementById('clku').textContent=`Upgrade (+1/Klick) - Kosten: ${clkP}`;document.getElementById('clku').disabled=clkS<clkP;}; S.clkHit = function(e){clkS+=clkC;e.style.transform='scale(0.9)';app.stTo(()=>e.style.transform='none',50);S.clkR();}; S.clkUp = function(){if(clkS>=clkP){clkS-=clkP;clkC++;clkP=Math.floor(clkP*1.5);S.clkR();}};

    let puzA=[]; S.puzStart = function(){puzA=[...Array(15).keys()].map(x=>x+1).concat([0]); for(let i=0;i<200;i++){let z=puzA.indexOf(0);let m=[];if(z%4!==0)m.push(z-1);if(z%4!==3)m.push(z+1);if(z>=4)m.push(z-4);if(z<=11)m.push(z+4);let s=m[Math.floor(Math.random()*m.length)];puzA[z]=puzA[s];puzA[s]=0;} S.puzR(); }; S.puzR = function(){let e=document.getElementById('puzg');e.innerHTML='';puzA.forEach((v,i)=>{let b=document.createElement('button');b.className='btn';b.style.fontSize='24px';if(v===0)b.style.opacity='0';else b.textContent=v;b.onclick=()=>S.puzMove(i);e.append(b);});document.getElementById('puzs').textContent = puzA.join() === '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,0' ? 'Gelöst!' : 'Ordne 1 bis 15';}; S.puzMove = function(i){let z=puzA.indexOf(0); if([1,-1,4,-4].includes(i-z) && !(i%4===0&&z%4===3) && !(z%4===0&&i%4===3)){puzA[z]=puzA[i];puzA[i]=0;S.puzR();}};

    let typT=["Die Sonne scheint hell.","Hallo Welt, wie geht es dir?","Programmieren macht Spass."];let typS="",typTm=0; S.typeStart = function(){typS=typT[Math.floor(Math.random()*typT.length)];document.getElementById('typt').textContent=typS;document.getElementById('typi').value='';document.getElementById('typi').disabled=false;document.getElementById('typs').textContent='Tippe!';typTm=Date.now();}; S.typCheck = function(){if(document.getElementById('typi').value===typS){document.getElementById('typs').textContent=`Fertig in ${((Date.now()-typTm)/1000).toFixed(2)}s`;document.getElementById('typi').disabled=true;}};

    let oddL=1, oddT=0; S.oddStart = function(){oddL=1;S.oddR();}; S.oddR = function(){document.getElementById('odds').textContent='Level: '+oddL;let e=document.getElementById('oddg');e.innerHTML='';oddT=Math.floor(Math.random()*9);let h=Math.floor(Math.random()*360); for(let i=0;i<9;i++){let b=document.createElement('button');b.className='btn';b.style.background=`hsl(${h},70%,${i===oddT?50+Math.max(2,20-oddL):50}%)`;b.style.aspectRatio='1';b.onclick=()=>{if(i===oddT){oddL++;S.oddR();}else{document.getElementById('odds').textContent='Falsch! Game Over bei Lvl '+oddL;e.innerHTML='';}};e.append(b);}};

    let hlC=50; S.hilowStart = function(){hlC=Math.floor(Math.random()*100)+1;document.getElementById('hln').textContent=hlC;document.getElementById('hls').textContent='Höher oder Tiefer?';}; S.hlGuess = function(d){let n=Math.floor(Math.random()*100)+1; let w=(n>=hlC&&d===1)||(n<=hlC&&d===-1); hlC=n; document.getElementById('hln').textContent=hlC; document.getElementById('hls').textContent=w?'Richtig! Weiter so.':'Falsch! Verloren.';};

    let bjC=0, bjd=false; S.bjStart = function(){bjC=0;bjd=false;document.getElementById('bjs').textContent='Ziehe Karten';S.bjHit();document.getElementById('bjh').disabled=false;document.getElementById('bjsb').disabled=false;}; S.bjHit = function(){if(bjd)return; bjC+=Math.floor(Math.random()*10)+1; document.getElementById('bjt').textContent=bjC; if(bjC>21){document.getElementById('bjs').textContent='Überkauft! Verloren.';bjd=true;document.getElementById('bjh').disabled=true;document.getElementById('bjsb').disabled=true;}}; S.bjStd = function(){if(bjd)return;bjd=true;let c=Math.floor(Math.random()*6)+16; document.getElementById('bjs').textContent = (c>21||bjC>c) ? `Gewonnen! (PC: ${c})` : `Verloren! (PC: ${c})`;document.getElementById('bjh').disabled=true;document.getElementById('bjsb').disabled=true;};

    let skC=0, skT=0; S.speedStart = function(){skC=0;skT=0;document.getElementById('skb').textContent='GO!';document.getElementById('sks').textContent='30x Klicken!';}; S.skClick = function(){if(skC===0)skT=Date.now();skC++;document.getElementById('skb').textContent=skC;if(skC===30){document.getElementById('sks').textContent=`Fertig in ${((Date.now()-skT)/1000).toFixed(2)}s`;skC=0;skT=0;}};

    let trQ=[{q:"Hauptstadt von Frankreich?",a:["Paris","Rom","Berlin"],c:0},{q:"8 x 7 = ?",a:["54","56","64"],c:1},{q:"Wer malt die Mona Lisa?",a:["Van Gogh","Picasso","Da Vinci"],c:2}]; let trI=0, trS=0; S.triviaStart = function(){trI=0;trS=0;S.trR();}; S.trR = function(){if(trI>=trQ.length){document.getElementById('trs').textContent=`Punkte: ${trS}/${trQ.length}`;document.getElementById('trq').textContent='';document.getElementById('tro').innerHTML='';return;} document.getElementById('trs').textContent=`Frage ${trI+1}/${trQ.length}`; document.getElementById('trq').textContent=trQ[trI].q; let o=document.getElementById('tro');o.innerHTML=''; trQ[trI].a.forEach((a,i)=>{let b=document.createElement('button');b.className='btn';b.textContent=a;b.onclick=()=>{if(i===trQ[trI].c)trS++;trI++;S.trR();};o.append(b);});};

    let stC=['red','blue','green','yellow'], stN=['ROT','BLAU','GRÜN','GELB'], stP=0, stT=0; S.stroopStart = function(){stP=0;S.stR();}; S.stR = function(){document.getElementById('sts').textContent='Punkte: '+stP; stT=Math.floor(Math.random()*4); let cr=Math.floor(Math.random()*4); let w=document.getElementById('stw'); w.textContent=stN[cr]; w.style.color=stC[stT]; let b=document.getElementById('stb'); b.innerHTML=''; stN.forEach((n,i)=>{let btn=document.createElement('button');btn.className='btn';btn.textContent=n;btn.onclick=()=>{if(i===stT){stP++;S.stR();}else{document.getElementById('sts').textContent='Falsch! Punkte: '+stP;b.innerHTML='';}};b.append(btn);});};

    let mmS=[], mmU=[], mmL=true; S.memmatStart = function(){mmS=[];mmU=[];S.mmR(true);}; S.mmR = function(add){if(add)mmS.push(Math.floor(Math.random()*16));mmU=[];document.getElementById('mms').textContent='Merke dir die blauen Felder!';let e=document.getElementById('mmg');e.innerHTML='';for(let i=0;i<16;i++){let b=document.createElement('div');b.style=`aspect-ratio:1;background:#26314f;border-radius:8px`;b.id='mm_'+i;b.onclick=()=>S.mmC(i);e.append(b);} mmL=true; mmS.forEach(x=>document.getElementById('mm_'+x).style.background='#66e3ff'); app.stTo(()=>{for(let i=0;i<16;i++)document.getElementById('mm_'+i).style.background='#26314f';mmL=false;document.getElementById('mms').textContent='Klicke sie nach!';},1000);}; S.mmC = function(i){if(mmL)return; document.getElementById('mm_'+i).style.background='#66e3ff'; mmU.push(i); if(mmU[mmU.length-1]!==mmS[mmU.length-1]){document.getElementById('mms').textContent='Falsch!';mmL=true;}else if(mmU.length===mmS.length){mmL=true;document.getElementById('mms').textContent='Korrekt!';app.stTo(()=>S.mmR(true),1000);}};

    let dnCtx,dnY=150,dnV=0,dnX=400,dnO=false; S.dinoStart = function(){let c=document.getElementById('dncvs');dnCtx=c.getContext('2d');dnY=150;dnV=0;dnX=400;dnO=false;app.stInt(S.dnL,20);document.getElementById('dns').textContent='Läuft...';}; S.dnL = function(){if(dnO)return; dnV+=0.6;dnY+=dnV;if(dnY>150){dnY=150;dnV=0;} dnX-=5;if(dnX<-20)dnX=400; dnCtx.fillStyle='#0b1020';dnCtx.fillRect(0,0,400,200);dnCtx.fillStyle='#ff80bf';dnCtx.fillRect(50,dnY,20,20);dnCtx.fillStyle='#e34251';dnCtx.fillRect(dnX,150,20,20); if(dnX<70&&dnX>30&&dnY>130){dnO=true;document.getElementById('dns').textContent='Verloren!';}}; S.dnJump = function(){if(dnY>=150 && !dnO)dnV=-10;};

    let ctCtx,ctX=120,ctxF=150,ctyF=0,ctS=0,ctO=false; S.catchStart = function(){let c=document.getElementById('ctcvs');ctCtx=c.getContext('2d');ctX=120;ctxF=150;ctyF=0;ctS=0;ctO=false;app.stInt(S.ctL,20);document.getElementById('cts').textContent='Punkte: 0';}; S.ctL = function(){if(ctO)return; ctyF+=3+ctS*0.2; if(ctyF>400){if(ctxF>ctX&&ctxF<ctX+60){ctS++;document.getElementById('cts').textContent='Punkte: '+ctS;ctyF=0;ctxF=Math.random()*280;}else{ctO=true;document.getElementById('cts').textContent='Verpasst! Punkte: '+ctS;}} ctCtx.fillStyle='#0b1020';ctCtx.fillRect(0,0,300,400); ctCtx.fillStyle='#66e3ff';ctCtx.fillRect(ctX,380,60,10); ctCtx.fillStyle='#b8f36b';ctCtx.fillRect(ctxF,ctyF,15,15);}; S.ctMove = function(e){let cvs=document.getElementById('ctcvs'),r=cvs.getBoundingClientRect(),scale=300/r.width;ctX=(e.clientX-r.left)*scale-30;};
    S.ctTouch = function(e){if(!e.touches||!e.touches[0])return;e.preventDefault();let cvs=document.getElementById('ctcvs'),r=cvs.getBoundingClientRect(),scale=300/r.width;ctX=(e.touches[0].clientX-r.left)*scale-30;};

    const wlist=["APFEL","BAUCH","BLATT","CHAOS","DAMPF"];let wans="",wtries=0,wgrid=[]; S.wordleStart = function(){wans=wlist[Math.floor(Math.random()*wlist.length)];wtries=0;wgrid=Array(30).fill(null);document.getElementById('wi').value='';document.getElementById('wi').disabled=false;document.getElementById('ws').textContent='Errate das 5-Buchstaben-Wort!';S.wordleRender();}; S.wordleRender = function(){let e=document.getElementById('wb');e.innerHTML='';for(let i=0;i<30;i++){let d=document.createElement('div');d.className='wbox';if(wgrid[i]){d.textContent=wgrid[i].c;d.classList.add(wgrid[i].s);}e.append(d);}}; S.wordleTry = function(){if(wtries>=6)return;let w=document.getElementById('wi').value.toUpperCase().trim();if(w.length!==5)return;let a=wans.split(''),c=w.split(''),res=Array(5).fill('gray');for(let i=0;i<5;i++){if(c[i]===a[i]){res[i]='green';a[i]=null;}}for(let i=0;i<5;i++){if(res[i]!=='green'&&a.includes(c[i])){res[i]='yellow';a[a.indexOf(c[i])]=null;}}for(let i=0;i<5;i++){wgrid[wtries*5+i]={c:c[i],s:res[i]};}wtries++;S.wordleRender();if(w===wans){document.getElementById('ws').textContent=`Gewonnen!`;document.getElementById('wi').disabled=true;}else if(wtries>=6){document.getElementById('ws').textContent=`Verloren! Wort: ${wans}`;document.getElementById('wi').disabled=true;}else{document.getElementById('wi').value='';}};

    let snakectx,snake=[],sdir={x:1,y:0},sfood={x:15,y:15},slock=false; let touchStartX=0, touchStartY=0;
    S.snakeDir = function(dx,dy){if(slock)return;if(dx!==0&&sdir.x===0){sdir={x:dx,y:0};slock=true;}else if(dy!==0&&sdir.y===0){sdir={x:0,y:dy};slock=true;}};
    S.snakeStart = function(){let cvs=document.getElementById('scvs');snakectx=cvs.getContext('2d');snake=[{x:10,y:10}];sdir={x:1,y:0};sfood={x:Math.floor(Math.random()*20),y:Math.floor(Math.random()*20)};slock=false;app.stInt(S.snakeTick,110);document.getElementById('snakes').textContent='Punkte: 0'; window.activeKeyListener = S.snakeKey; document.addEventListener('keydown',S.snakeKey);
    cvs.ontouchstart=(e)=>{if(e.touches[0]){touchStartX=e.touches[0].clientX;touchStartY=e.touches[0].clientY;}};
    cvs.ontouchend=(e)=>{if(!e.changedTouches[0])return;let dx=e.changedTouches[0].clientX-touchStartX, dy=e.changedTouches[0].clientY-touchStartY; if(Math.abs(dx)>Math.abs(dy)){if(Math.abs(dx)>20)S.snakeDir(dx>0?1:-1,0);}else{if(Math.abs(dy)>20)S.snakeDir(0,dy>0?1:-1);}};}; S.snakeKey = function(e){if(slock)return;if(["ArrowUp","w","W"].includes(e.key)&&sdir.y===0){sdir={x:0,y:-1};slock=true;}if(["ArrowDown","s","S"].includes(e.key)&&sdir.y===0){sdir={x:0,y:1};slock=true;}if(["ArrowLeft","a","A"].includes(e.key)&&sdir.x===0){sdir={x:-1,y:0};slock=true;}if(["ArrowRight","d","D"].includes(e.key)&&sdir.x===0){sdir={x:1,y:0};slock=true;}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();}; S.snakeTick = function(){let h={x:snake[0].x+sdir.x,y:snake[0].y+sdir.y};if(h.x<0||h.x>=20||h.y<0||h.y>=20||snake.some(s=>s.x===h.x&&s.y===h.y)){app.clrAll();document.getElementById('snakes').textContent='Game Over! Punkte: '+(snake.length-1);return;}snake.unshift(h);if(h.x===sfood.x&&h.y===sfood.y){sfood={x:Math.floor(Math.random()*20),y:Math.floor(Math.random()*20)};document.getElementById('snakes').textContent='Punkte: '+(snake.length-1);}else{snake.pop();}snakectx.fillStyle='#0b1020';snakectx.fillRect(0,0,300,300);snakectx.fillStyle='#e34251';snakectx.fillRect(sfood.x*15,sfood.y*15,15,15);snakectx.fillStyle='#b8f36b';snake.forEach(s=>snakectx.fillRect(s.x*15,s.y*15,14,14));slock=false;};

    let mg=[],mgo=false,mrem=0,msFlagMode=false;
    S.msToggleFlagMode = function(){msFlagMode=!msFlagMode;let b=document.getElementById('msFlagBtn');if(b){b.textContent=msFlagMode?'🚩 Modus: Flagge setzen (Aktiv)':'⛏️ Modus: Aufdecken (Tippen zum Wechseln)';b.className=msFlagMode?'btn primary':'btn';}};
    S.minesStart = function(){mgo=false;msFlagMode=false;let b=document.getElementById('msFlagBtn');if(b){b.textContent='⛏️ Modus: Aufdecken (Tippen zum Wechseln)';b.className='btn';}mg=Array(100).fill().map(()=>({m:Math.random()<0.15,o:false,f:false}));mrem=100-mg.filter(x=>x.m).length;document.getElementById('mss').textContent='Finde alle sicheren Felder!';S.msRender();}; S.msRender = function(){let e=document.getElementById('msb');e.innerHTML='';mg.forEach((c,i)=>{let b=document.createElement('button');b.className='mcell '+ (c.o?'open':'');if(c.o){if(c.m){b.classList.add('mine');b.textContent='💣';}else{let n=S.msAdj(i).filter(x=>mg[x].m).length;b.textContent=n>0?n:'';b.style.color=['','#66e3ff','#b8f36b','#ff80bf','#a78bfa','#e6b72d','#e34251','#fff','#fff'][n];}}else if(c.f)b.textContent='🚩';b.onclick=()=>S.msClick(i);b.oncontextmenu=(ev)=>{ev.preventDefault();if(!mgo&&!c.o){c.f=!c.f;S.msRender();}};e.append(b);});}; S.msAdj = function(i){let r=[],x=i%10,y=Math.floor(i/10);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){if(dx===0&&dy===0)continue;let nx=x+dx,ny=y+dy;if(nx>=0&&nx<10&&ny>=0&&ny<10)r.push(ny*10+nx);}return r;}; S.msClick = function(i){if(mgo||mg[i].o)return;if(msFlagMode){mg[i].f=!mg[i].f;S.msRender();return;}if(mg[i].f)return;mg[i].o=true;if(mg[i].m){mgo=true;document.getElementById('mss').textContent='BUMM!';mg.forEach(c=>{if(c.m)c.o=true;});S.msRender();return;}mrem--;let n=S.msAdj(i).filter(x=>mg[x].m).length;if(n===0)S.msAdj(i).forEach(S.msClick);if(mrem===0){mgo=true;document.getElementById('mss').textContent='Gewonnen!';}S.msRender();};

    S.rpsStart = function(){ document.getElementById('rpsu').textContent='🤔'; document.getElementById('rpso').textContent='🤔'; document.getElementById('rpss').textContent='Wähle deine Waffe!'; };
    S.rpsPlay = function(u){let c=['✊','✋','✌️'][Math.floor(Math.random()*3)];let win=(u==='✊'&&c==='✌️')||(u==='✋'&&c==='✊')||(u==='✌️'&&c==='✋');document.getElementById('rpsu').textContent=u;document.getElementById('rpso').textContent=c;document.getElementById('rpss').textContent=u===c?'Unentschieden!':(win?'Du gewinnst!':'Computer gewinnt!');};

    let first=null,lock=false,found=0,moves=0; S.memoryStart = function(){let a=['🍉','🍉','🍓','🍓','🚀','🚀','🎧','🎧','🐸','🐸','🌈','🌈','⚽','⚽','🦊','🦊'].sort(()=>Math.random()-.5);first=null;lock=false;found=0;moves=0;document.getElementById('ms_status').textContent='Finde die Paare.';let e=document.getElementById('mb');e.innerHTML='';a.forEach(v=>{let b=document.createElement('button');b.textContent='?';b.dataset.v=v;b.onclick=()=>{if(lock||b.classList.contains('open'))return;b.classList.add('open');b.textContent=v;if(!first){first=b;return;}moves++;if(first.dataset.v===v){found++;first=null;document.getElementById('ms_status').textContent=`Paare ${found}/8 · Züge ${moves}`;if(found===8)document.getElementById('ms_status').textContent=`Geschafft!`;}else{lock=true;let f=first;first=null;app.stTo(()=>{f.classList.remove('open');b.classList.remove('open');f.textContent=b.textContent='?';lock=false;},700);}};e.append(b);});};
    
    S.diceStart = function(){ document.getElementById('df').textContent='🎲 🎲'; document.getElementById('ds').textContent='Du gegen den Computer.'; };
    S.diceRoll = function(){let a=1+Math.random()*6|0,b=1+Math.random()*6|0,c=2+(Math.random()*6|0)+(Math.random()*6|0),n=a+b;document.getElementById('df').textContent=['⚀','⚁','⚂','⚃','⚄','⚅'][a-1]+' '+['⚀','⚁','⚂','⚃','⚄','⚅'][b-1];document.getElementById('ds').textContent=`Du: ${n} · Computer: ${c} — ${n>c?'Du gewinnst!':n<c?'Computer gewinnt!':'Unentschieden!'}`;};

    let c4=Array(42).fill(0),ct=1,cd=false; S.c4reset = function(){c4=Array(42).fill(0);ct=1;cd=false;document.getElementById('c4s').textContent='Rot beginnt.';S.c4render();}; S.c4render = function(){let e=document.getElementById('c4b');e.innerHTML='';for(let r=0;r<6;r++)for(let c=0;c<7;c++){let b=document.createElement('button');b.className='hole';let d=document.createElement('div');d.className='disc '+(c4[r*7+c]===1?'red':c4[r*7+c]===2?'yellow':'');b.append(d);b.onclick=()=>S.c4drop(c);e.append(b);}}; S.c4drop = function(c){if(cd)return;for(let r=5;r>=0;r--){let i=r*7+c;if(!c4[i]){c4[i]=ct;S.c4render();let win=[[0,1],[1,0],[1,1],[1,-1]].some(([dr,dc])=>{let n=1;for(let s of [-1,1]){let y=r+dr*s,x=c+dc*s;while(y>=0&&y<6&&x>=0&&x<7&&c4[y*7+x]===ct){n++;y+=dr*s;x+=dc*s;}}return n>=4;});if(win){document.getElementById('c4s').textContent=(ct===1?'Rot':'Gelb')+' gewinnt!';cd=true;}else{ct=3-ct;document.getElementById('c4s').textContent=(ct===1?'Rot':'Gelb')+' ist dran.';}return;}}};

    let tt=Array(9).fill(''),turn='X',td=false; S.ttreset = function(){tt=Array(9).fill('');turn='X';td=false;document.getElementById('tts').textContent='X beginnt.';S.ttrender();}; S.ttrender = function(){let e=document.getElementById('ttb');e.innerHTML='';tt.forEach((v,i)=>{let b=document.createElement('button');b.textContent=v;b.onclick=()=>S.ttplay(i);e.append(b);});}; S.ttplay = function(i){if(td||tt[i])return;tt[i]=turn;S.ttrender();let w=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];if(w.some(a=>a.every(j=>tt[j]===turn))){document.getElementById('tts').textContent=turn+' gewinnt!';td=true;}else if(tt.every(Boolean)){document.getElementById('tts').textContent='Unentschieden!';td=true;}else{turn=turn==='X'?'O':'X';document.getElementById('tts').textContent=turn+' ist dran.';}};

    let flapCtx,fy=200,fvy=0,fpipes=[],fscore=0,fframe=0,fover=true; S.flappyStart = function(){fy=200;fvy=0;fpipes=[];fscore=0;fframe=0;fover=false;app.stInt(S.flapLoop,20);document.getElementById('fs').textContent='Punkte: 0';document.getElementById('flapcvs').onpointerdown=()=>{fvy=-6;};}; S.flapLoop = function(){if(fover)return;fvy+=0.3;fy+=fvy;fframe++;let c=document.getElementById('flapcvs');flapCtx=c.getContext('2d');flapCtx.clearRect(0,0,320,400);flapCtx.fillStyle='#66e3ff';flapCtx.fillRect(40,fy,20,20);if(fframe%90===0){let h=Math.floor(Math.random()*200)+50;fpipes.push({x:320,y:0,w:30,h:h},{x:320,y:h+110,w:30,h:400-h-110,p:true});}flapCtx.fillStyle='#b8f36b';for(let i=0;i<fpipes.length;i++){let p=fpipes[i];p.x-=2.5;flapCtx.fillRect(p.x,p.y,p.w,p.h);if(40<p.x+p.w&&60>p.x&&fy<p.y+p.h&&fy+20>p.y)fover=true;if(p.p&&p.x===35){fscore++;document.getElementById('fs').textContent='Punkte: '+fscore;}}if(fy>400||fy<0)fover=true;if(fover)document.getElementById('fs').textContent='Game Over! Punkte: '+fscore;};

    let pongCtx,pkeys={},pball,p1y,p2y,pscore=[0,0]; S.pongKey = function(k,v){pkeys[k]=v;}; S.pongStart = function(){pkeys={};pball={x:250,y:150,vx:4,vy:3};p1y=110;p2y=110;pscore=[0,0];app.stInt(S.pongLoop,16);document.getElementById('pongs').textContent=`P1: 0  |  P2: 0`; window.activeKeyListener = (e)=>{pkeys[e.key]=true;if(['ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();}; window.activeKeyUpListener = (e)=>{pkeys[e.key]=false;}; document.addEventListener('keydown',window.activeKeyListener); document.addEventListener('keyup',window.activeKeyUpListener);}; S.pongLoop = function(){let c=document.getElementById('pongcvs');pongCtx=c.getContext('2d');pongCtx.clearRect(0,0,500,300);if(pkeys['w']&&p1y>0)p1y-=5;if(pkeys['s']&&p1y<220)p1y+=5;if(pkeys['ArrowUp']&&p2y>0)p2y-=5;if(pkeys['ArrowDown']&&p2y<220)p2y+=5;pball.x+=pball.vx;pball.y+=pball.vy;if(pball.y<=0||pball.y>=290)pball.vy*=-1;if(pball.x<=30&&pball.x>=20&&pball.y>=p1y&&pball.y<=p1y+80){pball.vx*=-1.05;pball.x=31;}if(pball.x>=460&&pball.x<=470&&pball.y>=p2y&&pball.y<=p2y+80){pball.vx*=-1.05;pball.x=459;}if(pball.x<0){pscore[1]++;pball={x:250,y:150,vx:-4,vy:3};}if(pball.x>500){pscore[0]++;pball={x:250,y:150,vx:4,vy:3};}pongCtx.fillStyle='#fff';pongCtx.fillRect(10,p1y,10,80);pongCtx.fillRect(480,p2y,10,80);pongCtx.fillRect(pball.x,pball.y,10,10);document.getElementById('pongs').textContent=`P1: ${pscore[0]}  |  P2: ${pscore[1]}`;};

    let sSeq=[],sUser=[],sLock=true; S.simonStart = function(){sSeq=[];sUser=[];app.stTo(S.simonAdd,800);}; S.simonAdd = function(){sSeq.push(Math.floor(Math.random()*4));sUser=[];document.getElementById('simons').textContent=`Runde ${sSeq.length}`;sLock=true;let i=0;let int=app.stInt(()=>{let b=document.getElementById('sb'+sSeq[i]);b.classList.add('active');app.stTo(()=>b.classList.remove('active'),400);i++;if(i>=sSeq.length){clearInterval(int);sLock=false;}},700);}; S.simonPress = function(id){if(sLock)return;let b=document.getElementById('sb'+id);b.classList.add('active');app.stTo(()=>b.classList.remove('active'),400);sUser.push(id);if(sUser[sUser.length-1]!==sSeq[sUser.length-1]){sLock=true;document.getElementById('simons').textContent=`Falsch!`;}else if(sUser.length===sSeq.length){sLock=true;app.stTo(S.simonAdd,1000);}};

    let moleScore=0,moleTime=30,activeMole=-1; S.moleStart = function(){moleScore=0;moleTime=30;activeMole=-1;let e=document.getElementById('moleb');e.innerHTML='';for(let i=0;i<9;i++){let h=document.createElement('div');h.className='mole-hole';h.id='mh'+i;h.innerHTML='<span>🐹</span>';h.onpointerdown=()=>{if(i===activeMole){moleScore++;document.getElementById('mh'+i).classList.remove('up');activeMole=-1;}};e.append(h);}S.moleLoop();}; S.moleLoop = function(){document.getElementById('moles').textContent=`Punkte: ${moleScore} · Zeit: ${moleTime}s`;if(moleTime<=0)return;if(activeMole!==-1)document.getElementById('mh'+activeMole).classList.remove('up');activeMole=Math.floor(Math.random()*9);document.getElementById('mh'+activeMole).classList.add('up');moleTime--;app.stTo(S.moleLoop,1000);};

    let secret=0,tries=0; S.guessStart = function(){secret=1+Math.random()*100|0;tries=0;document.getElementById('gi').value='';document.getElementById('gs').textContent='Neue Zahl! Los!';}; S.guessTry = function(){let n=Number(document.getElementById('gi').value);tries++;document.getElementById('gs').textContent=n===secret?`Richtig in ${tries} Versuchen!`:n<secret?'Zu niedrig!':'Zu hoch!';};

    let rmode='idle',rt0; S.reactionStart = function(){rmode='idle'; document.getElementById('rx').textContent='Start drücken und warten ...'; document.getElementById('rx').style.background='#283550'; document.getElementById('rs').textContent='Wie schnell bist du?';}; S.rxClick = function(){let b=document.getElementById('rx'),s=document.getElementById('rs');if(rmode==='wait'){app.clrAll();rmode='idle';b.textContent='Zu früh!';b.style.background='#283550';}else if(rmode==='go'){s.textContent='Zeit: '+(Date.now()-rt0)+' ms';b.textContent='Stark!';b.style.background='#283550';rmode='idle';}else{rmode='wait';b.style.background='#a63b50';b.textContent='Warte...';s.textContent='Nicht zu früh!';app.stTo(()=>{rmode='go';rt0=Date.now();b.style.background='#237b55';b.textContent='JETZT!';},1200+Math.random()*3500);}};


    // =================== V25: TETRIS & STACKER (INKL. ANTI-CHEAT PREIS-TICKETS) ===================
    let lastProofs = { tetris: null, stacker: null };

    function buildRunProof(gameName, score, detail, startTs, actions) {
        let uKey = (window.app && window.app.currentUser) ? window.app.currentUser : 'guest';
        let durationSec = Math.max(2, Math.round((Date.now() - startTs) / 1000));
        let nonce = 'RN-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
        let sig = window.app.computeRunSignature(uKey, gameName, score, durationSec, actions, nonce);
        return {
            userKey: uKey,
            game: gameName,
            score: score,
            detail: detail,
            durationSec: durationSec,
            actions: actions,
            nonce: nonce,
            sig: sig
        };
    }

    S.submitHighscoreTicket = function(kind) {
        let proof = lastProofs[kind];
        if(!proof) {
            alert("Bitte beende zuerst eine Runde mit Punkten!");
            return;
        }
        // Re-sign with current userKey in case user logged in right after Game Over
        proof.userKey = (window.app && window.app.currentUser) ? window.app.currentUser : 'guest';
        proof.sig = window.app.computeRunSignature(proof.userKey, proof.game, proof.score, proof.durationSec, proof.actions, proof.nonce);
        if(kind === 'tetris') {
            window.app.submitPrizeTicket(proof, 'tetPrizeMsg', 'tetPrizeBtn');
        } else if(kind === 'stacker') {
            window.app.submitPrizeTicket(proof, 'stkPrizeMsg', 'stkPrizeBtn');
        }
    };

    // --- 1. TETRIS ARCADE (10x20 Grid, Ghost Piece, Touch Pad + Keyboard) ---
    const TET_COLS = 10, TET_ROWS = 20, TET_SZ = 24;
    const TET_SHAPES = [
        { c: '#66e3ff', m: [[1,1,1,1]] },               // I
        { c: '#ffc857', m: [[1,1],[1,1]] },             // O
        { c: '#a78bfa', m: [[0,1,0],[1,1,1]] },         // T
        { c: '#b8f36b', m: [[0,1,1],[1,1,0]] },         // S
        { c: '#ff526f', m: [[1,1,0],[0,1,1]] },         // Z
        { c: '#5c7cff', m: [[1,0,0],[1,1,1]] },         // J
        { c: '#ff9f43', m: [[0,0,1],[1,1,1]] }          // L
    ];
    let tetBoard = [], tetPiece = null, tetScore = 0, tetLines = 0, tetLvl = 1;
    let tetOver = false, tetStartTs = 0, tetActions = 0, tetTimer = null;

    function tetSpawn() {
        let tpl = TET_SHAPES[Math.floor(Math.random() * TET_SHAPES.length)];
        let mat = tpl.m.map(r => r.slice());
        tetPiece = {
            c: tpl.c,
            m: mat,
            x: Math.floor((TET_COLS - mat[0].length) / 2),
            y: 0
        };
        if(tetCollide(tetPiece.x, tetPiece.y, tetPiece.m)) {
            tetGameOver();
        }
    }

    function tetCollide(px, py, mat) {
        for(let r=0; r<mat.length; r++) {
            for(let c=0; c<mat[r].length; c++) {
                if(!mat[r][c]) continue;
                let nx = px + c, ny = py + r;
                if(nx < 0 || nx >= TET_COLS || ny >= TET_ROWS) return true;
                if(ny >= 0 && tetBoard[ny][nx]) return true;
            }
        }
        return false;
    }

    function tetMerge() {
        for(let r=0; r<tetPiece.m.length; r++) {
            for(let c=0; c<tetPiece.m[r].length; c++) {
                if(tetPiece.m[r][c]) {
                    let ny = tetPiece.y + r, nx = tetPiece.x + c;
                    if(ny >= 0 && ny < TET_ROWS && nx >= 0 && nx < TET_COLS) {
                        tetBoard[ny][nx] = tetPiece.c;
                    }
                }
            }
        }
        // Check full lines
        let cleared = 0;
        for(let r=TET_ROWS-1; r>=0; r--) {
            if(tetBoard[r].every(cell => cell !== 0)) {
                tetBoard.splice(r, 1);
                tetBoard.unshift(Array(TET_COLS).fill(0));
                cleared++;
                r++;
            }
        }
        if(cleared > 0) {
            const pts = [0, 100, 300, 500, 800];
            tetScore += (pts[cleared] || 800) * tetLvl;
            tetLines += cleared;
            let newLvl = Math.floor(tetLines / 5) + 1;
            if(newLvl !== tetLvl) {
                tetLvl = newLvl;
                tetResetSpeed();
            }
        }
        tetUpdateHud();
        tetSpawn();
    }

    function tetResetSpeed() {
        if(tetTimer) clearInterval(tetTimer);
        let speed = Math.max(120, 650 - (tetLvl - 1) * 55);
        tetTimer = app.stInt(tetTick, speed);
    }

    function tetUpdateHud() {
        document.getElementById('tetScoreEl').textContent = tetScore;
        document.getElementById('tetLinesEl').textContent = tetLines;
        document.getElementById('tetLvlEl').textContent = tetLvl;
    }

    function tetDraw() {
        let cvs = document.getElementById('tetcvs');
        if(!cvs) return;
        let ctx = cvs.getContext('2d');
        ctx.fillStyle = '#080c18';
        ctx.fillRect(0, 0, cvs.width, cvs.height);

        // Subtle grid
        ctx.strokeStyle = '#141d36';
        ctx.lineWidth = 1;
        for(let r=0; r<TET_ROWS; r++) {
            for(let c=0; c<TET_COLS; c++) {
                ctx.strokeRect(c*TET_SZ, r*TET_SZ, TET_SZ, TET_SZ);
                if(tetBoard[r][c]) {
                    tetDrawBlock(ctx, c, r, tetBoard[r][c], 1);
                }
            }
        }

        if(tetPiece && !tetOver) {
            // Draw Ghost Piece (Landing Preview)
            let gy = tetPiece.y;
            while(!tetCollide(tetPiece.x, gy + 1, tetPiece.m)) gy++;
            for(let r=0; r<tetPiece.m.length; r++) {
                for(let c=0; c<tetPiece.m[r].length; c++) {
                    if(tetPiece.m[r][c]) {
                        tetDrawBlock(ctx, tetPiece.x + c, gy + r, tetPiece.c, 0.22);
                    }
                }
            }
            // Draw Active Piece
            for(let r=0; r<tetPiece.m.length; r++) {
                for(let c=0; c<tetPiece.m[r].length; c++) {
                    if(tetPiece.m[r][c]) {
                        tetDrawBlock(ctx, tetPiece.x + c, tetPiece.y + r, tetPiece.c, 1);
                    }
                }
            }
        }
    }

    function tetDrawBlock(ctx, x, y, color, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(x*TET_SZ + 1, y*TET_SZ + 1, TET_SZ - 2, TET_SZ - 2);
        ctx.fillStyle = '#ffffff44';
        ctx.fillRect(x*TET_SZ + 2, y*TET_SZ + 2, TET_SZ - 4, 4);
        ctx.restore();
    }

    function tetTick() {
        if(tetOver || !tetPiece) return;
        if(!tetCollide(tetPiece.x, tetPiece.y + 1, tetPiece.m)) {
            tetPiece.y++;
        } else {
            tetMerge();
        }
        tetDraw();
    }

    function tetGameOver() {
        tetOver = true;
        app.clrAll();
        document.getElementById('tets').textContent = `Game Over! Endstand: ${tetScore} Punkte (${tetLines} Reihen)`;
        if(tetScore > 0) {
            let bonus = Math.max(2, Math.floor(tetScore / 200));
            app.addArcadeTickets(bonus);
            app.saveHighscore('tetris', tetScore, `${tetLines} Reihen · Lvl ${tetLvl}`);
            lastProofs.tetris = buildRunProof('Tetris', tetScore, `${tetLines} Reihen · Lvl ${tetLvl}`, tetStartTs, Math.max(1, tetActions));
            let pBox = document.getElementById('tetPrizeBox');
            let pBtn = document.getElementById('tetPrizeBtn');
            let pMsg = document.getElementById('tetPrizeMsg');
            let pInfo = document.getElementById('tetPrizeInfo');
            if(pBox) {
                pBox.style.display = 'block';
                pBtn.disabled = false;
                pMsg.textContent = '';
                pInfo.textContent = `Starke Leistung: ${tetScore} Punkte! (+${bonus} 🎟️ Sofort-Bonus erhalten)`;
            }
        }
    }

    S.tetAct = function(act) {
        if(tetOver || !tetPiece) return;
        tetActions++;
        if(act === 'left') {
            if(!tetCollide(tetPiece.x - 1, tetPiece.y, tetPiece.m)) tetPiece.x--;
        } else if(act === 'right') {
            if(!tetCollide(tetPiece.x + 1, tetPiece.y, tetPiece.m)) tetPiece.x++;
        } else if(act === 'down') {
            if(!tetCollide(tetPiece.x, tetPiece.y + 1, tetPiece.m)) {
                tetPiece.y++;
                tetScore += 1;
                tetUpdateHud();
            } else {
                tetMerge();
            }
        } else if(act === 'drop') {
            let dropped = 0;
            while(!tetCollide(tetPiece.x, tetPiece.y + 1, tetPiece.m)) {
                tetPiece.y++;
                dropped++;
            }
            tetScore += dropped * 2;
            tetMerge();
        } else if(act === 'rot') {
            let m = tetPiece.m;
            let rot = m[0].map((_, idx) => m.map(row => row[idx]).reverse());
            // Wall-kick support (0, -1, +1)
            for(let offset of [0, -1, 1, -2, 2]) {
                if(!tetCollide(tetPiece.x + offset, tetPiece.y, rot)) {
                    tetPiece.x += offset;
                    tetPiece.m = rot;
                    break;
                }
            }
        }
        tetDraw();
    };

    S.tetrisKey = function(e) {
        if(tetOver) return;
        if(['ArrowLeft','a','A'].includes(e.key)) { e.preventDefault(); S.tetAct('left'); }
        else if(['ArrowRight','d','D'].includes(e.key)) { e.preventDefault(); S.tetAct('right'); }
        else if(['ArrowDown','s','S'].includes(e.key)) { e.preventDefault(); S.tetAct('down'); }
        else if(['ArrowUp','w','W'].includes(e.key)) { e.preventDefault(); S.tetAct('rot'); }
        else if(e.key === ' ') { e.preventDefault(); S.tetAct('drop'); }
    };

    S.tetrisStart = function() {
        tetBoard = Array.from({length: TET_ROWS}, () => Array(TET_COLS).fill(0));
        tetScore = 0; tetLines = 0; tetLvl = 1; tetOver = false;
        tetStartTs = Date.now(); tetActions = 0; lastProofs.tetris = null;
        let pBox = document.getElementById('tetPrizeBox');
        if(pBox) pBox.style.display = 'none';
        document.getElementById('tets').textContent = 'Staple die Blöcke & lösche Reihen!';
        tetUpdateHud();
        tetSpawn();
        tetDraw();
        tetResetSpeed();
        window.activeKeyListener = S.tetrisKey;
        document.addEventListener('keydown', S.tetrisKey);
    };

    // --- 2. STACKER ARCADE (7x15 Grid, Speed Scaling, Block Trimming, Jackpot at Row 15) ---
    const STK_COLS = 7, STK_ROWS = 15, STK_W = 40, STK_H = 28;
    let stkGrid = [], stkRow = 0, stkX = 2, stkWidth = 3, stkDir = 1;
    let stkScore = 0, stkOver = false, stkTimer = null, stkStartTs = 0, stkActions = 0;

    function stkUpdateHud() {
        document.getElementById('stkScoreEl').textContent = stkScore;
        document.getElementById('stkRowEl').textContent = `${Math.min(STK_ROWS, stkRow + 1)} / ${STK_ROWS}`;
        document.getElementById('stkBlkEl').textContent = stkWidth;
    }

    function stkSetSpeed() {
        if(stkTimer) clearInterval(stkTimer);
        let speed = Math.max(55, 250 - stkRow * 13);
        stkTimer = app.stInt(stkStep, speed);
    }

    function stkStep() {
        if(stkOver) return;
        stkX += stkDir;
        if(stkX + stkWidth > STK_COLS) {
            stkX = STK_COLS - stkWidth;
            stkDir = -1;
        } else if(stkX < 0) {
            stkX = 0;
            stkDir = 1;
        }
        stkDraw();
    }

    function stkDraw() {
        let cvs = document.getElementById('stkcvs');
        if(!cvs) return;
        let ctx = cvs.getContext('2d');
        ctx.fillStyle = '#080c18';
        ctx.fillRect(0, 0, cvs.width, cvs.height);

        for(let r=0; r<STK_ROWS; r++) {
            let drawY = (STK_ROWS - 1 - r) * STK_H;
            // Highlight Jackpot (row 14) and Minor Prize (row 9) lines
            if(r === 14) {
                ctx.fillStyle = '#ffc85718';
                ctx.fillRect(0, drawY, cvs.width, STK_H);
            } else if(r === 9) {
                ctx.fillStyle = '#66e3ff14';
                ctx.fillRect(0, drawY, cvs.width, STK_H);
            }
            for(let c=0; c<STK_COLS; c++) {
                let drawX = c * STK_W;
                ctx.strokeStyle = '#182342';
                ctx.strokeRect(drawX, drawY, STK_W, STK_H);

                let isPlaced = stkGrid[r][c];
                let isMoving = (!stkOver && r === stkRow && c >= stkX && c < stkX + stkWidth);
                if(isPlaced || isMoving) {
                    ctx.fillStyle = (r === 14) ? '#ffc857' : (r >= 9 ? '#66e3ff' : '#b8f36b');
                    ctx.fillRect(drawX + 3, drawY + 3, STK_W - 6, STK_H - 6);
                }
            }
        }
    }

    function stkFinish(wonJackpot) {
        stkOver = true;
        app.clrAll();
        stkDraw();
        let detail = wonJackpot ? `JACKPOT (Reihe 15/15)` : `Reihe ${stkRow}/15 erreicht`;
        document.getElementById('stks').textContent = wonJackpot
            ? `🎉 MEGA JACKPOT! Du hast Reihe 15 erreicht! (${stkScore} Punkte)`
            : `Vorbei in Reihe ${stkRow + 1}! Endstand: ${stkScore} Punkte`;

        if(stkScore > 0) {
            let bonus = wonJackpot ? 25 : Math.max(2, Math.floor(stkScore / 150));
            app.addArcadeTickets(bonus);
            app.saveHighscore('stacker', stkScore, detail);
            lastProofs.stacker = buildRunProof('Stacker', stkScore, detail, stkStartTs, Math.max(1, stkActions));
            let pBox = document.getElementById('stkPrizeBox');
            let pBtn = document.getElementById('stkPrizeBtn');
            let pMsg = document.getElementById('stkPrizeMsg');
            let pInfo = document.getElementById('stkPrizeInfo');
            if(pBox) {
                pBox.style.display = 'block';
                pBtn.disabled = false;
                pMsg.textContent = '';
                pInfo.textContent = `${detail} · ${stkScore} Punkte! (+${bonus} 🎟️ Sofort-Bonus erhalten)`;
            }
        }
    }

    S.stkTap = function() {
        if(stkOver) return;
        stkActions++;
        // Place blocks in current row & trim unsupported ones
        let survived = [];
        for(let c = stkX; c < stkX + stkWidth; c++) {
            if(stkRow === 0 || stkGrid[stkRow - 1][c]) {
                stkGrid[stkRow][c] = 1;
                survived.push(c);
            }
        }
        if(survived.length === 0) {
            stkFinish(false);
            return;
        }
        stkWidth = survived.length;
        stkScore += (stkRow + 1) * 50 + stkWidth * 25;

        // Classic Arcade Stacker limits: row 5+ max 2 blocks, row 10+ max 1 block
        if(stkRow >= 4 && stkWidth > 2) stkWidth = 2;
        if(stkRow >= 9 && stkWidth > 1) stkWidth = 1;

        if(stkRow === STK_ROWS - 1) {
            stkScore += 1000; // Jackpot Bonus!
            stkUpdateHud();
            stkFinish(true);
            return;
        }

        stkRow++;
        stkX = Math.floor(Math.random() * (STK_COLS - stkWidth + 1));
        stkDir = Math.random() > 0.5 ? 1 : -1;
        stkUpdateHud();
        stkDraw();
        stkSetSpeed();
    };

    S.stackerKey = function(e) {
        if(stkOver) return;
        if(e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') {
            e.preventDefault();
            S.stkTap();
        }
    };

    S.stackerStart = function() {
        stkGrid = Array.from({length: STK_ROWS}, () => Array(STK_COLS).fill(0));
        stkRow = 0; stkWidth = 3; stkX = 2; stkDir = 1;
        stkScore = 0; stkOver = false;
        stkStartTs = Date.now(); stkActions = 0; lastProofs.stacker = null;
        let pBox = document.getElementById('stkPrizeBox');
        if(pBox) pBox.style.display = 'none';
        document.getElementById('stks').textContent = 'Stoppe die Blöcke passgenau übereinander!';
        stkUpdateHud();
        stkDraw();
        stkSetSpeed();
        window.activeKeyListener = S.stackerKey;
        document.addEventListener('keydown', S.stackerKey);
    };

    return S;
})();
