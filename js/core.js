
const firebaseConfig = {
  apiKey: "AIzaSyCBSidRZEMcqhTVxRiWzQ3-Fn5-yD-AS0M",
  authDomain: "playverse-bce37.firebaseapp.com",
  databaseURL: "https://playverse-bce37-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "playverse-bce37",
  storageBucket: "playverse-bce37.firebasestorage.app",
  messagingSenderId: "884239855268",
  appId: "1:884239855268:web:80c6abe3f74fa643eb0031"
};
let db=null, presRef=null;
try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.database();
  let connRef = db.ref('.info/connected');
  connRef.on('value', s => {
    if(s.val()===true){
       presRef = db.ref('playversePresence').push();
       presRef.onDisconnect().remove();
       presRef.set(true);
    }
  });
  db.ref('playversePresence').on('value', s => {
     let el = document.getElementById('onlineCount');
     if(el) el.textContent = s.numChildren();
  });
} catch(e) { console.warn("Firebase Init Error:", e) }

window.app = {
    itvs: [], toms: [], rafs: [], idleTimer: null, resetTimer: null,
    
    stInt: function(f,t) { let i=setInterval(f,t); this.itvs.push(i); return i; },
    stTo:  function(f,t) { let i=setTimeout(f,t); this.toms.push(i); return i; },
    clrAll: function() {
        this.itvs.forEach(clearInterval); this.itvs=[];
        this.toms.forEach(clearTimeout); this.toms=[];
        this.rafs.forEach(cancelAnimationFrame); this.rafs=[];
        if(this.idleTimer) clearTimeout(this.idleTimer);
        if(this.resetTimer) clearTimeout(this.resetTimer);
        
        // Remove active global key listeners for games if any
        if(window.activeKeyListener) {
            document.removeEventListener('keydown', window.activeKeyListener);
            window.activeKeyListener = null;
        }
        if(window.activeKeyUpListener) {
            document.removeEventListener('keyup', window.activeKeyUpListener);
            window.activeKeyUpListener = null;
        }
    },
    switchTab: function(t) {
        document.querySelectorAll('.tab-content').forEach(e=>e.classList.remove('active'));
        document.querySelectorAll('.tab').forEach(e=>e.classList.remove('active'));
        document.getElementById('grid-'+t).classList.add('active');
        document.getElementById('btn-'+t).classList.add('active');
    },
    home: function() {
        this.clrAll();
        document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
        document.getElementById('home').classList.add('active');
        if(window.multi && window.multi.roomListener && window.multi.roomRef){
            window.multi.roomRef.off('value', window.multi.roomListener);
            window.multi.roomListener=null;
        }
    },
    startSolo: function(id) {
        this.clrAll();
        document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
        let t = document.getElementById(id);
        if(t) t.classList.add('active');
        if(window.solo && typeof window.solo[id+'Start'] === 'function') window.solo[id+'Start']();
        else if(window.solo && typeof window.solo[id+'reset'] === 'function') window.solo[id+'reset']();
    }
};
