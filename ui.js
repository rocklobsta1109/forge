"use strict";
/* ============================================================
   Forge UI framework — navigation with per-tab stacks and view
   transitions, large-title headers, the floating tab bar, sheets,
   toasts, confirmation, theme, and shared components (rings,
   charts, calendar, segmented control, steppers).
   Screens live in screens.js; the live workout in workout.js.
   ============================================================ */

/* ---------- theme ---------- */
function applyTheme(){
  const t=(state.settings.theme||"system");
  const root=document.documentElement;
  if(t==="system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme",t);
  const dark = t==="dark" || (t==="system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach(m=>m.remove());
  const m=document.createElement("meta"); m.name="theme-color"; m.content=dark?"#000000":"#F2F2F7"; document.head.appendChild(m);
}
window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",()=>applyTheme());

/* ---------- navigation model: one stack per tab + a full-screen workout overlay ---------- */
const TAB_ORDER=["summary","history","trends","library"];
const TAB_ALIAS={home:"summary",progress:"trends",routines:"library",summary:"summary",history:"history",trends:"trends",library:"library"};
const nav={ tab:"summary", stacks:{summary:[{screen:"summary"}],history:[{screen:"history"}],trends:[{screen:"trends"}],library:[{screen:"library"}]}, overlay:null };
function stackOf(){ return nav.stacks[nav.tab]; }
function peek(){ return nav.overlay ? {screen:nav.overlay} : stackOf()[stackOf().length-1]; }
function rememberScroll(){ const top=stackOf()[stackOf().length-1]; if(top && !nav.overlay) top.scrollY=window.scrollY; }
function go(screen, params={}){
  if(screen==="workout"){ if(nav.overlay==="workout"){ render(); return; } rememberScroll(); nav.overlay="workout"; transition("modal"); return; }
  rememberScroll(); stackOf().push({screen, ...params}); transition("push");
}
function back(){
  if(nav.overlay){ nav.overlay=null; transition("dismiss"); return; }
  if(stackOf().length>1){ stackOf().pop(); transition("pop"); return; }
}
function setTab(t){
  t=TAB_ALIAS[t]||t; if(!TAB_ORDER.includes(t)) t="summary";
  const wasOverlay=!!nav.overlay; nav.overlay=null;
  if(nav.tab===t && !wasOverlay){ if(stackOf().length>1){ nav.stacks[t]=[{screen:t}]; transition("pop"); } else { window.scrollTo({top:0,behavior:"smooth"}); } return; }
  rememberScroll(); nav.tab=t; transition(wasOverlay?"dismiss":"tab");
}
function popToRoot(){ nav.stacks[nav.tab]=[{screen:nav.tab}]; transition("pop"); }
function minimizeWorkout(){ if(nav.overlay){ nav.overlay=null; transition("dismiss"); } }

let _lastKey=null;
function reduceMotion(){ return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
function transition(kind){
  const root=document.documentElement;
  if(document.startViewTransition && !reduceMotion()){
    root.dataset.nav=kind;
    const vt=document.startViewTransition(()=>render());
    vt.ready.catch(()=>{});
    vt.finished.catch(()=>{}).finally(()=>{ if(root.dataset.nav===kind) delete root.dataset.nav; });
  } else render();
}

/* ---------- render ---------- */
let _focusEx=null;
function render(){
  const v=peek();
  const app=document.getElementById("app");
  const key=nav.overlay?"overlay:"+nav.overlay:nav.tab+"/"+stackOf().map(x=>x.screen+(x.id||"")).join("/");
  const same=key===_lastKey;
  const keepY=same?window.scrollY:(v.scrollY||0);
  if(v.screen!=="workout"){ stopTimer(); releaseWake(); if(!state.active) stopRest(); }
  app.innerHTML="";
  document.body.classList.toggle("workout", v.screen==="workout");
  const screens={
    summary:renderSummary, history:renderHistory, "history-detail":renderHistoryDetail, trends:renderTrends,
    "exercise-detail":renderExerciseDetail, awards:renderAwards, library:renderLibrary, routine:renderRoutineDetail,
    "routine-edit":renderRoutineEdit, generator:renderGenerator, exercises:renderExerciseLibrary,
    settings:renderSettings, workout:renderWorkout,
  };
  (screens[v.screen]||renderSummary)(app, v);
  // the bar stays sticky on its own; the large title belongs to the scrolling content
  { const big=app.querySelector(".nav .big-title"), main=app.querySelector("main.screen"); if(big&&main) main.insertBefore(big, main.firstChild); }
  renderTabBar();
  renderNowBar();
  window.scrollTo(0, same?keepY:keepY);
  if(_focusEx!==null){
    const c=document.querySelector(`[data-ei="${_focusEx}"]`); _focusEx=null;
    if(c){ const top=c.getBoundingClientRect().top+window.scrollY-(52+parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe-top"))||0)-8;
      window.scrollTo({top:Math.max(0,top),behavior:reduceMotion()?"auto":"smooth"}); }
  }
  _lastKey=key;
  requestAnimationFrame(updateNavScroll);
}

/* ---------- large-title navigation bar ---------- */
function navBar(opts={}){
  const h=el(`<header class="nav"><div class="nav-bar"></div></header>`);
  const bar=$(".nav-bar",h);
  if(opts.back){
    const b=el(`<button class="nav-btn ${opts.backLabel?"":"icon-only"}" aria-label="${esc(opts.backAria||"Back")}">${icon(opts.backIcon||"chevronLeft")}${opts.backLabel?`<span>${esc(opts.backLabel)}</span>`:""}</button>`);
    b.onclick=opts.onBack||back; bar.appendChild(b);
  } else if(opts.leading){ bar.appendChild(opts.leading); }
  bar.appendChild(el(`<div class="nav-title">${esc(opts.title||"")}</div>`));
  const actions=el(`<div class="nav-actions"></div>`);
  (opts.actions||[]).forEach(a=>actions.appendChild(a));
  bar.appendChild(actions);
  if(opts.large!==false){
    const big=el(`<div class="big-title"></div>`);
    if(opts.eyebrow) big.appendChild(el(`<div class="eyebrow">${esc(opts.eyebrow)}</div>`));
    big.appendChild(el(`<h1>${esc(opts.title||"")}</h1>`));
    if(opts.sub) big.appendChild(el(`<div class="sub">${esc(opts.sub)}</div>`));
    h.appendChild(big);
  } else { h.classList.add("compact"); }
  return h;
}
function navButton(iconName, label, onClick, opts={}){
  const b=el(`<button class="nav-btn ${label?"":"icon-only"} ${opts.cls||""}" aria-label="${esc(opts.aria||label||iconName)}">${iconName?icon(iconName):""}${label?`<span>${esc(label)}</span>`:""}</button>`);
  b.onclick=onClick; return b;
}
function updateNavScroll(){
  const h=document.querySelector(".nav"); if(!h) return;
  const big=document.querySelector("main.screen > .big-title");
  if(!big){ h.classList.toggle("scrolled", window.scrollY > 6); return; }
  // collapse once the large title's baseline has slid under the bar
  const bar=h.getBoundingClientRect(), t=big.getBoundingClientRect();
  h.classList.toggle("scrolled", t.bottom - 14 < bar.bottom);
}
window.addEventListener("scroll", updateNavScroll, {passive:true});

/* ---------- tab bar ---------- */
function renderTabBar(){
  let bar=document.getElementById("tabbar");
  if(!bar){ bar=el(`<nav class="tabbar glass" id="tabbar" aria-label="Main"><span class="thumb"></span></nav>`); document.body.appendChild(bar); }
  const items=[["summary","rings","Summary"],["history","calendar","History"],["trends","trends","Trends"],["library","library","Library"]];
  bar.querySelectorAll(".tab").forEach(t=>t.remove());
  bar.style.setProperty("--i", String(TAB_ORDER.indexOf(nav.tab)));
  items.forEach(([t,ic,label])=>{
    const b=el(`<button class="tab ${nav.tab===t?"active":""}" ${nav.tab===t?'aria-current="page"':""} aria-label="${label}">${icon(ic)}<span>${label}</span></button>`);
    b.onclick=()=>{ if(navigator.vibrate) navigator.vibrate(8); setTab(t); };
    bar.appendChild(b);
  });
}

/* ---------- in-progress "now" bar (every tab while a workout is minimised) ---------- */
let _nowInt=null;
function nowStatus(){
  const w=state.active; if(!w) return "";
  const p=workoutSetProgress(w);
  if(restInt){ const left=Math.max(0,Math.ceil((restEnd-Date.now())/1000)); return `<b>Rest ${Math.floor(left/60)}:${String(left%60).padStart(2,"0")}</b> · ${p.done}/${p.total} sets`; }
  return `${fmtDur(Date.now()-w.start)} · ${p.done}/${p.total} sets`;
}
function renderNowBar(){
  const old=document.getElementById("nowbar"); if(old) old.remove();
  clearInterval(_nowInt); _nowInt=null;
  document.body.classList.remove("has-now");
  const w=state.active; if(!w || peek().screen==="workout") return;
  const bar=el(`<div class="nowbar glass" id="nowbar" role="button" tabindex="0" aria-label="Resume workout ${esc(w.name||"")}">
    <span class="pulse"></span><div class="body"><div class="t">${esc(w.name||"Workout")}</div><div class="d" id="nowStatus">${nowStatus()}</div></div>
    <button class="btn primary sm">${icon("play","sm")}<span>Resume</span></button></div>`);
  const resume=()=>go("workout");
  bar.onclick=resume; bar.onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); resume(); } };
  document.body.appendChild(bar);
  document.body.classList.add("has-now");
  _nowInt=setInterval(()=>{ const t=document.getElementById("nowStatus"); if(t&&state.active) t.innerHTML=nowStatus(); else { clearInterval(_nowInt); _nowInt=null; } },500);
}

