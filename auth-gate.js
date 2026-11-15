/* =====================================================================
   AudioPhraser Studio — shared access gate (Firebase Auth + Firestore)
   ---------------------------------------------------------------------
   How access works:
   • The home page is public (feature information).
   • Editor / Player require a signed-in account whose email has an
     "approved" record in Firestore (collection "access"), granted by
     the super admin from admin.html.
   • Anyone can file an access request (collection "requests").
   • The super admin (SUPER_ADMIN_EMAIL) always has access.
   Until FIREBASE_CONFIG is filled in (firebase-config.js), the site is
   in SETUP MODE: no page is blocked; pages simply stay open in
   setup steps instead.
   ===================================================================== */
(function(){
"use strict";
const cfg = window.FIREBASE_CONFIG || {};
const ADMIN = (window.SUPER_ADMIN_EMAIL || "").toLowerCase();
const setupDone = !!(cfg.apiKey && cfg.apiKey.indexOf("PASTE_") !== 0 && cfg.projectId && cfg.projectId.indexOf("PASTE_") !== 0);
let _auth=null, _db=null, _user=null, _readyP=null, _sdkErr=null;

const style = document.createElement("style");
style.textContent = `
#gateOverlay{position:fixed; inset:0; background:#f8f9fa; z-index:99999; display:flex; align-items:center; justify-content:center; font-family:Roboto,system-ui,sans-serif}
#gateOverlay .gbox{background:#fff; border:1px solid #dadce0; border-radius:16px; box-shadow:0 1px 3px rgba(60,64,67,.15); padding:28px 30px; max-width:400px; width:calc(100% - 48px); text-align:center; color:#202124}
#gateOverlay .gbox h2{font-size:19px; margin:0 0 8px}
#gateOverlay .gbox p{color:#5f6368; font-size:13.5px; line-height:1.55; margin:6px 0}
#gateOverlay .spin{width:34px; height:34px; border:4px solid #e8f0fe; border-top-color:#1a73e8; border-radius:50%; margin:4px auto 14px; animation:gspin 0.9s linear infinite}
@keyframes gspin{to{transform:rotate(360deg)}}
#acctArea{display:inline-flex; align-items:center; gap:8px}
#acctArea .aemail{font-size:12.5px; color:#5f6368; max-width:170px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
#acctArea .abtn{border:1px solid #dadce0; background:#fff; color:#1a73e8; border-radius:16px; padding:6px 12px; font-size:12.5px; font-weight:500; cursor:pointer; text-decoration:none; display:inline-block}
#acctArea .abtn:hover{background:#e8f0fe}`;
document.head.appendChild(style);

function loadSdk(){
  if(window.firebase) return Promise.resolve();
  const base="https://www.gstatic.com/firebasejs/10.12.2/";
  const files=["firebase-app-compat.js","firebase-auth-compat.js","firebase-firestore-compat.js"];
  return files.reduce((p,f)=>p.then(()=>new Promise((res,rej)=>{
    const s=document.createElement("script"); s.src=base+f; s.onload=res; s.onerror=()=>rej(new Error("Could not load Firebase ("+f+"). Check your internet connection.")); document.head.appendChild(s);
  })), Promise.resolve());
}
function init(){
  if(_readyP) return _readyP;
  _readyP=(async()=>{
    if(!setupDone) return { setup:false };
    try{
      await loadSdk();
      if(!firebase.apps.length) firebase.initializeApp(cfg);
      _auth=firebase.auth(); _db=firebase.firestore();
      _user=await new Promise(res=>{ const un=_auth.onAuthStateChanged(u=>{ un(); res(u); }); });
    }catch(e){ _sdkErr=e; }
    return { setup:true, user:_user, error:_sdkErr };
  })();
  return _readyP;
}
const isAdmin = u => !!u && (u.email||"").toLowerCase()===ADMIN;
async function accessOf(email){
  const snap=await _db.collection("access").doc(email.toLowerCase()).get();
  return snap.exists? snap.data() : null;
}
async function requestOf(email){
  const snap=await _db.collection("requests").doc(email.toLowerCase()).get();
  return snap.exists? snap.data() : null;
}
async function state(){
  const r=await init();
  if(!r.setup) return { setup:false };
  if(r.error) return { setup:true, error:r.error };
  if(!_user) return { setup:true, user:null };
  if(isAdmin(_user)) return { setup:true, user:_user, admin:true, access:{status:"approved"} };
  let acc=null; try{ acc=await accessOf(_user.email); }catch(e){}
  return { setup:true, user:_user, admin:false, access:acc };
}
function here(){ return location.pathname.split("/").pop() || "index.html"; }
function goLogin(){ location.href="login.html?next="+encodeURIComponent(here()); }

/* ---------- full-screen gate overlay ---------- */
function overlay(html){
  let el=document.getElementById("gateOverlay");
  if(!el){ el=document.createElement("div"); el.id="gateOverlay"; document.body.appendChild(el); }
  el.innerHTML=`<div class="gbox">${html}</div>`;
  return el;
}
function removeOverlay(){ const el=document.getElementById("gateOverlay"); if(el) el.remove(); }


/* ---------- account chip (rendered into #acctArea when present) ---------- */
function renderAcct(user, admin){
  const host=document.getElementById("acctArea"); if(!host) return;
  if(!setupDone){ host.innerHTML=`<a class="abtn" href="login.html">Log in</a>`; return; }
  if(user){
    host.innerHTML=`<span class="aemail" title="${user.email}">${user.email}</span>`+
      (admin? `<a class="abtn" href="admin.html">Admin panel</a>` : ``)+
      `<button class="abtn" id="acctOut" type="button">Log out</button>`;
    const b=document.getElementById("acctOut");
    if(b) b.onclick=async()=>{ await signOut(); location.href="index.html"; };
  } else {
    host.innerHTML=`<a class="abtn" href="login.html">Log in</a>`;
  }
}

/* ---------- the gate used by protected pages (editor, player) ---------- */
async function requireAccess(){
  overlay(`<div class="spin"></div><h2>Checking your access…</h2><p>One moment please.</p>`);
  const st=await state();
  if(!st.setup){ removeOverlay(); renderAcct(null,false); return st; }
  if(st.error){ overlay(`<h2>Could not verify access</h2><p>${st.error.message||st.error}</p><p><a href="login.html">Go to the login page</a></p>`); return st; }
  if(!st.user){ goLogin(); return st; }
  if(st.admin || (st.access && st.access.status==="approved")){ removeOverlay(); renderAcct(st.user, st.admin); return st; }
  goLogin(); return st;
}

/* ---------- auth + admin operations ---------- */
async function signIn(email, pw){
  await init(); if(!setupDone) throw new Error("setup");
  const cred=await _auth.signInWithEmailAndPassword(email.trim(), pw);
  _user=cred.user; return state();
}
async function signOut(){ await init(); if(_auth){ await _auth.signOut(); _user=null; } }
async function submitRequest(name, email, note, whatsapp){
  await init(); if(!setupDone) throw new Error("setup");
  email=email.trim().toLowerCase();
  let existing=null;
  try{ existing=await requestOf(email); }catch(e){ existing=null; } /* rules deny non-admin reads; not fatal */
  if(existing && existing.status==="pending") return existing;
  const doc={ name:name.trim(), email, note:(note||"").trim(), whatsapp:(whatsapp||"").trim(), ts:new Date().toISOString(), status:"pending" };
  try{
    await _db.collection("requests").doc(email).set(doc);
  }catch(e){ /* rules may not list the whatsapp field yet — retry without it */
    const bare={ name:doc.name, email, note:doc.note, ts:doc.ts, status:"pending" };
    await _db.collection("requests").doc(email).set(bare);
    return bare;
  }
  return doc;
}
async function listRequests(){
  const snap=await _db.collection("requests").get();
  const out=[]; snap.forEach(d=>out.push(d.data()));
  return out.sort((a,b)=>String(b.ts).localeCompare(String(a.ts)));
}
async function listAccess(){
  const snap=await _db.collection("access").get();
  const out=[]; snap.forEach(d=>out.push(d.data()));
  return out.sort((a,b)=>String(a.email).localeCompare(String(b.email)));
}
async function approveUser(email, name, password, whatsapp){
  email=email.trim().toLowerCase();
  const sec=firebase.initializeApp(cfg, "sec-"+Date.now());
  try{
    await sec.auth().createUserWithEmailAndPassword(email, password);
  }catch(e){
    if(!(e && e.code==="auth/email-already-in-use")) throw e;
  }finally{
    try{ await sec.auth().signOut(); }catch(e){}
    try{ await sec.delete(); }catch(e){}
  }
  await _db.collection("access").doc(email).set({ email, name:name||"", whatsapp:whatsapp||"", status:"approved", grantedAt:new Date().toISOString(), grantedBy:ADMIN });
  await _db.collection("requests").doc(email).delete().catch(()=>{});
}
async function rejectRequest(email){ await _db.collection("requests").doc(email.toLowerCase()).delete(); }
async function revokeUser(email){
  email=email.toLowerCase();
  const cur=await accessOf(email);
  await _db.collection("access").doc(email).set(Object.assign({}, cur||{email}, { status:"revoked", revokedAt:new Date().toISOString() }));
}

window.MuseAuth={ init, state, requireAccess, renderAcct, signIn, signOut, submitRequest, requestOf, listRequests, listAccess, approveUser, rejectRequest, revokeUser, isAdmin, setupDone, ADMIN };
})();
