window.solo = (function(){
    const S = {};

    // =========================================================================
    // 4. NEUES MINISPIEL: HIGHWAY POLICE CHASE (2D AUTORENNEN)
    // =========================================================================
    let chCtx, chCar, chTraffic, chPolice, chDist, chSpeed, chMoveDir, chBoost, chOver, chRoadOffset;
    S.chaseStart = function() {
        let cvs = document.getElementById('chaseCvs');
        chCtx = cvs.getContext('2d');
        chCar = { x: 162, y: 340, w: 36, h: 64 };
        chTraffic = [];
        chPolice = [{ x: 162, y: 430, w: 36, h: 64, vx: 0, siren: 0 }];
        chDist = 0;
        chSpeed = 5;
        chMoveDir = 0;
        chBoost = false;
        chOver = false;
        chRoadOffset = 0;
        document.getElementById('chases').textContent = 'Weiche dem Verkehr aus und entkomme der Polizei! (Ab 500m = +5 Tickets)';
        window.activeKeyListener = (e) => {
            if(['ArrowLeft','a','A'].includes(e.key)) chMoveDir = -1;
            if(['ArrowRight','d','D'].includes(e.key)) chMoveDir = 1;
            if(['ArrowUp','w','W'].includes(e.key)) chBoost = true;
        };
        window.activeKeyUpListener = (e) => {
            if(['ArrowLeft','a','A','ArrowRight','d','D'].includes(e.key)) chMoveDir = 0;
            if(['ArrowUp','w','W'].includes(e.key)) chBoost = false;
        };
        document.addEventListener('keydown', window.activeKeyListener);
        document.addEventListener('keyup', window.activeKeyUpListener);
        app.stInt(S.chaseTick, 20);
    };
    S.chaseMove = function(dir) { chMoveDir = dir; };
    S.chaseStop = function() { chMoveDir = 0; };
    S.chaseBoost = function(on) { chBoost = on; };
    S.chaseTick = function() {
        if(chOver) return;
        let curSpeed = chSpeed + (chBoost ? 2.5 : 0);
        chDist += curSpeed * 0.15;
        chSpeed = Math.min(13, 5 + chDist * 0.004); // Kontinuierlich steigende Geschwindigkeit
        chRoadOffset = (chRoadOffset + curSpeed * 2) % 40;

        let stars = Math.min(5, 1 + Math.floor(chDist / 300));
        document.getElementById('chaseDist').textContent = Math.floor(chDist);
        document.getElementById('chaseSpd').textContent = Math.floor(curSpeed * 24);
        document.getElementById('chaseStars').textContent = '⭐'.repeat(stars);

        chCar.x = Math.max(36, Math.min(324 - chCar.w, chCar.x + chMoveDir * 5.2));

        // Steigende Verkehrsdichte
        let spawnChance = Math.min(0.065, 0.022 + chDist * 0.00003);
        if(Math.random() < spawnChance && chTraffic.length < 7) {
            let lanes = [45, 118, 192, 265];
            let laneX = lanes[Math.floor(Math.random() * lanes.length)];
            if(!chTraffic.some(t => Math.abs(t.y - (-80)) < 110 && Math.abs(t.x - laneX) < 30)) {
                let colors = ['#ffc857', '#a78bfa', '#66e3ff', '#b8f36b', '#ff80bf'];
                chTraffic.push({
                    x: laneX, y: -80, w: 36, h: 62,
                    spd: 2 + Math.random() * 2.2,
                    clr: colors[Math.floor(Math.random() * colors.length)]
                });
            }
        }

        // Zusätzliche Polizeiwagen ab höherem Fahndungslevel
        if(stars >= 3 && chPolice.length < 2) {
            chPolice.push({ x: 90, y: 440, w: 36, h: 64, vx: 0, siren: 10 });
        }

        // Zeichne Highway
        chCtx.fillStyle = '#111827';
        chCtx.fillRect(0, 0, 360, 480);
        chCtx.fillStyle = '#1f2937';
        chCtx.fillRect(30, 0, 300, 480);
        chCtx.fillStyle = '#ef4444';
        chCtx.fillRect(24, 0, 6, 480);
        chCtx.fillRect(330, 0, 6, 480);

        chCtx.strokeStyle = '#ffffff55';
        chCtx.lineWidth = 3;
        for(let lx of [105, 180, 255]) {
            for(let y = -40 + chRoadOffset; y < 480; y += 40) {
                chCtx.beginPath();
                chCtx.moveTo(lx, y);
                chCtx.lineTo(lx, y + 22);
                chCtx.stroke();
            }
        }

        // Verkehr bewegen & Kollision prüfen
        for(let i = chTraffic.length - 1; i >= 0; i--) {
            let t = chTraffic[i];
            t.y += (curSpeed - t.spd);
            chCtx.fillStyle = t.clr;
            chCtx.fillRect(t.x, t.y, t.w, t.h);
            chCtx.fillStyle = '#0b1020';
            chCtx.fillRect(t.x + 5, t.y + 10, t.w - 10, 14);
            if(chCar.x < t.x + t.w - 4 && chCar.x + chCar.w - 4 > t.x && chCar.y < t.y + t.h - 4 && chCar.y + chCar.h - 4 > t.y) {
                S.chaseEnd('💥 Crash im Highway-Verkehr!');
                return;
            }
            if(t.y > 520) chTraffic.splice(i, 1);
        }

        // Polizei-KI (jagt den Spieler von hinten & drängt bei Boost-Mangel näher)
        chPolice.forEach((p, idx) => {
            let targetX = chCar.x + (idx === 1 ? -48 : 0);
            p.x += (targetX - p.x) * 0.04;
            let desiredY = chBoost ? 425 : (415 - stars * 8);
            p.y += (desiredY - p.y) * 0.03;
            p.siren = (p.siren + 1) % 20;

            chCtx.fillStyle = '#111827';
            chCtx.fillRect(p.x, p.y, p.w, p.h);
            chCtx.fillStyle = '#ffffff';
            chCtx.fillRect(p.x + 3, p.y + 18, p.w - 6, 24);
            // Blaulicht-Sirene
            chCtx.fillStyle = p.siren < 10 ? '#ef4444' : '#3b82f6';
            chCtx.fillRect(p.x + 6, p.y + 24, 11, 8);
            chCtx.fillStyle = p.siren < 10 ? '#3b82f6' : '#ef4444';
            chCtx.fillRect(p.x + p.w - 17, p.y + 24, 11, 8);

            if(chCar.x < p.x + p.w - 4 && chCar.x + chCar.w - 4 > p.x && chCar.y < p.y + p.h - 4 && chCar.y + chCar.h - 4 > p.y) {
                S.chaseEnd('🚓 Von der Polizei gestoppt!');
            }
        });

        // Spieler-Sportwagen
        chCtx.fillStyle = '#ff526f';
        chCtx.fillRect(chCar.x, chCar.y, chCar.w, chCar.h);
        chCtx.fillStyle = '#66e3ff';
        chCtx.fillRect(chCar.x + 5, chCar.y + 12, chCar.w - 10, 16);
    };
    S.chaseEnd = function(reason) {
        chOver = true;
        app.clrAll();
        let finalDist = Math.floor(chDist);
        app.saveHighscore('chase', finalDist);
        if(finalDist >= 500) {
            document.getElementById('chases').textContent = `${reason} Distanz: ${finalDist}m — Starke Flucht! (+5 Tickets bereit)`;
            app.offerTicketClaim(`Highway Police Chase (${finalDist}m geschafft)`);
        } else {
            document.getElementById('chases').textContent = `${reason} Distanz: ${finalDist}m (Mindestens 500m für +5 Tickets nötig!)`;
        }
    };

    // =========================================================================
    // 3. BUGFIX: 15-ETAGEN-SPIEL (TOWER STACKER — WERTET AB EXAKT 15 ETAGEN)
    // =========================================================================
    let twCtx, twBlocks, twCurr, twFloor, twOver, twWinClaimed;
    S.towerStart = function() {
        let cvs = document.getElementById('towerCvs');
        twCtx = cvs.getContext('2d');
        twBlocks = [{ x: 90, w: 160, y: 390 }];
        twFloor = 0;
        twOver = false;
        twWinClaimed = false;
        twCurr = { x: 20, w: 160, y: 368, vx: 3.5 };
        let best = Number(localStorage.getItem('pv_best_tower')) || 0;
        document.getElementById('towerFloor').textContent = '0';
        document.getElementById('towerBest').textContent = best;
        document.getElementById('towers').textContent = 'Stapele mindestens 15 Etagen für den Sieg & +5 Tickets!';
        window.activeKeyListener = (e) => {
            if(e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter') {
                e.preventDefault();
                S.towerDrop();
            }
        };
        document.addEventListener('keydown', window.activeKeyListener);
        app.stInt(S.towerTick, 20);
    };
    S.towerTick = function() {
        if(twOver) return;
        twCurr.x += twCurr.vx;
        if(twCurr.x <= 0 || twCurr.x + twCurr.w >= 340) twCurr.vx *= -1;

        twCtx.fillStyle = '#0b1020';
        twCtx.fillRect(0, 0, 340, 420);

        // 15-Etagen-Ziellinie anzeigen
        let camOffset = Math.max(0, (twFloor - 10) * 22);
        let goalY = 390 - 15 * 22 + camOffset;
        if(goalY > 0 && goalY < 420) {
            twCtx.strokeStyle = '#b8f36b88';
            twCtx.setLineDash([6, 4]);
            twCtx.beginPath();
            twCtx.moveTo(0, goalY);
            twCtx.lineTo(340, goalY);
            twCtx.stroke();
            twCtx.setLineDash([]);
            twCtx.fillStyle = '#b8f36b';
            twCtx.font = 'bold 11px sans-serif';
            twCtx.fillText('🎯 15 ETAGEN ZIEL', 8, goalY - 5);
        }

        twBlocks.forEach((b, idx) => {
            let drawY = b.y + camOffset;
            twCtx.fillStyle = idx >= 15 ? '#b8f36b' : '#5c7cff';
            twCtx.fillRect(b.x, drawY, b.w, 20);
        });

        twCtx.fillStyle = '#66e3ff';
        twCtx.fillRect(twCurr.x, twCurr.y + camOffset, twCurr.w, 20);
    };
    S.towerDrop = function() {
        if(twOver) return;
        let prev = twBlocks[twBlocks.length - 1];
        let left = Math.max(twCurr.x, prev.x);
        let right = Math.min(twCurr.x + twCurr.w, prev.x + prev.w);
        let overlap = right - left;

        if(overlap <= 0) {
            twOver = true;
            app.clrAll();
            app.saveHighscore('tower', twFloor);
            if(twFloor >= 15) {
                document.getElementById('towers').textContent = `🏆 Stark! Du hast ${twFloor} Etagen erreicht (15+ Etagen gezählt)!`;
                if(!twWinClaimed) {
                    twWinClaimed = true;
                    app.offerTicketClaim(`${twFloor} Etagen im Turmbau geschafft`);
                }
            } else {
                document.getElementById('towers').textContent = `Daneben bei Etage ${twFloor}! Ab 15 Etagen gibt es den +5 Ticket-Bonus.`;
            }
            return;
        }

        twFloor++;
        twBlocks.push({ x: left, w: overlap, y: 390 - twFloor * 22 });
        document.getElementById('towerFloor').textContent = twFloor;
        app.saveHighscore('tower', twFloor);
        let best = Math.max(twFloor, Number(localStorage.getItem('pv_best_tower')) || 0);
        document.getElementById('towerBest').textContent = best;

        // Sofortige Wertung bei exakt 15 Etagen!
        if(twFloor >= 15 && !twWinClaimed) {
            twWinClaimed = true;
            document.getElementById('towers').textContent = `🎉 15 Etagen erreicht und gezählt! (+5 Tickets Button oben freigeschaltet — baue weiter für deinen Rekord!)`;
            app.offerTicketClaim(`15 Etagen im Etagen-Spiel erreicht`);
        }

        twCurr = {
            x: 10,
            w: overlap,
            y: 390 - (twFloor + 1) * 22,
            vx: (3.5 + twFloor * 0.25) * (Math.random() > 0.5 ? 1 : -1)
        };
    };

    // =========================================================================
    // BESTEHENDE 34 SOLO-SPIELE (MIT PAUSCHALEM +5 TICKET GUTSCHREIBEN-TRIGGER)
    // =========================================================================
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
                    i.style="text-align:center;text-transform:uppercase;padding:0;font-weight:bold;background:#0b1020;color:#fff;border:1px solid var(--cyan);border-radius:6px;width:100%;height:100%;font-size:24px";
                    i.onkeyup=(ev)=>S.cwNav(ev,r,c);
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
    S.cwCheck = function(){
        let ok=true;
        for(let r=0;r<5;r++)for(let c=0;c<5;c++){
            if(S.cwD[r][c]!=='*'){
                let i=document.getElementById(`cw_${r}_${c}`);
                if(i && i.value.toUpperCase()!==S.cwD[r][c]) ok=false;
            }
        }
        if(ok){
            document.getElementById('cws').textContent='Richtig gelöst! (+5 Tickets über Button oben gutschreiben)';
            app.offerTicketClaim('Kreuzworträtsel gelöst');
        }else{
            document.getElementById('cws').textContent='Fehler vorhanden!';
        }
    };

    let hmWords=["COMPUTER","INTERNET","SOFTWARE","GAMING"], hmW="", hmG=[], hmE=0;
    S.hmStart = function(){hmW=hmWords[Math.floor(Math.random()*hmWords.length)];hmG=[];hmE=0;S.hmR();};
    S.hmR = function(){let t="";let win=true;for(let c of hmW){if(hmG.includes(c)){t+=c;}else{t+="_";win=false;}}document.getElementById('hmw').textContent=t;document.getElementById('hms').textContent=win?'Gewonnen!':hmE>=6?'Verloren! Wort: '+hmW:'Fehler: '+hmE+'/6';if(win)app.offerTicketClaim('Hangman gewonnen');let kb=document.getElementById('hmkb');kb.innerHTML='';if(win||hmE>=6)return;for(let i=65;i<=90;i++){let l=String.fromCharCode(i);let b=document.createElement('button');b.className='btn';b.textContent=l;b.disabled=hmG.includes(l);b.onclick=()=>{hmG.push(l);if(!hmW.includes(l))hmE++;S.hmR();};kb.append(b);}};

    let aimS=0; S.aimStart = function(){aimS=0;S.aimR();app.stTo(()=>{document.getElementById('aims').textContent='Zeit um! Punkte: '+aimS;document.getElementById('aimb').innerHTML='';if(aimS>=10)app.offerTicketClaim('Aim Trainer beendet');},10000);document.getElementById('aims').textContent='Klicke das Ziel!';};
    S.aimR = function(){let e=document.getElementById('aimb');e.innerHTML='';let x=Math.random()*80,y=Math.random()*80;let b=document.createElement('div');b.style=`position:absolute;left:${x}%;top:${y}%;width:40px;height:40px;background:#ff526f;border-radius:50%;cursor:pointer`;b.onpointerdown=()=>{aimS++;S.aimR();};e.append(b);};

    let mthA=0; S.mathStart = function(){let a=Math.floor(Math.random()*50),b=Math.floor(Math.random()*50);mthA=a+b;document.getElementById('mthq').textContent=`${a} + ${b} = ?`;document.getElementById('mthi').value='';document.getElementById('mths').textContent='Tippe das Ergebnis!';};
    S.mthTry = function(){let ok = parseInt(document.getElementById('mthi').value)===mthA; document.getElementById('mths').textContent = ok ? 'Richtig!' : 'Falsch!'; if(ok) app.offerTicketClaim('Kopfrechnen gelöst');};

    S.slotStart = function(){document.getElementById('sltb').innerHTML='<span>❓</span><span>❓</span><span>❓</span>'; document.getElementById('slts').textContent='Viel Glück!';};
    S.sltRoll = function(){let a=['🍒','🍋','🍉','⭐'], r=[]; for(let i=0;i<3;i++)r.push(a[Math.floor(Math.random()*a.length)]); let e=document.getElementById('sltb').children; for(let i=0;i<3;i++)e[i].textContent=r[i]; let win=(r[0]===r[1]&&r[1]===r[2]); document.getElementById('slts').textContent = win ? 'JACKPOT! (+5 Tickets bereit)' : 'Leider nichts.'; if(win) app.offerTicketClaim('Jackpot geknackt');};

    S.coinStart = function(){document.getElementById('cnd').textContent='🪙'; document.getElementById('cns').textContent='Kopf oder Zahl?';};
    S.coinFlip = function(){document.getElementById('cnd').textContent = Math.random()>0.5?'KOPF':'ZAHL';};

    let m8Ans=["Ja","Nein","Vielleicht","Sicher","Niemals","Frag später"];
    S.m8Start = function(){document.getElementById('m8a').textContent='8'; document.getElementById('m8a').style.fontSize='50px';};
    S.m8Ask = function(){document.getElementById('m8a').textContent=m8Ans[Math.floor(Math.random()*m8Ans.length)];document.getElementById('m8a').style.fontSize='25px';};

    let tmT=0;
    S.timerStart = function(){tmT=0; document.getElementById('tmd').textContent='0.00'; document.getElementById('tmb').textContent='Start';};
    S.tmAct = function(){let b=document.getElementById('tmb'); if(tmT===0){tmT=Date.now();b.textContent='Stopp';document.getElementById('tmd').textContent='Läuft...';}else{let d=(Date.now()-tmT)/1000;document.getElementById('tmd').textContent=d.toFixed(2)+'s';let ok=Math.abs(10-d)<0.2;document.getElementById('tms').textContent=ok?'Perfekt!':'Daneben.';if(ok)app.offerTicketClaim('10s Timer geschafft');tmT=0;b.textContent='Start';}};

    let clkS=0, clkC=1, clkP=10; S.clickerStart = function(){clkS=0;clkC=1;clkP=10;S.clkR();}; S.clkR = function(){document.getElementById('clks').textContent='Kekse: '+clkS;document.getElementById('clku').textContent=`Upgrade (+1/Klick) - Kosten: ${clkP}`;document.getElementById('clku').disabled=clkS<clkP;}; S.clkHit = function(e){clkS+=clkC;e.style.transform='scale(0.9)';app.stTo(()=>e.style.transform='none',50);S.clkR();}; S.clkUp = function(){if(clkS>=clkP){clkS-=clkP;clkC++;clkP=Math.floor(clkP*1.5);S.clkR();}};

    let puzA=[]; S.puzStart = function(){puzA=[...Array(15).keys()].map(x=>x+1).concat([0]); for(let i=0;i<200;i++){let z=puzA.indexOf(0);let m=[];if(z%4!==0)m.push(z-1);if(z%4!==3)m.push(z+1);if(z>=4)m.push(z-4);if(z<=11)m.push(z+4);let s=m[Math.floor(Math.random()*m.length)];puzA[z]=puzA[s];puzA[s]=0;} S.puzR(); }; S.puzR = function(){let e=document.getElementById('puzg');e.innerHTML='';puzA.forEach((v,i)=>{let b=document.createElement('button');b.className='btn';b.style.fontSize='24px';if(v===0)b.style.opacity='0';else b.textContent=v;b.onclick=()=>S.puzMove(i);e.append(b);});let solved = puzA.join() === '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,0'; document.getElementById('puzs').textContent = solved ? 'Gelöst!' : 'Ordne 1 bis 15'; if(solved) app.offerTicketClaim('Schiebepuzzle gelöst');}; S.puzMove = function(i){let z=puzA.indexOf(0); if([1,-1,4,-4].includes(i-z) && !(i%4===0&&z%4===3) && !(z%4===0&&i%4===3)){puzA[z]=puzA[i];puzA[i]=0;S.puzR();}};

    let typT=["Die Sonne scheint hell.","Hallo Welt, wie geht es dir?","Programmieren macht Spass."];let typS="",typTm=0; S.typeStart = function(){typS=typT[Math.floor(Math.random()*typT.length)];document.getElementById('typt').textContent=typS;document.getElementById('typi').value='';document.getElementById('typi').disabled=false;document.getElementById('typs').textContent='Tippe!';typTm=Date.now();}; S.typCheck = function(){if(document.getElementById('typi').value===typS){document.getElementById('typs').textContent=`Fertig in ${((Date.now()-typTm)/1000).toFixed(2)}s`;document.getElementById('typi').disabled=true;app.offerTicketClaim('Tipp-Speed beendet');}};

    let oddL=1, oddT=0; S.oddStart = function(){oddL=1;S.oddR();}; S.oddR = function(){document.getElementById('odds').textContent='Level: '+oddL;let e=document.getElementById('oddg');e.innerHTML='';oddT=Math.floor(Math.random()*9);let h=Math.floor(Math.random()*360); for(let i=0;i<9;i++){let b=document.createElement('button');b.className='btn';b.style.background=`hsl(${h},70%,${i===oddT?50+Math.max(2,20-oddL):50}%)`;b.style.aspectRatio='1';b.onclick=()=>{if(i===oddT){oddL++;if(oddL===15)app.offerTicketClaim('15 Level im Farbfinder erreicht');S.oddR();}else{document.getElementById('odds').textContent='Falsch! Game Over bei Lvl '+oddL;e.innerHTML='';}};e.append(b);}};

    let hlC=50; S.hilowStart = function(){hlC=Math.floor(Math.random()*100)+1;document.getElementById('hln').textContent=hlC;document.getElementById('hls').textContent='Höher oder Tiefer?';}; S.hlGuess = function(d){let n=Math.floor(Math.random()*100)+1; let w=(n>=hlC&&d===1)||(n<=hlC&&d===-1); hlC=n; document.getElementById('hln').textContent=hlC; document.getElementById('hls').textContent=w?'Richtig! Weiter so.':'Falsch! Verloren.';};

    let bjC=0, bjd=false; S.bjStart = function(){bjC=0;bjd=false;document.getElementById('bjs').textContent='Ziehe Karten';S.bjHit();document.getElementById('bjh').disabled=false;document.getElementById('bjsb').disabled=false;}; S.bjHit = function(){if(bjd)return; bjC+=Math.floor(Math.random()*10)+1; document.getElementById('bjt').textContent=bjC; if(bjC>21){document.getElementById('bjs').textContent='Überkauft! Verloren.';bjd=true;document.getElementById('bjh').disabled=true;document.getElementById('bjsb').disabled=true;}}; S.bjStd = function(){if(bjd)return;bjd=true;let c=Math.floor(Math.random()*6)+16; let win=(c>21||bjC>c); document.getElementById('bjs').textContent = win ? `Gewonnen! (PC: ${c})` : `Verloren! (PC: ${c})`; if(win) app.offerTicketClaim('Blackjack gewonnen'); document.getElementById('bjh').disabled=true;document.getElementById('bjsb').disabled=true;};

    let skC=0, skT=0; S.speedStart = function(){skC=0;skT=0;document.getElementById('skb').textContent='GO!';document.getElementById('sks').textContent='30x Klicken!';}; S.skClick = function(){if(skC===0)skT=Date.now();skC++;document.getElementById('skb').textContent=skC;if(skC===30){document.getElementById('sks').textContent=`Fertig in ${((Date.now()-skT)/1000).toFixed(2)}s`;skC=0;skT=0;app.offerTicketClaim('Speed Klicker beendet');}};

    let trQ=[{q:"Hauptstadt von Frankreich?",a:["Paris","Rom","Berlin"],c:0},{q:"8 x 7 = ?",a:["54","56","64"],c:1},{q:"Wer malt die Mona Lisa?",a:["Van Gogh","Picasso","Da Vinci"],c:2}]; let trI=0, trS=0; S.triviaStart = function(){trI=0;trS=0;S.trR();}; S.trR = function(){if(trI>=trQ.length){document.getElementById('trs').textContent=`Punkte: ${trS}/${trQ.length}`;document.getElementById('trq').textContent='';document.getElementById('tro').innerHTML='';if(trS===trQ.length)app.offerTicketClaim('Mini Trivia fehlerfrei gelöst');return;} document.getElementById('trs').textContent=`Frage ${trI+1}/${trQ.length}`; document.getElementById('trq').textContent=trQ[trI].q; let o=document.getElementById('tro');o.innerHTML=''; trQ[trI].a.forEach((a,i)=>{let b=document.createElement('button');b.className='btn';b.textContent=a;b.onclick=()=>{if(i===trQ[trI].c)trS++;trI++;S.trR();};o.append(b);});};

    let stC=['red','blue','green','yellow'], stN=['ROT','BLAU','GRÜN','GELB'], stP=0, stT=0; S.stroopStart = function(){stP=0;S.stR();}; S.stR = function(){document.getElementById('sts').textContent='Punkte: '+stP; stT=Math.floor(Math.random()*4); let cr=Math.floor(Math.random()*4); let w=document.getElementById('stw'); w.textContent=stN[cr]; w.style.color=stC[stT]; let b=document.getElementById('stb'); b.innerHTML=''; stN.forEach((n,i)=>{let btn=document.createElement('button');btn.className='btn';btn.textContent=n;btn.onclick=()=>{if(i===stT){stP++;if(stP===10)app.offerTicketClaim('Stroop-Test gemeistert');S.stR();}else{document.getElementById('sts').textContent='Falsch! Punkte: '+stP;b.innerHTML='';}};b.append(btn);});};

    let mmS=[], mmU=[], mmL=true; S.memmatStart = function(){mmS=[];mmU=[];S.mmR(true);}; S.mmR = function(add){if(add)mmS.push(Math.floor(Math.random()*16));mmU=[];document.getElementById('mms').textContent='Merke dir die blauen Felder!';let e=document.getElementById('mmg');e.innerHTML='';for(let i=0;i<16;i++){let b=document.createElement('div');b.style=`aspect-ratio:1;background:#26314f;border-radius:8px`;b.id='mm_'+i;b.onclick=()=>S.mmC(i);e.append(b);} mmL=true; mmS.forEach(x=>document.getElementById('mm_'+x).style.background='#66e3ff'); app.stTo(()=>{for(let i=0;i<16;i++)document.getElementById('mm_'+i).style.background='#26314f';mmL=false;document.getElementById('mms').textContent='Klicke sie nach!';},1000);}; S.mmC = function(i){if(mmL)return; document.getElementById('mm_'+i).style.background='#66e3ff'; mmU.push(i); if(mmU[mmU.length-1]!==mmS[mmU.length-1]){document.getElementById('mms').textContent='Falsch!';mmL=true;}else if(mmU.length===mmS.length){mmL=true;document.getElementById('mms').textContent='Korrekt!';if(mmS.length===5)app.offerTicketClaim('Memory-Matrix geschafft');app.stTo(()=>S.mmR(true),1000);}};

    let dnCtx,dnY=150,dnV=0,dnX=400,dnO=false; S.dinoStart = function(){let c=document.getElementById('dncvs');dnCtx=c.getContext('2d');dnY=150;dnV=0;dnX=400;dnO=false;app.stInt(S.dnL,20);document.getElementById('dns').textContent='Läuft...';}; S.dnL = function(){if(dnO)return; dnV+=0.6;dnY+=dnV;if(dnY>150){dnY=150;dnV=0;} dnX-=5;if(dnX<-20)dnX=400; dnCtx.fillStyle='#0b1020';dnCtx.fillRect(0,0,400,200);dnCtx.fillStyle='#ff80bf';dnCtx.fillRect(50,dnY,20,20);dnCtx.fillStyle='#e34251';dnCtx.fillRect(dnX,150,20,20); if(dnX<70&&dnX>30&&dnY>130){dnO=true;document.getElementById('dns').textContent='Verloren!';}}; S.dnJump = function(){if(dnY>=150 && !dnO)dnV=-10;};

    let ctCtx,ctX=120,ctxF=150,ctyF=0,ctS=0,ctO=false; S.catchStart = function(){let c=document.getElementById('ctcvs');ctCtx=c.getContext('2d');ctX=120;ctxF=150;ctyF=0;ctS=0;ctO=false;app.stInt(S.ctL,20);document.getElementById('cts').textContent='Punkte: 0';}; S.ctL = function(){if(ctO)return; ctyF+=3+ctS*0.2; if(ctyF>400){if(ctxF>ctX&&ctxF<ctX+60){ctS++;document.getElementById('cts').textContent='Punkte: '+ctS;if(ctS===10)app.offerTicketClaim('Catch it gemeistert');ctyF=0;ctxF=Math.random()*280;}else{ctO=true;document.getElementById('cts').textContent='Verpasst! Punkte: '+ctS;}} ctCtx.fillStyle='#0b1020';ctCtx.fillRect(0,0,300,400); ctCtx.fillStyle='#66e3ff';ctCtx.fillRect(ctX,380,60,10); ctCtx.fillStyle='#b8f36b';ctCtx.fillRect(ctxF,ctyF,15,15);}; S.ctMove = function(e){let r=document.getElementById('ctcvs').getBoundingClientRect();ctX=e.clientX-r.left-30;};

    const wlist=["APFEL","BAUCH","BLATT","CHAOS","DAMPF"];let wans="",wtries=0,wgrid=[]; S.wordleStart = function(){wans=wlist[Math.floor(Math.random()*wlist.length)];wtries=0;wgrid=Array(30).fill(null);document.getElementById('wi').value='';document.getElementById('wi').disabled=false;document.getElementById('ws').textContent='Errate das 5-Buchstaben-Wort!';S.wordleRender();}; S.wordleRender = function(){let e=document.getElementById('wb');e.innerHTML='';for(let i=0;i<30;i++){let d=document.createElement('div');d.className='wbox';if(wgrid[i]){d.textContent=wgrid[i].c;d.classList.add(wgrid[i].s);}e.append(d);}}; S.wordleTry = function(){if(wtries>=6)return;let w=document.getElementById('wi').value.toUpperCase().trim();if(w.length!==5)return;let a=wans.split(''),c=w.split(''),res=Array(5).fill('gray');for(let i=0;i<5;i++){if(c[i]===a[i]){res[i]='green';a[i]=null;}}for(let i=0;i<5;i++){if(res[i]!=='green'&&a.includes(c[i])){res[i]='yellow';a[a.indexOf(c[i])]=null;}}for(let i=0;i<5;i++){wgrid[wtries*5+i]={c:c[i],s:res[i]};}wtries++;S.wordleRender();if(w===wans){document.getElementById('ws').textContent=`Gewonnen!`;document.getElementById('wi').disabled=true;app.offerTicketClaim('Wort-Rätsel gelöst');}else if(wtries>=6){document.getElementById('ws').textContent=`Verloren! Wort: ${wans}`;document.getElementById('wi').disabled=true;}else{document.getElementById('wi').value='';}};

    let snakectx,snake=[],sdir={x:1,y:0},sfood={x:15,y:15},slock=false; S.snakeStart = function(){let cvs=document.getElementById('scvs');snakectx=cvs.getContext('2d');snake=[{x:10,y:10}];sdir={x:1,y:0};sfood={x:Math.floor(Math.random()*20),y:Math.floor(Math.random()*20)};slock=false;app.stInt(S.snakeTick,110);document.getElementById('snakes').textContent='Punkte: 0'; window.activeKeyListener = S.snakeKey; document.addEventListener('keydown',S.snakeKey);}; S.snakeKey = function(e){if(slock)return;if(["ArrowUp","w","W"].includes(e.key)&&sdir.y===0){sdir={x:0,y:-1};slock=true;}if(["ArrowDown","s","S"].includes(e.key)&&sdir.y===0){sdir={x:0,y:1};slock=true;}if(["ArrowLeft","a","A"].includes(e.key)&&sdir.x===0){sdir={x:-1,y:0};slock=true;}if(["ArrowRight","d","D"].includes(e.key)&&sdir.x===0){sdir={x:1,y:0};slock=true;}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();}; S.snakeTick = function(){let h={x:snake[0].x+sdir.x,y:snake[0].y+sdir.y};if(h.x<0||h.x>=20||h.y<0||h.y>=20||snake.some(s=>s.x===h.x&&s.y===h.y)){app.clrAll();let pts=snake.length-1;document.getElementById('snakes').textContent='Game Over! Punkte: '+pts;if(pts>=5)app.offerTicketClaim('Snake Runde beendet');return;}snake.unshift(h);if(h.x===sfood.x&&h.y===sfood.y){sfood={x:Math.floor(Math.random()*20),y:Math.floor(Math.random()*20)};document.getElementById('snakes').textContent='Punkte: '+(snake.length-1);}else{snake.pop();}snakectx.fillStyle='#0b1020';snakectx.fillRect(0,0,300,300);snakectx.fillStyle='#e34251';snakectx.fillRect(sfood.x*15,sfood.y*15,15,15);snakectx.fillStyle='#b8f36b';snake.forEach(s=>snakectx.fillRect(s.x*15,s.y*15,14,14));slock=false;};

    let mg=[],mgo=false,mrem=0; S.minesStart = function(){mgo=false;mg=Array(100).fill().map(()=>({m:Math.random()<0.15,o:false,f:false}));mrem=100-mg.filter(x=>x.m).length;document.getElementById('mss').textContent='Finde alle sicheren Felder!';S.msRender();}; S.msRender = function(){let e=document.getElementById('msb');e.innerHTML='';mg.forEach((c,i)=>{let b=document.createElement('button');b.className='mcell '+ (c.o?'open':'');if(c.o){if(c.m){b.classList.add('mine');b.textContent='💣';}else{let n=S.msAdj(i).filter(x=>mg[x].m).length;b.textContent=n>0?n:'';b.style.color=['','#66e3ff','#b8f36b','#ff80bf','#a78bfa','#e6b72d','#e34251','#fff','#fff'][n];}}else if(c.f)b.textContent='🚩';b.onclick=()=>S.msClick(i);b.oncontextmenu=(ev)=>{ev.preventDefault();if(!mgo&&!c.o){c.f=!c.f;S.msRender();}};e.append(b);});}; S.msAdj = function(i){let r=[],x=i%10,y=Math.floor(i/10);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){if(dx===0&&dy===0)continue;let nx=x+dx,ny=y+dy;if(nx>=0&&nx<10&&ny>=0&&ny<10)r.push(ny*10+nx);}return r;}; S.msClick = function(i){if(mgo||mg[i].o||mg[i].f)return;mg[i].o=true;if(mg[i].m){mgo=true;document.getElementById('mss').textContent='BUMM!';mg.forEach(c=>{if(c.m)c.o=true;});S.msRender();return;}mrem--;let n=S.msAdj(i).filter(x=>mg[x].m).length;if(n===0)S.msAdj(i).forEach(S.msClick);if(mrem===0){mgo=true;document.getElementById('mss').textContent='Gewonnen!';app.offerTicketClaim('Minesweeper gewonnen');}S.msRender();};

    S.rpsStart = function(){ document.getElementById('rpsu').textContent='🤔'; document.getElementById('rpso').textContent='🤔'; document.getElementById('rpss').textContent='Wähle deine Waffe!'; };
    S.rpsPlay = function(u){let c=['✊','✋','✌️'][Math.floor(Math.random()*3)];let win=(u==='✊'&&c==='✌️')||(u==='✋'&&c==='✊')||(u==='✌️'&&c==='✋');document.getElementById('rpsu').textContent=u;document.getElementById('rpso').textContent=c;document.getElementById('rpss').textContent=u===c?'Unentschieden!':(win?'Du gewinnst!':'Computer gewinnt!');if(win)app.offerTicketClaim('Schnick Schnack gewonnen');};

    let first=null,lock=false,found=0,moves=0; S.memoryStart = function(){let a=['🍉','🍉','🍓','🍓','🚀','🚀','🎧','🎧','🐸','🐸','🌈','🌈','⚽','⚽','🦊','🦊'].sort(()=>Math.random()-.5);first=null;lock=false;found=0;moves=0;document.getElementById('ms_status').textContent='Finde die Paare.';let e=document.getElementById('mb');e.innerHTML='';a.forEach(v=>{let b=document.createElement('button');b.textContent='?';b.dataset.v=v;b.onclick=()=>{if(lock||b.classList.contains('open'))return;b.classList.add('open');b.textContent=v;if(!first){first=b;return;}moves++;if(first.dataset.v===v){found++;first=null;document.getElementById('ms_status').textContent=`Paare ${found}/8 · Züge ${moves}`;if(found===8){document.getElementById('ms_status').textContent=`Geschafft!`;app.offerTicketClaim('Memory gelöst');}}else{lock=true;let f=first;first=null;app.stTo(()=>{f.classList.remove('open');b.classList.remove('open');f.textContent=b.textContent='?';lock=false;},700);}};e.append(b);});};

    S.diceStart = function(){ document.getElementById('df').textContent='🎲 🎲'; document.getElementById('ds').textContent='Du gegen den Computer.'; };
    S.diceRoll = function(){let a=1+Math.random()*6|0,b=1+Math.random()*6|0,c=2+(Math.random()*6|0)+(Math.random()*6|0),n=a+b;document.getElementById('df').textContent=['⚀','⚁','⚂','⚃','⚄','⚅'][a-1]+' '+['⚀','⚁','⚂','⚃','⚄','⚅'][b-1];document.getElementById('ds').textContent=`Du: ${n} · Computer: ${c} — ${n>c?'Du gewinnst!':n<c?'Computer gewinnt!':'Unentschieden!'}`;if(n>c)app.offerTicketClaim('Würfel-Duell gewonnen');};

    let c4=Array(42).fill(0),ct=1,cd=false; S.c4reset = function(){c4=Array(42).fill(0);ct=1;cd=false;document.getElementById('c4s').textContent='Rot beginnt.';S.c4render();}; S.c4render = function(){let e=document.getElementById('c4b');e.innerHTML='';for(let r=0;r<6;r++)for(let c=0;c<7;c++){let b=document.createElement('button');b.className='hole';let d=document.createElement('div');d.className='disc '+(c4[r*7+c]===1?'red':c4[r*7+c]===2?'yellow':'');b.append(d);b.onclick=()=>S.c4drop(c);e.append(b);}}; S.c4drop = function(c){if(cd)return;for(let r=5;r>=0;r--){let i=r*7+c;if(!c4[i]){c4[i]=ct;S.c4render();let win=[[0,1],[1,0],[1,1],[1,-1]].some(([dr,dc])=>{let n=1;for(let s of [-1,1]){let y=r+dr*s,x=c+dc*s;while(y>=0&&y<6&&x>=0&&x<7&&c4[y*7+x]===ct){n++;y+=dr*s;x+=dc*s;}}return n>=4;});if(win){document.getElementById('c4s').textContent=(ct===1?'Rot':'Gelb')+' gewinnt!';cd=true;app.offerTicketClaim('Vier gewinnt beendet');}else{ct=3-ct;document.getElementById('c4s').textContent=(ct===1?'Rot':'Gelb')+' ist dran.';}return;}}};

    let tt=Array(9).fill(''),turn='X',td=false; S.ttreset = function(){tt=Array(9).fill('');turn='X';td=false;document.getElementById('tts').textContent='X beginnt.';S.ttrender();}; S.ttrender = function(){let e=document.getElementById('ttb');e.innerHTML='';tt.forEach((v,i)=>{let b=document.createElement('button');b.textContent=v;b.onclick=()=>S.ttplay(i);e.append(b);});}; S.ttplay = function(i){if(td||tt[i])return;tt[i]=turn;S.ttrender();let w=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];if(w.some(a=>a.every(j=>tt[j]===turn))){document.getElementById('tts').textContent=turn+' gewinnt!';td=true;app.offerTicketClaim('Tic Tac Toe beendet');}else if(tt.every(Boolean)){document.getElementById('tts').textContent='Unentschieden!';td=true;}else{turn=turn==='X'?'O':'X';document.getElementById('tts').textContent=turn+' ist dran.';}};

    let flapCtx,fy=200,fvy=0,fpipes=[],fscore=0,fframe=0,fover=true; S.flappyStart = function(){fy=200;fvy=0;fpipes=[];fscore=0;fframe=0;fover=false;app.stInt(S.flapLoop,20);document.getElementById('fs').textContent='Punkte: 0';document.getElementById('flapcvs').onpointerdown=()=>{fvy=-6;};}; S.flapLoop = function(){if(fover)return;fvy+=0.3;fy+=fvy;fframe++;let c=document.getElementById('flapcvs');flapCtx=c.getContext('2d');flapCtx.clearRect(0,0,320,400);flapCtx.fillStyle='#66e3ff';flapCtx.fillRect(40,fy,20,20);if(fframe%90===0){let h=Math.floor(Math.random()*200)+50;fpipes.push({x:320,y:0,w:30,h:h},{x:320,y:h+110,w:30,h:400-h-110,p:true});}flapCtx.fillStyle='#b8f36b';for(let i=0;i<fpipes.length;i++){let p=fpipes[i];p.x-=2.5;flapCtx.fillRect(p.x,p.y,p.w,p.h);if(40<p.x+p.w&&60>p.x&&fy<p.y+p.h&&fy+20>p.y)fover=true;if(p.p&&p.x===35){fscore++;document.getElementById('fs').textContent='Punkte: '+fscore;}}if(fy>400||fy<0)fover=true;if(fover){document.getElementById('fs').textContent='Game Over! Punkte: '+fscore;if(fscore>=3)app.offerTicketClaim('Flappy Block abgeschlossen');}};

    let pongCtx,pkeys={},pball,p1y,p2y,pscore=[0,0]; S.pongStart = function(){pball={x:250,y:150,vx:4,vy:3};p1y=110;p2y=110;pscore=[0,0];app.stInt(S.pongLoop,16);document.getElementById('pongs').textContent=`P1: 0  |  P2: 0`; window.activeKeyListener = (e)=>{pkeys[e.key]=true;if(['ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();}; window.activeKeyUpListener = (e)=>{pkeys[e.key]=false;}; document.addEventListener('keydown',window.activeKeyListener); document.addEventListener('keyup',window.activeKeyUpListener);}; S.pongLoop = function(){let c=document.getElementById('pongcvs');pongCtx=c.getContext('2d');pongCtx.clearRect(0,0,500,300);if(pkeys['w']&&p1y>0)p1y-=5;if(pkeys['s']&&p1y<220)p1y+=5;if(pkeys['ArrowUp']&&p2y>0)p2y-=5;if(pkeys['ArrowDown']&&p2y<220)p2y+=5;pball.x+=pball.vx;pball.y+=pball.vy;if(pball.y<=0||pball.y>=290)pball.vy*=-1;if(pball.x<=30&&pball.x>=20&&pball.y>=p1y&&pball.y<=p1y+80){pball.vx*=-1.05;pball.x=31;}if(pball.x>=460&&pball.x<=470&&pball.y>=p2y&&pball.y<=p2y+80){pball.vx*=-1.05;pball.x=459;}if(pball.x<0){pscore[1]++;pball={x:250,y:150,vx:-4,vy:3};}if(pball.x>500){pscore[0]++;pball={x:250,y:150,vx:4,vy:3};}pongCtx.fillStyle='#fff';pongCtx.fillRect(10,p1y,10,80);pongCtx.fillRect(480,p2y,10,80);pongCtx.fillRect(pball.x,pball.y,10,10);document.getElementById('pongs').textContent=`P1: ${pscore[0]}  |  P2: ${pscore[1]}`;};

    let sSeq=[],sUser=[],sLock=true; S.simonStart = function(){sSeq=[];sUser=[];app.stTo(S.simonAdd,800);}; S.simonAdd = function(){sSeq.push(Math.floor(Math.random()*4));sUser=[];document.getElementById('simons').textContent=`Runde ${sSeq.length}`;sLock=true;let i=0;let int=app.stInt(()=>{let b=document.getElementById('sb'+sSeq[i]);b.classList.add('active');app.stTo(()=>b.classList.remove('active'),400);i++;if(i>=sSeq.length){clearInterval(int);sLock=false;}},700);}; S.simonPress = function(id){if(sLock)return;let b=document.getElementById('sb'+id);b.classList.add('active');app.stTo(()=>b.classList.remove('active'),400);sUser.push(id);if(sUser[sUser.length-1]!==sSeq[sUser.length-1]){sLock=true;document.getElementById('simons').textContent=`Falsch!`;}else if(sUser.length===sSeq.length){sLock=true;if(sSeq.length===5)app.offerTicketClaim('Farb-Echo Runde 5 geschafft');app.stTo(S.simonAdd,1000);}};

    let moleScore=0,moleTime=30,activeMole=-1; S.moleStart = function(){moleScore=0;moleTime=30;activeMole=-1;let e=document.getElementById('moleb');e.innerHTML='';for(let i=0;i<9;i++){let h=document.createElement('div');h.className='mole-hole';h.id='mh'+i;h.innerHTML='<span>🐹</span>';h.onpointerdown=()=>{if(i===activeMole){moleScore++;document.getElementById('mh'+i).classList.remove('up');activeMole=-1;}};e.append(h);}S.moleLoop();}; S.moleLoop = function(){document.getElementById('moles').textContent=`Punkte: ${moleScore} · Zeit: ${moleTime}s`;if(moleTime<=0){if(moleScore>=10)app.offerTicketClaim('Maulwurf-Jagd beendet');return;}if(activeMole!==-1)document.getElementById('mh'+activeMole).classList.remove('up');activeMole=Math.floor(Math.random()*9);document.getElementById('mh'+activeMole).classList.add('up');moleTime--;app.stTo(S.moleLoop,1000);};

    let secret=0,tries=0; S.guessStart = function(){secret=1+Math.random()*100|0;tries=0;document.getElementById('gi').value='';document.getElementById('gs').textContent='Neue Zahl! Los!';}; S.guessTry = function(){let n=Number(document.getElementById('gi').value);tries++;let ok=(n===secret);document.getElementById('gs').textContent=ok?`Richtig in ${tries} Versuchen!`:n<secret?'Zu niedrig!':'Zu hoch!';if(ok)app.offerTicketClaim('Zahlenjagd gelöst');};

    let rmode='idle',rt0; S.reactionStart = function(){rmode='idle'; document.getElementById('rx').textContent='Start drücken und warten ...'; document.getElementById('rx').style.background='#283550'; document.getElementById('rs').textContent='Wie schnell bist du?';}; S.rxClick = function(){let b=document.getElementById('rx'),s=document.getElementById('rs');if(rmode==='wait'){app.clrAll();rmode='idle';b.textContent='Zu früh!';b.style.background='#283550';}else if(rmode==='go'){s.textContent='Zeit: '+(Date.now()-rt0)+' ms';b.textContent='Stark!';b.style.background='#283550';rmode='idle';app.offerTicketClaim('Reaktionstest abgeschlossen');}else{rmode='wait';b.style.background='#a63b50';b.textContent='Warte...';s.textContent='Nicht zu früh!';app.stTo(()=>{rmode='go';rt0=Date.now();b.style.background='#237b55';b.textContent='JETZT!';},1200+Math.random()*3500);}};

    return S;
})();