/* ---------- sheets ---------- */
let _sheetOnClose=null;
function openSheet(title, build, onClose){
  closeSheet(true);
  _sheetOnClose=onClose||null;
  const bg=el(`<div class="sheet-bg"></div>`);
  const sheet=el(`<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title||"Sheet")}"></div>`);
  sheet.appendChild(el(`<div class="grab"></div>`));
  const head=el(`<div class="sheet-head"><h3>${esc(title||"")}</h3></div>`);
  const close=el(`<button class="close" aria-label="Close">${icon("xmark")}</button>`); close.onclick=()=>closeSheet(); head.appendChild(close);
  sheet.appendChild(head);
  const body=el(`<div class="sheet-body"></div>`); sheet.appendChild(body);
  bg.appendChild(sheet);
  bg.onclick=e=>{ if(e.target===bg) closeSheet(); };
  document.body.appendChild(bg);
  build(body, sheet);
  return {body, sheet};
}
function closeSheet(immediate=false){
  const b=$(".sheet-bg"); const cb=_sheetOnClose; _sheetOnClose=null;
  if(b){ if(immediate||reduceMotion()) b.remove(); else { b.classList.add("closing"); setTimeout(()=>b.remove(),230); } }
  if(cb) cb();
}
/* action sheet: rows of icon + label */
function actionSheet(title, actions, opts={}){
  openSheet(title, body=>{
    if(opts.subtitle) body.appendChild(el(`<div class="confirm-msg" style="margin-top:-4px">${esc(opts.subtitle)}</div>`));
    const list=el(`<div class="action-list"></div>`);
    actions.filter(Boolean).forEach(a=>{
      const b=el(`<button class="action ${a.destructive?"destructive":""}"><span class="ic">${icon(a.icon||"circle")}</span><span class="body"><span>${esc(a.label)}</span>${a.sub?`<span class="sub">${esc(a.sub)}</span>`:""}</span></button>`);
      b.onclick=()=>{ closeSheet(); a.run&&a.run(); };
      list.appendChild(b);
    });
    body.appendChild(list);
  });
}
/* confirmation: resolves true on the confirm button, false on Cancel / ✕ / backdrop */
function confirmAct(msg, opts={}){
  return new Promise(resolve=>{
    let settled=false;
    const finish=v=>{ if(settled) return; settled=true; closeSheet(); resolve(v); };
    openSheet(opts.title||"Are you sure?", body=>{
      body.appendChild(el(`<div class="confirm-msg">${esc(msg)}</div>`));
      const acts=el(`<div class="stack"></div>`);
      const ok=el(`<button class="btn block ${opts.danger===false?"primary":"destructive"}">${esc(opts.confirmText||"Confirm")}</button>`); ok.onclick=()=>finish(true);
      const no=el(`<button class="btn block gray">${esc(opts.cancelText||"Cancel")}</button>`); no.onclick=()=>finish(false);
      acts.appendChild(ok); acts.appendChild(no); body.appendChild(acts);
    }, ()=>finish(false));
  });
}

/* ---------- toast ---------- */
function toast(msg, ic){
  document.querySelectorAll(".toast").forEach(t=>t.remove());
  const t=el(`<div class="toast glass" role="status">${ic?icon(ic):""}<span>${esc(msg)}</span></div>`);
  document.body.appendChild(t);
  setTimeout(()=>t.classList.add("out"),1700); setTimeout(()=>t.remove(),2000);
}

/* ---------- shared components ---------- */
function segmented(options, value, onChange, opts={}){
  const seg=el(`<div class="seg ${opts.cls||""}" role="radiogroup" style="--n:${options.length}"><span class="thumb"></span></div>`);
  const paint=v=>{ seg.style.setProperty("--i", String(Math.max(0,options.findIndex(o=>o[0]===v)))); seg.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed", String(b.dataset.v===v))); };
  options.forEach(([v,label])=>{ const b=el(`<button type="button" data-v="${esc(v)}" role="radio">${esc(label)}</button>`); b.onclick=()=>{ paint(v); onChange(v); }; seg.appendChild(b); });
  paint(value); return seg;
}
function switchRow(label, on, onChange, opts={}){
  const row=el(`<div class="row ${opts.lead?"with-lead":""}"></div>`);
  if(opts.lead) row.appendChild(el(`<span class="lead ${opts.leadColor||"gray"}">${icon(opts.lead)}</span>`));
  row.appendChild(el(`<div class="body"><div class="t">${esc(label)}</div>${opts.sub?`<div class="d">${esc(opts.sub)}</div>`:""}</div>`));
  const sw=el(`<button class="switch ${on?"on":""}" role="switch" aria-checked="${on}" aria-label="${esc(label)}"><span class="knob"></span></button>`);
  sw.onclick=()=>{ on=!on; sw.classList.toggle("on",on); sw.setAttribute("aria-checked",String(on)); if(navigator.vibrate) navigator.vibrate(6); onChange(on); };
  row.appendChild(sw); return row;
}
function valueRow(label, value, onTap, opts={}){
  const row=el(`<button class="row tappable value ${opts.lead?"with-lead":""}"></button>`);
  if(opts.lead) row.appendChild(el(`<span class="lead ${opts.leadColor||"gray"}">${icon(opts.lead)}</span>`));
  row.appendChild(el(`<div class="body"><div class="t">${esc(label)}</div>${opts.sub?`<div class="d">${esc(opts.sub)}</div>`:""}</div>`));
  row.appendChild(el(`<span class="trail"><span>${esc(value||"")}</span>${onTap?icon("chevronRight","chev"):""}</span>`));
  if(onTap) row.onclick=onTap; else row.disabled=true;
  return row;
}
function linkRow(label, onTap, opts={}){
  const row=el(`<button class="row tappable ${opts.lead?"with-lead":""}"></button>`);
  if(opts.lead) row.appendChild(el(`<span class="lead ${opts.leadColor||"gray"}">${icon(opts.lead)}</span>`));
  row.appendChild(el(`<div class="body"><div class="t" ${opts.destructive?'style="color:var(--red)"':""}>${esc(label)}</div>${opts.sub?`<div class="d">${esc(opts.sub)}</div>`:""}</div>`));
  if(!opts.noChevron) row.appendChild(el(`<span class="trail">${opts.trail?`<span>${esc(opts.trail)}</span>`:""}${icon("chevronRight","chev")}</span>`));
  row.onclick=onTap; return row;
}
function sectionHeader(title, opts={}){
  const h=el(`<div class="section-h ${opts.small?"small":""}"><h2>${esc(title)}</h2></div>`);
  if(opts.more){ const b=el(`<button class="more">${esc(opts.more)}</button>`); b.onclick=opts.onMore; h.appendChild(b); }
  return h;
}
function emptyState(iconName, title, text, action){
  const e=el(`<div class="empty"><div class="art">${icon(iconName)}</div><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`);
  if(action){ const b=el(`<button class="btn tinted">${action.icon?icon(action.icon,"sm"):""}<span>${esc(action.label)}</span></button>`); b.onclick=action.run; e.appendChild(b); }
  return e;
}
function stepper(onMinus, onPlus, opts={}){
  const s=el(`<div class="stepper"><button type="button" aria-label="${esc(opts.minusLabel||"Decrease")}">${icon("minus")}</button><button type="button" aria-label="${esc(opts.plusLabel||"Increase")}">${icon("plus")}</button></div>`);
  const [m,p]=s.querySelectorAll("button"); m.onclick=onMinus; p.onclick=onPlus; return s;
}
function infoButton(name){
  const b=el(`<button class="info-btn" aria-label="How to do ${esc(name)}">${icon("info")}</button>`);
  b.onclick=e=>{ e.stopPropagation(); openExerciseInfo(name); }; return b;
}
function letterBadge(text, cls="", size=""){ return `<span class="letter-badge ${cls} ${size}">${esc(text)}</span>`; }
function programKeyOf(w){
  if(w.planKey) return w.planKey;
  const m=/^Workout ([A-F])\b/.exec(w.name||""); if(m) return m[1];
  if(/^Barbell Lower/.test(w.name||"")) return "L"; if(/^Barbell Upper/.test(w.name||"")) return "U";
  if(/^Bodyweight/.test(w.name||"")) return "BW"; if(/^Generated/.test(w.name||"")) return "✦";
  const g=/^([GHI]) —/.exec(w.name||""); if(g) return g[1];
  return (w.name||"W").trim()[0].toUpperCase();
}
function badgeColorFor(key){
  return ({A:"",B:"blue",C:"purple",D:"",E:"blue",F:"purple",L:"indigo",U:"indigo",BW:"green",G:"teal",H:"teal",I:"teal"})[key] ?? "gray";
}

/* ---------- rings ---------- */
function ringsSVG(vals, size=132){
  // vals: [{p:0..1, color}] outermost first
  const stroke=12, gap=3; let r=(size/2)-stroke/2; let out="";
  vals.forEach((v,i)=>{ const c=2*Math.PI*r; const p=Math.max(0,Math.min(1,v.p||0));
    out+=`<circle class="track" cx="${size/2}" cy="${size/2}" r="${r}" stroke="${v.color}"/>`;
    out+=`<circle class="prog" cx="${size/2}" cy="${size/2}" r="${r}" stroke="${v.color}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${c.toFixed(2)}" data-target="${(c*(1-p)).toFixed(2)}"/>`;
    r-=stroke+gap; });
  const svg=el(`<div class="rings" role="img" aria-label="${vals.map(v=>`${v.label}: ${Math.round((v.p||0)*100)}%`).join(", ")}"><svg viewBox="0 0 ${size} ${size}">${out}</svg></div>`);
  requestAnimationFrame(()=>requestAnimationFrame(()=>svg.querySelectorAll(".prog").forEach(c=>c.style.strokeDashoffset=c.dataset.target)));
  return svg;
}
function smallRing(p, color, size=46, stroke=5){
  const r=(size-stroke)/2, c=2*Math.PI*r;
  return `<svg viewBox="0 0 ${size} ${size}"><circle class="track" cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke-width="${stroke}"/><circle class="prog" cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke-width="${stroke}" stroke="${color}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c*(1-p)).toFixed(2)}"/></svg>`;
}

/* ---------- charts (Swift-Charts flavoured SVG) ---------- */
function barChartSVG(pts, opts={}){
  const W=opts.width||480, H=opts.height||160, padB=opts.labels===false?8:26, padT=22, gap=opts.gap??8;
  const maxY=Math.max(1,...pts.map(p=>p.y));
  const bw=(W-(pts.length+1)*gap)/Math.max(1,pts.length);
  let s="";
  [1,.5].forEach(f=>{ const y=padT+(1-f)*(H-padT-padB); s+=`<line class="chart-grid" x1="0" x2="${W}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>`; });
  pts.forEach((p,i)=>{ const x=gap+i*(bw+gap); const h=(p.y/maxY)*(H-padT-padB); const y=H-padB-h;
    const color=p.color||opts.color||"var(--tint)";
    s+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h,3).toFixed(1)}" rx="${Math.min(6,bw/2).toFixed(1)}" fill="${color}" opacity="${p.dim?".35":"1"}"/>`;
    if(opts.values!==false && p.y) s+=`<text class="chart-value" x="${(x+bw/2).toFixed(1)}" y="${(y-6).toFixed(1)}" text-anchor="middle">${esc(p.text??fmtNum(p.y))}</text>`;
    if(opts.labels!==false && p.label) s+=`<text class="chart-label" x="${(x+bw/2).toFixed(1)}" y="${H-8}" text-anchor="middle">${esc(p.label)}</text>`;
  });
  return el(`<svg class="chart" viewBox="0 0 ${W} ${H}" style="height:${H}px" role="img" aria-label="${esc(opts.aria||"Bar chart")}">${s}</svg>`);
}
function smoothPath(pts){
  if(pts.length<2) return "";
  let d=`M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for(let i=0;i<pts.length-1;i++){
    const p0=pts[i-1]||pts[i], p1=pts[i], p2=pts[i+1], p3=pts[i+2]||p2;
    const c1x=p1[0]+(p2[0]-p0[0])/6, c1y=p1[1]+(p2[1]-p0[1])/6, c2x=p2[0]-(p3[0]-p1[0])/6, c2y=p2[1]-(p3[1]-p1[1])/6;
    d+=` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}
let _chartSeq=0;
function lineChartSVG(pts, opts={}){
  const W=opts.width||480, H=opts.height||170, padL=opts.axis===false?6:44, padR=28, padT=18, padB=opts.labels===false?8:28;
  if(pts.length===1) pts=[{x:pts[0].x-86400000,y:pts[0].y},pts[0]];
  const xs=pts.map(p=>p.x), ys=pts.map(p=>p.y);
  const minX=Math.min(...xs), maxX=Math.max(...xs); let minY=Math.min(...ys), maxY=Math.max(...ys);
  if(opts.zero!==false) minY=0; if(maxY===minY) maxY=minY+1;
  const pad=(maxY-minY)*.08; if(opts.zero===false) minY-=pad; maxY+=pad;
  const sx=x=>padL+((x-minX)/((maxX-minX)||1))*(W-padL-padR), sy=y=>H-padB-((y-minY)/((maxY-minY)||1))*(H-padT-padB);
  const P=pts.map(p=>[sx(p.x),sy(p.y)]);
  const d=smoothPath(P), area=d+` L${P[P.length-1][0].toFixed(1)} ${H-padB} L${P[0][0].toFixed(1)} ${H-padB} Z`;
  const color=opts.color||"var(--tint)", id="lg"+(++_chartSeq);
  let grid="";
  if(opts.axis!==false) [1,.5,0].forEach(f=>{ const val=minY+(maxY-minY)*f, gy=sy(val); grid+=`<line class="chart-grid" x1="${padL}" x2="${W-padR}" y1="${gy.toFixed(1)}" y2="${gy.toFixed(1)}"/><text class="chart-label" x="${padL-8}" y="${(gy+4).toFixed(1)}" text-anchor="end">${esc(fmtNum(Math.round(val*10)/10).toLocaleString())}</text>`; });
  const last=P[P.length-1];
  const fmtD=ts=>new Date(ts).toLocaleDateString(undefined,{month:"short",day:"numeric"});
  return el(`<svg class="chart" viewBox="0 0 ${W} ${H}" style="height:${H}px" role="img" aria-label="${esc(opts.aria||"Line chart")}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".32"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    ${grid}<path d="${area}" fill="url(#${id})"/><path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="5.5" fill="${color}" stroke="var(--bg-elev)" stroke-width="2.5"/>
    ${opts.labels===false?"":`<text class="chart-label" x="${padL}" y="${H-8}">${esc(fmtD(minX))}</text><text class="chart-label" x="${W-padR}" y="${H-8}" text-anchor="end">${esc(fmtD(maxX))}</text>`}
  </svg>`);
}
function sparklineSVG(values, color="var(--tint)"){
  const W=64,H=28; if(!values.length) return "";
  const max=Math.max(...values,1), min=Math.min(...values,0);
  const P=values.map((v,i)=>[4+i*((W-8)/Math.max(1,values.length-1)), H-4-((v-min)/((max-min)||1))*(H-8)]);
  const last=P[P.length-1];
  return `<svg class="sparkline" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${smoothPath(P)}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.6" fill="${color}"/></svg>`;
}

/* ---------- calendar ---------- */
function calendarView(year, month, marks, selectedISO, onPick, onMonth){
  const first=new Date(year,month,1), startDow=(first.getDay()+6)%7, days=new Date(year,month+1,0).getDate();
  const todayIso=todayISO();
  const c=el(`<div class="cal"></div>`);
  const head=el(`<div class="cal-head"><h3>${esc(first.toLocaleDateString(undefined,{month:"long",year:"numeric"}))}</h3><div style="display:flex;gap:8px"></div></div>`);
  const prev=el(`<button class="nav-btn icon-only" aria-label="Previous month">${icon("chevronLeft")}</button>`), next=el(`<button class="nav-btn icon-only" aria-label="Next month">${icon("chevronRight")}</button>`);
  prev.onclick=()=>onMonth(-1); next.onclick=()=>onMonth(1); head.lastElementChild.append(prev,next); c.appendChild(head);
  c.appendChild(el(`<div class="wd">${["M","T","W","T","F","S","S"].map(d=>`<span>${d}</span>`).join("")}</div>`));
  const grid=el(`<div class="days"></div>`);
  for(let i=0;i<startDow;i++) grid.appendChild(el(`<span class="d pad"></span>`));
  for(let d=1;d<=days;d++){
    const iso=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const has=marks.has(iso), future=iso>todayIso;
    const b=el(`<button class="d ${has?"has":""} ${iso===todayIso?"today":""} ${iso===selectedISO?"sel":""} ${future?"future":""}" aria-label="${iso}${has?", workout logged":""}">${d}</button>`);
    b.onclick=()=>onPick(iso); grid.appendChild(b);
  }
  c.appendChild(grid); return c;
}

/* ---------- keyboard awareness (hide floating bars while typing) ---------- */
if(window.visualViewport){
  const base=()=>window.innerHeight;
  window.visualViewport.addEventListener("resize",()=>{ document.body.classList.toggle("kb", base()-window.visualViewport.height>140); });
}

/* ---------- workout timers (elapsed + rest) shared with the now-bar ---------- */
let timerInt=null;
function startTimer(){
  stopTimer();
  const tick=()=>{ const e=document.getElementById("wkTimer"); if(e&&state.active) e.textContent=fmtDur(Date.now()-state.active.start); };
  tick(); timerInt=setInterval(tick,1000);
}
function stopTimer(){ if(timerInt){ clearInterval(timerInt); timerInt=null; } }
let restInt=null, restEnd=0, restTotal=0;
function startRest(sec){
  restEnd=Date.now()+sec*1000; restTotal=sec;
  clearInterval(restInt);
  const upd=()=>{ const left=Math.ceil((restEnd-Date.now())/1000);
    if(left<=0){ stopRest(); beep(2); if(navigator.vibrate) navigator.vibrate([120,60,120]); if(document.hidden) notifyRestOver(); return; }
    paintWorkoutBar(); };
  restInt=setInterval(upd,250); upd();
}
function stopRest(){ clearInterval(restInt); restInt=null; restTotal=0; paintWorkoutBar(); }
