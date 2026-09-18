"use strict";
/* ============================================================
   Forge screens — Summary, History, Trends, Library, Settings,
   plus the awards engine, exercise sheets, onboarding and boot.
   ============================================================ */

/* ---------- small helpers ---------- */
function isoOf(ts){ const d=new Date(ts); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function workoutPRs(w){ return w.exercises.reduce((n,e)=>n+e.sets.filter(s=>s.pr).length,0); }
function minutes(ms){ return Math.round(ms/60000); }
function workoutRow(w){
  const key=programKeyOf(w), prs=workoutPRs(w);
  const row=el(`<button class="row tappable with-lead">${letterBadge(key,badgeColorFor(key))}<div class="body"><div class="t">${esc(prettyName(w.name))}</div><div class="d">${esc(relTime(w.end))} · ${minutes(w.duration)} min · ${workoutSets(w)} sets${w.deload?" · Deload":""}</div></div><span class="trail"><span style="text-align:right"><span class="num" style="display:block;font-size:16px;color:var(--label)">${esc(fmtNum(workoutVolume(w)).toLocaleString())}</span>${prs?`<span class="pr-badge" style="margin-top:2px">${icon("trophy")}${prs}</span>`:`<span class="t-caption2 muted">${esc(U())}</span>`}</span>${icon("chevronRight","chev")}</span></button>`);
  row.onclick=()=>go("history-detail",{id:w.id}); return row;
}
function profileButton(){
  const n=syncName();
  const b=el(`<button class="nav-btn icon-only" aria-label="Settings">${n?`<span class="avatar" style="width:30px;height:30px;font-size:13px">${esc(n[0].toUpperCase())}</span>`:icon("gear")}</button>`);
  b.onclick=()=>go("settings"); return b;
}
function equipFilterChips(initial,onPick,opts={}){
  const row=el(`<div class="chip-scroll" ${opts.inSheet?'style="padding-left:0;padding-right:0"':""}></div>`);
  [["all","All"],["dumbbell","Dumbbell"],["barbell","Barbell"],["bodyweight","Bodyweight"],["pullup","Pull-up bar"],["gym","Gym"]].forEach(([v,l])=>{
    const b=el(`<button class="chip chip-btn lg ${initial===v?"on":""}" aria-pressed="${initial===v}">${l}</button>`);
    b.onclick=()=>{ row.querySelectorAll(".chip").forEach(x=>{ x.classList.remove("on"); x.setAttribute("aria-pressed","false"); }); b.classList.add("on"); b.setAttribute("aria-pressed","true"); onPick(v); };
    row.appendChild(b);
  });
  return row;
}
function openWorkoutSetup(){
  openSheet("Workout Setup",body=>{
    body.appendChild(el(`<div class="confirm-msg" style="margin-top:-4px">Which prescription and implements Forge uses when it resolves a routine's movements.</div>`));
    body.appendChild(sectionHeader("Prescription",{small:true}));
    body.appendChild(segmented([["his","His · Mass"],["hers","Hers · Tone"]], state.settings.planVariant||"his", v=>{ state.settings.planVariant=v; save("settings"); },{cls:"lg"}));
    body.appendChild(sectionHeader("Equipment",{small:true}));
    body.appendChild(segmented([["db","Dumbbell"],["combo","Combo"],["bb","Barbell"]], equipMode(), v=>{ state.settings.equipMode=v; save("settings"); },{cls:"lg"}));
    body.appendChild(el(`<div class="group-note" style="margin:12px 4px 0">Combo upgrades the big lifts to the bar and keeps accessories on dumbbells.</div>`));
  }, ()=>render());
}
function setupChip(){
  const b=el(`<button class="chip chip-btn lg" aria-label="Change prescription and equipment">${icon("equipment","sm")}<span>${esc(variantLabel().split(" · ")[0])} · ${esc(equipModeLabel())}</span>${icon("chevronDown","xs")}</button>`);
  b.onclick=openWorkoutSetup; return b;
}

/* ============================================================
   AWARDS — computed from history, nothing new is stored
   ============================================================ */
const AWARD_DEFS=[
  {id:"first",   title:"First Rep",       desc:"Log your first workout.",                     glyph:"bolt",     colors:["#FF9A4D","#F0401F"], kind:"count", n:1},
  {id:"w10",     title:"10 Workouts",     desc:"Complete 10 workouts.",                      glyph:"dumbbell", colors:["#5AC8FA","#0A5CFF"], kind:"count", n:10},
  {id:"w25",     title:"25 Workouts",     desc:"Complete 25 workouts.",                      glyph:"dumbbell", colors:["#B565F0","#6236DA"], kind:"count", n:25},
  {id:"w50",     title:"50 Workouts",     desc:"Complete 50 workouts.",                      glyph:"dumbbell", colors:["#FFD60A","#FF9500"], kind:"count", n:50},
  {id:"w100",    title:"100 Workouts",    desc:"Complete 100 workouts.",                     glyph:"medal",    colors:["#FF375F","#B4144F"], kind:"count", n:100},
  {id:"streak4", title:"4-Week Streak",   desc:"Train every week for 4 weeks in a row.",     glyph:"flame",    colors:["#FF9F0A","#FF3B30"], kind:"streak", n:4},
  {id:"streak8", title:"8-Week Streak",   desc:"Train every week for 8 weeks in a row.",     glyph:"flame",    colors:["#FF6B2C","#C7001F"], kind:"streak", n:8},
  {id:"streak12",title:"12-Week Streak",  desc:"Train every week for 12 weeks in a row.",    glyph:"flame",    colors:["#FFD60A","#FF6B2C"], kind:"streak", n:12},
  {id:"streak26",title:"Half-Year Streak",desc:"Train every week for 26 weeks in a row.",    glyph:"star",     colors:["#BF5AF2","#5E5CE6"], kind:"streak", n:26},
  {id:"perfect", title:"Perfect Week",    desc:"Complete every planned session in one week.",glyph:"seal",     colors:["#30D158","#0A7A3F"], kind:"perfect"},
  {id:"pr10",    title:"Record Setter",   desc:"Set 10 personal records.",                   glyph:"trophy",   colors:["#FFD60A","#F0A000"], kind:"prs", n:10},
  {id:"pr50",    title:"PR Machine",      desc:"Set 50 personal records.",                   glyph:"trophy",   colors:["#FFB84D","#E0245E"], kind:"prs", n:50},
  {id:"heavy",   title:"Heavy Day",       desc:"Move 10,000 lb of volume in one session.",   glyph:"barbell",  colors:["#8E8E93","#3A3A3C"], kind:"volume", n:10000},
  {id:"iron",    title:"Iron Ton",        desc:"Move 20,000 lb of volume in one session.",   glyph:"barbell",  colors:["#6E7683","#1C1C1E"], kind:"volume", n:20000},
  {id:"early",   title:"Early Bird",      desc:"Finish a workout before 7 am.",              glyph:"sun",      colors:["#FFD60A","#FF9F0A"], kind:"hour", test:h=>h<7},
  {id:"night",   title:"Night Owl",       desc:"Finish a workout after 9 pm.",               glyph:"moon",     colors:["#5E5CE6","#1D1B6B"], kind:"hour", test:h=>h>=21},
  {id:"deload",  title:"Smart Recovery",  desc:"Complete a deload session.",                 glyph:"leaf",     colors:["#63E6E2","#30B0C7"], kind:"flag", test:w=>!!w.deload},
  {id:"anywhere",title:"Anywhere",        desc:"Complete a bodyweight-only session.",        glyph:"figure",   colors:["#4CD964","#1E9A4F"], kind:"flag", test:w=>w.exercises.length>0&&w.exercises.every(e=>{ const l=exerciseByRef(e); return l&&(l.equipment==="bodyweight"||l.equipment==="pullup"); })},
  {id:"bar",     title:"Under the Bar",   desc:"Complete a workout with a barbell lift.",    glyph:"barbell",  colors:["#FF7A3D","#C7420F"], kind:"flag", test:w=>w.exercises.some(e=>isBarbell(e))},
  {id:"explorer",title:"Explorer",        desc:"Log 25 different exercises.",                glyph:"sparkles", colors:["#38B6FF","#0A5CFF"], kind:"distinct", n:25},
];
function computeAwards(){
  const ws=[...state.workouts].sort((a,b)=>a.end-b.end), wk=7*86400000, kgFactor=U()==="kg"?1/2.2046:1;
  const streakAt=[]; { let streak=0,last=null; ws.forEach(w=>{ const k=weekStartTs(w.end); if(last===null||k>last+wk) streak=1; else if(k===last+wk) streak++; last=k; streakAt.push(streak); }); }
  const prsAt=[]; { let n=0; ws.forEach(w=>{ n+=workoutPRs(w); prsAt.push(n); }); }
  const distinctAt=[]; { const seen=new Set(); ws.forEach(w=>{ w.exercises.forEach(e=>seen.add(exerciseKeyOf(e))); distinctAt.push(seen.size); }); }
  const perfectAt=(()=>{ const perWeek={}; for(let i=0;i<ws.length;i++){ const k=weekStartTs(ws[i].end); perWeek[k]=(perWeek[k]||0)+1; const need=Object.keys(planFor(k)).length||3; if(perWeek[k]===need) return i; } return -1; })();
  const hit=i=>i>=0&&ws[i]?{earned:true,date:ws[i].end,workoutId:ws[i].id}:{earned:false};
  return AWARD_DEFS.map(d=>{
    let r={earned:false}, progress=null;
    if(d.kind==="count"){ r=hit(d.n-1); progress=[ws.length,d.n]; }
    else if(d.kind==="streak"){ r=hit(streakAt.findIndex(s=>s>=d.n)); progress=[computeStreak(),d.n]; }
    else if(d.kind==="perfect"){ r=hit(perfectAt); }
    else if(d.kind==="prs"){ r=hit(prsAt.findIndex(n=>n>=d.n)); progress=[prsAt.length?prsAt[prsAt.length-1]:0,d.n]; }
    else if(d.kind==="volume"){ const t=d.n*kgFactor; r=hit(ws.findIndex(w=>workoutVolume(w)>=t)); const best=ws.reduce((m,w)=>Math.max(m,workoutVolume(w)),0); progress=[Math.round(best),Math.round(t)]; }
    else if(d.kind==="hour"){ r=hit(ws.findIndex(w=>d.test(new Date(w.end).getHours()))); }
    else if(d.kind==="flag"){ r=hit(ws.findIndex(w=>d.test(w))); }
    else if(d.kind==="distinct"){ r=hit(distinctAt.findIndex(n=>n>=d.n)); progress=[distinctAt.length?distinctAt[distinctAt.length-1]:0,d.n]; }
    return {...d,...r,progress};
  });
}
function medalsRow(list){
  const row=el(`<div class="medals"></div>`);
  list.forEach(a=>{ const m=el(`<button class="medal ${a.earned?"":"locked"}" aria-label="${esc(a.title)}${a.earned?", earned "+fmtDate(a.date):", locked"}"><span>${medallion(a.glyph,a.colors[0],a.colors[1],a.earned)}</span><div class="t">${esc(a.title)}</div><div class="d">${a.earned?esc(fmtDate(a.date)):(a.progress?`${a.progress[0]}/${a.progress[1]}`:"Locked")}</div></button>`); m.onclick=()=>awardSheet(a); row.appendChild(m); });
  return row;
}
function awardSheet(a){
  openSheet(a.title,body=>{
    body.appendChild(el(`<div class="sheet-hero"><div class="${a.earned?"pop":""}" style="display:inline-block;${a.earned?"":"filter:grayscale(1);opacity:.4"}">${medallion(a.glyph,a.colors[0],a.colors[1],a.earned,120)}</div><h2 style="margin-top:8px">${esc(a.title)}</h2><p>${esc(a.desc)}</p></div>`));
    if(a.earned){ const w=state.workouts.find(x=>x.id===a.workoutId);
      body.appendChild(el(`<div class="card"><div class="kv"><span>Earned</span><b>${esc(fmtDate(a.date))}</b></div>${w?`<div class="kv"><span>Workout</span><b>${esc(prettyName(w.name))}</b></div>`:""}</div>`)); }
    else if(a.progress){ const p=Math.min(1,a.progress[0]/a.progress[1]);
      body.appendChild(el(`<div class="card"><div class="bar-row" style="margin:0"><div class="top"><span>Progress</span><span class="n"><b>${esc(String(a.progress[0]))}</b> / ${esc(String(a.progress[1]))}</span></div><div class="track"><div class="fill" style="width:${(p*100).toFixed(0)}%"></div></div></div></div>`)); }
    else body.appendChild(el(`<div class="callout"><div class="body">Keep training — this one unlocks on its own.</div></div>`));
  });
}
function renderAwards(app){
  app.appendChild(navBar({back:true,title:"Awards",sub:"Earned by training, not by tapping."}));
  const main=el(`<main class="screen"></main>`);
  const all=computeAwards(), earned=all.filter(a=>a.earned).sort((a,b)=>b.date-a.date), locked=all.filter(a=>!a.earned);
  if(earned.length){ main.appendChild(sectionHeader(`Earned · ${earned.length}`)); const g=el(`<div class="medal-grid"></div>`); earned.forEach(a=>{ const m=el(`<button class="medal"><span>${medallion(a.glyph,a.colors[0],a.colors[1],true)}</span><div class="t">${esc(a.title)}</div><div class="d">${esc(fmtDate(a.date))}</div></button>`); m.onclick=()=>awardSheet(a); g.appendChild(m); }); main.appendChild(g); }
  main.appendChild(sectionHeader(`Locked · ${locked.length}`));
  const g=el(`<div class="medal-grid"></div>`); locked.forEach(a=>{ const m=el(`<button class="medal locked"><span>${medallion(a.glyph,a.colors[0],a.colors[1],false)}</span><div class="t">${esc(a.title)}</div><div class="d">${a.progress?`${a.progress[0]}/${a.progress[1]}`:esc(a.desc)}</div></button>`); m.onclick=()=>awardSheet(a); g.appendChild(m); }); main.appendChild(g);
  app.appendChild(main);
}

/* ============================================================
   SUMMARY
   ============================================================ */
function weekStats(){
  const now=Date.now(), ws=weekStartTs(now), wk=7*86400000, variant=state.settings.planVariant||"his";
  const inRange=(w,a)=>w.end>=a&&w.end<a+wk;
  const sessions=state.workouts.filter(w=>inRange(w,ws));
  const planned=Object.keys(planFor(now)).length||3;
  const setsDone=sessions.reduce((n,w)=>n+workoutSets(w),0);
  const plan=plannedWeeklySets(variant), setsPlan=Object.values(plan).reduce((a,b)=>a+b,0)||1;
  const vol=sessions.reduce((n,w)=>n+workoutVolume(w),0);
  const prev=[]; for(let i=1;i<=4;i++){ const a=ws-i*wk; const v=state.workouts.filter(w=>inRange(w,a)).reduce((n,w)=>n+workoutVolume(w),0); if(v>0) prev.push(v); }
  const volTarget=prev.length?prev.reduce((a,b)=>a+b,0)/prev.length:0;
  return {sessions:sessions.length,planned,setsDone,setsPlan,vol,volTarget,doneDays:new Set(sessions.map(w=>isoOf(w.end)))};
}
function weekRingsCard(){
  const s=weekStats();
  const pa=s.planned?s.sessions/s.planned:0, pb=s.setsPlan?s.setsDone/s.setsPlan:0, pc=s.volTarget?s.vol/s.volTarget:(s.vol?1:0);
  const card=el(`<section class="card tappable" aria-label="This week"><div class="card-h"><h3>This Week</h3><span class="more">Trends ${icon("chevronRight","xs")}</span></div><div class="rings-card"></div></section>`);
  const wrap=$(".rings-card",card);
  wrap.appendChild(ringsSVG([{p:pa,color:"var(--ring-a)",label:"Sessions"},{p:pb,color:"var(--ring-b)",label:"Sets"},{p:pc,color:"var(--ring-c)",label:"Volume"}]));
  wrap.appendChild(el(`<div class="ring-legend">
    <div class="a"><div class="l">Sessions</div><div class="v">${s.sessions}<small>/${s.planned}</small></div></div>
    <div class="b"><div class="l">Sets</div><div class="v">${s.setsDone}<small>/${s.setsPlan}</small></div></div>
    <div class="c"><div class="l">Volume</div><div class="v">${esc(fmtNum(Math.round(s.vol)).toLocaleString())}<small>${s.volTarget?"/"+esc(fmtNum(Math.round(s.volTarget)).toLocaleString()):""} ${esc(U())}</small></div></div>
  </div>`));
  card.onclick=()=>setTab("trends");
  return card;
}
function todayCard(){
  const {dow,today,p,due}=planState(), variant=state.settings.planVariant||"his", cw=cycleWeekOf(Date.now()), wp=planFor(Date.now());
  const stats=weekStats();
  const card=el(`<section class="card hero-today"></section>`);
  const showMove=p.deferred&&p.deferred.dueISO>=today, moveTo=showMove?dowOfISO(p.deferred.dueISO):null, moveFrom=showMove?originDow(p.deferred.key):null;
  const strip=el(`<div class="week-strip" aria-label="This week's plan"></div>`);
  [1,2,3,4,5,6,0].forEach((d,i)=>{
    const iso=addDaysISO(weekISO(),i), k=wp[d], done=stats.doneDays.has(iso);
    let label=k||"·", cls=k?"work":"rest";
    if(d===moveTo){ label=p.deferred.key; cls="work deferred"; } else if(d===moveFrom){ cls=(k?"work":"rest")+" moved"; }
    strip.appendChild(el(`<div class="day ${cls} ${done?"done":""} ${d===dow?"today":""}"><span class="dl">${DAY_INIT[d]}</span><span class="db">${done?icon("check"):esc(label)}</span></div>`));
  });
  card.appendChild(strip);
  const doneToday=due&&state.workouts.find(w=>isoOf(w.end)===today&&(w.planKey===due.key||programKeyOf(w)===due.key));
  if(doneToday){
    const prog=ALL_PROGRAM.find(x=>x.key===due.key), prs=workoutPRs(doneToday);
    card.appendChild(el(`<div class="top"><span class="letter-badge green">${icon("check","md")}</span><div style="min-width:0"><div class="eyebrow">Today · ${esc(DAY_NAME[dow])} · Week ${cw}</div><div class="title">Workout ${esc(due.key)} done</div></div></div>`));
    card.appendChild(el(`<div class="meta">${esc(prog?prog.title:prettyName(doneToday.name))} · ${minutes(doneToday.duration)} min · ${workoutSets(doneToday)} sets · ${esc(fmtNum(workoutVolume(doneToday)).toLocaleString())} ${esc(U())}${prs?` · ${prs} record${prs!==1?"s":""}`:""}</div>`));
    const cta=el(`<div class="cta"></div>`);
    const view=el(`<button class="btn tinted lg" style="flex:1">${icon("doc","sm")}<span>View summary</span></button>`); view.onclick=()=>{ setTab("history"); go("history-detail",{id:doneToday.id}); };
    const again=el(`<button class="btn circle" aria-label="Start another workout">${icon("plus")}</button>`); again.onclick=()=>setTab("library");
    cta.append(view,again); card.appendChild(cta);
    let nx=nextPlanDay(Date.now()); if(nx) card.appendChild(el(`<div class="meta" style="margin-top:12px">Next up · <b style="color:var(--label)">${esc(DAY_NAME[nx.dow])}</b> · ${esc(programTitle(nx.key))}</div>`));
  } else if(due){
    const r=planRoutine(due.key,variant);
    const dayLine=due.overdue?`Overdue · ${DAY_NAME[dowOfISO(p.deferred.dueISO)]}`:`Today · ${DAY_NAME[dow]}`;
    const prog=ALL_PROGRAM.find(x=>x.key===due.key);
    card.appendChild(el(`<div class="top">${letterBadge(due.key,badgeColorFor(due.key))}<div style="min-width:0"><div class="eyebrow">${esc(dayLine)} · Week ${cw}${due.deferred?" · Deferred":""}</div><div class="title">${esc(prog?prog.title:"Workout "+due.key)}</div></div></div>`));
    if(r){
      card.appendChild(el(`<div class="meta">${esc(variantLabel())} · ${esc(equipModeLabel())} · ${r.exercises.length} exercises · about ${routineMinutes(r)} min</div>`));
      card.appendChild(el(`<div class="chips" style="margin-top:10px">${routineMuscles(r).map(m=>`<span class="chip">${esc(m)}</span>`).join("")}</div>`));
      const cta=el(`<div class="cta"></div>`);
      const start=el(`<button class="btn primary lg">${icon("play","sm")}<span>Start Workout ${esc(due.key)}</span></button>`); start.onclick=()=>startFromRoutine(r.id,due.key);
      const defer=el(`<button class="btn circle" aria-label="${due.count>=1?"Skip this workout":"Defer until tomorrow"}">${icon(due.count>=1?"skip":"defer")}</button>`);
      defer.onclick=async()=>{ const msg=due.count>=1?`Workout ${due.key} will be skipped and you'll move to the next routine. That's one more bodyweight set owed.`:`Workout ${due.key} moves to tomorrow. You'll owe one set of bodyweight exercises, your choice.`;
        if(await confirmAct(msg,{title:due.count>=1?"Skip this workout?":"Defer to tomorrow?",confirmText:due.count>=1?"Skip it":"Defer"})) deferDue(); };
      cta.append(start,defer); card.appendChild(cta);
      const setup=el(`<div class="setup"><span class="t-footnote muted">Set up for</span></div>`); setup.appendChild(setupChip()); card.appendChild(setup);
    } else {
      const fix=el(`<button class="btn tinted block" style="margin-top:14px">${icon("sync","sm")}<span>Restore preset routines</span></button>`);
      fix.onclick=()=>{ restorePresets(); render(); toast("Preset routines restored","check"); }; card.appendChild(fix);
    }
  } else {
    let nx; if(p.deferred&&p.deferred.dueISO>today) nx={dow:dowOfISO(p.deferred.dueISO),key:p.deferred.key,deferred:true}; else nx=nextPlanDay(Date.now());
    card.appendChild(el(`<div class="top"><span class="rest-art">${icon("moon")}</span><div style="min-width:0"><div class="eyebrow">Today · ${esc(DAY_NAME[dow])} · Week ${cw}</div><div class="title">Rest day</div></div></div>`));
    card.appendChild(el(`<div class="meta">${nx?`Next up · <b style="color:var(--label)">${esc(DAY_NAME[nx.dow])}</b> · ${esc(programTitle(nx.key))}${nx.deferred?" (deferred)":""}`:"Recover well."}</div>`));
    const setup=el(`<div class="setup"><span class="t-footnote muted">Set up for</span></div>`); setup.appendChild(setupChip()); card.appendChild(setup);
  }
  return card;
}
function planBanners(main){
  const p=state.plan;
  if(deloadActive()) main.appendChild(el(`<div class="callout green">${icon("leaf")}<div class="body"><b>Deload week.</b> Working sets are reduced by about a third. Ends Monday, or switch it off in Settings.</div></div>`));
  if(p.penaltySets>0){
    const c=el(`<div class="callout orange">${icon("dumbbell")}<div class="body"><b>${p.penaltySets} bodyweight set${p.penaltySets!==1?"s":""} owed</b> from deferrals — any movement, any time.<div class="actions"></div></div></div>`);
    const b=el(`<button class="btn xs white">${icon("check","xs")}<span>Knock one out</span></button>`); b.onclick=knockPenalty; $(".actions",c).appendChild(b); main.appendChild(c);
  }
}
function quickTiles(){
  const row=el(`<div class="tile-row" role="group" aria-label="Start something"></div>`);
  [["ember","sparkles","Generate","Built for today",()=>go("generator")],["slate","plus","Empty","Log as you go",startEmpty],["forest","figure","Bodyweight","No equipment",startBodyweight],["ocean","library","Routines","Your library",()=>setTab("library")]]
    .forEach(([c,ic,t,d,fn])=>{ const b=el(`<button class="tile ${c}">${icon(ic)}<span><span class="t" style="display:block">${t}</span><span class="d" style="display:block">${d}</span></span></button>`); b.onclick=fn; row.appendChild(b); });
  return row;
}
function renderSummary(app){
  const now=new Date();
  app.appendChild(navBar({title:"Summary",eyebrow:now.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"}),actions:[profileButton()]}));
  const main=el(`<main class="screen"></main>`);
  main.appendChild(weekRingsCard());
  main.appendChild(sectionHeader("Today"));
  main.appendChild(todayCard());
  planBanners(main);
  main.appendChild(sectionHeader("Start Something"));
  main.appendChild(quickTiles());
  const earned=computeAwards().filter(a=>a.earned).sort((a,b)=>b.date-a.date);
  if(earned.length){ main.appendChild(sectionHeader("Awards",{more:"See All",onMore:()=>go("awards")})); main.appendChild(medalsRow(earned.slice(0,6))); }
  if(state.workouts.length){ main.appendChild(sectionHeader("Recent",{more:"Show All",onMore:()=>setTab("history")})); const g=el(`<div class="group"></div>`); state.workouts.slice(0,3).forEach(w=>g.appendChild(workoutRow(w))); main.appendChild(g); }
  app.appendChild(main);
  maybeOnboard();
}

/* ============================================================
   HISTORY
   ============================================================ */
const _hist={y:null,m:null,sel:null};
function renderHistory(app){
  app.appendChild(navBar({title:"History",sub:state.workouts.length?`${state.workouts.length} workout${state.workouts.length!==1?"s":""} logged`:""}));
  const main=el(`<main class="screen"></main>`);
  if(!state.workouts.length){ main.appendChild(emptyState("calendar","No workouts yet","Finished sessions appear here, on the calendar and in the list.",{label:"Go to Summary",icon:"rings",run:()=>setTab("summary")})); app.appendChild(main); return; }
  const now=new Date(); if(_hist.y===null){ _hist.y=now.getFullYear(); _hist.m=now.getMonth(); }
  const marks=new Set(state.workouts.map(w=>isoOf(w.end)));
  const cal=el(`<div class="card" style="padding:6px 6px 4px"></div>`);
  cal.appendChild(calendarView(_hist.y,_hist.m,marks,_hist.sel,iso=>{ _hist.sel=_hist.sel===iso?null:iso; render(); },dir=>{ const d=new Date(_hist.y,_hist.m+dir,1); _hist.y=d.getFullYear(); _hist.m=d.getMonth(); render(); }));
  main.appendChild(cal);
  let list=state.workouts;
  if(_hist.sel){
    list=list.filter(w=>isoOf(w.end)===_hist.sel);
    main.appendChild(sectionHeader(new Date(isoToTs(_hist.sel)).toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"}),{more:"Show All",onMore:()=>{ _hist.sel=null; render(); }}));
    if(!list.length) main.appendChild(el(`<div class="group"><div class="row"><div class="body"><div class="d">No workout on this day.</div></div></div></div>`));
    else { const g=el(`<div class="group"></div>`); list.forEach(w=>g.appendChild(workoutRow(w))); main.appendChild(g); }
  } else {
    let cur="", g=null;
    list.forEach(w=>{ const m=new Date(w.end).toLocaleDateString(undefined,{month:"long",year:"numeric"});
      if(m!==cur){ cur=m; main.appendChild(sectionHeader(m)); g=el(`<div class="group"></div>`); main.appendChild(g); }
      g.appendChild(workoutRow(w)); });
  }
  app.appendChild(main);
}
function renderHistoryDetail(app,v){
  const w=state.workouts.find(x=>x.id===v.id); if(!w){ back(); return; }
  const more=navButton("ellipsis",null,()=>actionSheet("Workout",[
    {icon:"repeat",label:"Repeat this workout",run:()=>repeatWorkout(w)},
    {icon:"pencil",label:"Edit rating & note",run:()=>editFinishedSheet(w)},
    {icon:"trash",label:"Delete workout",destructive:true,run:()=>deleteWorkout(w)},
  ]),{aria:"Workout options"});
  app.appendChild(navBar({back:true,title:prettyName(w.name),eyebrow:`${fmtDay(w.end)} · ${new Date(w.end).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"})}`,actions:[more]}));
  const main=el(`<main class="screen"></main>`);
  const prs=workoutPRs(w);
  const chips=el(`<div class="chips" style="margin:0 20px 14px"></div>`);
  chips.appendChild(el(`<span class="chip tint">${letterBadge(programKeyOf(w),"","sm").replace('letter-badge','letter-badge')}</span>`)); chips.innerHTML="";
  if(w.difficulty) chips.appendChild(el(`<span class="chip" style="color:${DIFFICULTY[w.difficulty]?.color||"inherit"}">${icon("gauge","xs")}<span>${esc(difficultyText(w.difficulty))}</span></span>`));
  if(w.deload) chips.appendChild(el(`<span class="chip green">${icon("leaf","xs")}<span>Deload</span></span>`));
  if(prs) chips.appendChild(el(`<span class="chip yellow">${icon("trophy","xs")}<span>${prs} record${prs!==1?"s":""}</span></span>`));
  if(chips.children.length) main.appendChild(chips);
  main.appendChild(el(`<div class="metrics"><div class="metric"><div class="v">${esc(fmtDur(w.duration))}</div><div class="l">Duration</div></div><div class="metric"><div class="v">${workoutSets(w)}</div><div class="l">Sets</div></div><div class="metric tint"><div class="v">${esc(fmtNum(workoutVolume(w)).toLocaleString())}</div><div class="l">${esc(U())} volume</div></div></div>`));
  w.exercises.forEach(ex=>{
    const best=ex.sets.reduce((b,s)=>epley(s.weight,s.reps)>epley(b.weight,b.reps)?s:b,ex.sets[0]);
    const blk=el(`<section class="ex-block"><div class="head"><div class="name">${esc(ex.name)}</div><span class="chip tint">e1RM ${esc(fmtNum(epley(best.weight,best.reps)))} ${esc(U())}</span></div></section>`);
    $(".head",blk).insertBefore(infoButton(ex.name),$(".name",blk));
    const tbl=el(`<table><thead><tr><th>Set</th><th>${esc(U())}</th><th class="r">Reps</th><th class="r"></th></tr></thead><tbody></tbody></table>`);
    ex.sets.forEach((s,i)=>$("tbody",tbl).appendChild(el(`<tr><td class="n">${i+1}</td><td>${esc(fmtNum(s.weight))}</td><td class="r">${esc(s.reps)}</td><td class="r">${s.pr?`<span class="pr-badge">${icon("trophy")}PR</span>`:""}</td></tr>`)));
    blk.appendChild(tbl); main.appendChild(blk);
  });
  if(w.notes) main.appendChild(el(`<div class="callout">${icon("notes")}<div class="body">${esc(w.notes)}</div></div>`));
  const rep=el(`<div style="padding:4px 16px 0"><button class="btn tinted block">${icon("repeat","sm")}<span>Repeat this workout</span></button></div>`); $("button",rep).onclick=()=>repeatWorkout(w); main.appendChild(rep);
  app.appendChild(main);
}
async function repeatWorkout(w){
  if(state.active&&!(await confirmAct("Discard the workout in progress and repeat this one?",{title:"Workout in progress",confirmText:"Discard & start"}))) return;
  state.active={id:uid(),name:w.name,start:Date.now(),date:todayISO(),exercises:w.exercises.map(ex=>attachExerciseRef({id:uid(),name:ex.name,muscle:ex.muscle,target:ex.target||"",sets:ex.sets.map(()=>({weight:"",reps:"",done:false}))},ex.name))};
  save("active"); setTab("summary"); go("workout");
}
async function deleteWorkout(w){
  if(!(await confirmAct("This removes the workout from your history on every device.",{title:"Delete this workout?",confirmText:"Delete workout"}))) return;
  state.workouts=state.workouts.filter(x=>x.id!==w.id); save("workouts");
  state.deleted.push({id:w.id,ts:Date.now()}); save("deleted"); back();
}
function editFinishedSheet(w){
  openSheet("Edit workout",body=>{
    body.appendChild(sectionHeader("How did it feel?",{small:true}));
    body.appendChild(segmented(Object.entries(DIFFICULTY).map(([k,d])=>[k,d.label]),w.difficulty||"",v=>{ w.difficulty=v; w.editedAt=Date.now(); save("workouts"); },{cls:"lg"}));
    body.appendChild(sectionHeader("Note",{small:true}));
    const ta=el(`<textarea class="input" rows="3">${esc(w.notes||"")}</textarea>`); body.appendChild(ta);
    const b=el(`<button class="btn primary block" style="margin-top:14px">Save</button>`); b.onclick=()=>{ w.notes=ta.value.trim(); w.editedAt=Date.now(); save("workouts"); closeSheet(); render(); }; body.appendChild(b);
  });
}

/* ============================================================
   TRENDS
   ============================================================ */
function weeklyBuckets(n){
  const ws=weekStartTs(Date.now()), wk=7*86400000, out=[];
  for(let i=n-1;i>=0;i--){ const a=ws-i*wk; const list=state.workouts.filter(w=>w.end>=a&&w.end<a+wk);
    out.push({start:a,sessions:list.length,sets:list.reduce((s,w)=>s+workoutSets(w),0),volume:list.reduce((s,w)=>s+workoutVolume(w),0),duration:list.length?list.reduce((s,w)=>s+w.duration,0)/list.length:0}); }
  return out;
}
function avg(list){ return list.length?list.reduce((a,b)=>a+b,0)/list.length:0; }
function trendRow(title, unit, series, opts={}){
  const recent=series.slice(-5,-1), prior=series.slice(Math.max(0,series.length-13),-5);
  const cur=avg(recent.filter(v=>opts.skipZero?v>0:true)), was=avg(prior.filter(v=>opts.skipZero?v>0:true));
  let dir="flat", pct=0; if(was>0&&prior.length>=2){ pct=(cur-was)/was; dir=pct>.05?"up":pct<-.05?"down":"flat"; }
  const fmt=opts.fmt||(v=>fmtNum(Math.round(v*10)/10).toLocaleString());
  const row=el(`<div class="trend-row"><span class="arrow ${dir}">${icon(dir==="up"?"arrowUpRight":dir==="down"?"arrowDownRight":"equal")}</span><div class="body"><div class="t">${esc(title)}</div><div class="d">${was>0&&prior.length>=2?`${pct>=0?"+":""}${Math.round(pct*100)}% vs the ${prior.length} week${prior.length!==1?"s":""} before`:"Building your baseline"}</div></div>${sparklineSVG(series.slice(-8),dir==="down"?"var(--red)":dir==="up"?"var(--green)":"var(--label-3)")}<div class="v">${esc(fmt(cur))}<small>${esc(unit)}</small></div></div>`);
  return row;
}
function renderTrends(app){
  app.appendChild(navBar({title:"Trends",sub:state.workouts.length?"Last 4 weeks against the 8 before.":""}));
  const main=el(`<main class="screen"></main>`);
  if(!state.workouts.length){ main.appendChild(bodyweightCard()); main.appendChild(emptyState("trends","No trends yet","Log a few workouts and Forge charts your volume, strength and consistency here.")); app.appendChild(main); return; }
  let b=weeklyBuckets(26); const firstIdx=b.findIndex(x=>x.sessions>0); b=b.slice(Math.max(0,Math.min(firstIdx,b.length-6)));
  main.appendChild(sectionHeader("Your Trends"));
  const g=el(`<div class="group"></div>`);
  g.appendChild(trendRow("Sessions","/wk",b.map(x=>x.sessions)));
  g.appendChild(trendRow("Working sets","/wk",b.map(x=>x.sets)));
  g.appendChild(trendRow("Volume",` ${U()}/wk`,b.map(x=>x.volume),{fmt:v=>fmtNum(Math.round(v)).toLocaleString()}));
  g.appendChild(trendRow("Session length"," min",b.map(x=>x.duration/60000),{skipZero:true,fmt:v=>String(Math.round(v))}));
  main.appendChild(g);
  main.appendChild(sectionHeader("Weekly Volume"));
  const vc=el(`<div class="card"></div>`);
  const last12=b.slice(-12);
  while(last12.length<6) last12.unshift({start:last12[0].start-7*86400000,sessions:0,sets:0,volume:0,duration:0});
  vc.appendChild(barChartSVG(last12.map((x,i)=>({y:Math.round(x.volume),label:(i%2===last12.length%2?new Date(x.start).toLocaleDateString(undefined,{month:"numeric",day:"numeric"}):""),text:x.volume>=1000?(x.volume/1000).toFixed(1)+"k":String(Math.round(x.volume)),color:i===last12.length-1?"var(--tint)":"var(--tint-soft-2)",dim:false})),{height:170,aria:"Weekly volume, last 12 weeks"}));
  vc.appendChild(el(`<div class="t-footnote muted" style="margin-top:8px">Total ${esc(U())} lifted per week · this week highlighted</div>`));
  main.appendChild(vc);
  main.appendChild(sectionHeader("Muscle Balance"));
  main.appendChild(muscleBalanceCard());
  main.appendChild(sectionHeader("Strength",{more:"All Records",onMore:()=>{ const t=document.getElementById("allRecords"); if(t) t.scrollIntoView({behavior:"smooth",block:"start"}); }}));
  main.appendChild(strengthCard());
  main.appendChild(sectionHeader("Body Weight"));
  main.appendChild(bodyweightCard());
  const awards=computeAwards(), earned=awards.filter(a=>a.earned).length;
  main.appendChild(sectionHeader("Awards",{more:"See All",onMore:()=>go("awards")}));
  main.appendChild(medalsRow([...awards].sort((a,b)=>(b.earned?1:0)-(a.earned?1:0)||((b.date||0)-(a.date||0))).slice(0,8)));
  main.appendChild(el(`<div class="t-footnote muted" style="margin:-6px 20px 18px">${earned} of ${awards.length} earned</div>`));
  const allEx=[...new Set(state.workouts.flatMap(w=>w.exercises.map(e=>e.name)))];
  const recs=allEx.map(strengthRecord).filter(r=>r&&r.bestE>0).sort((a,b)=>b.bestE-a.bestE);
  if(recs.length){ main.appendChild(sectionHeader("All Records")); const rg=el(`<div class="group" id="allRecords"></div>`); recs.forEach(r=>rg.appendChild(recordRow(r))); main.appendChild(rg); }
  app.appendChild(main);
}
function recordRow(r){
  const row=el(`<button class="row tappable with-lead"><span class="lead yellow">${icon("trophy")}</span><div class="body"><div class="t">${esc(r.name)}</div><div class="d">${r.bestSet?`Best set ${esc(fmtNum(r.bestSet.weight))} × ${r.bestSet.reps}`:`Best bodyweight set · ${r.bestReps} reps`} · ${esc(fmtDate(r.last))}</div></div><span class="trail"><span style="text-align:right"><span class="num" style="display:block;color:var(--label);font-size:17px">${r.bestE>0?esc(fmtNum(r.bestE))+" "+esc(U()):r.bestReps+" reps"}</span><span class="t-caption2 muted">${r.bestE>0?"est. 1RM":"best"}</span></span>${icon("chevronRight","chev")}</span></button>`);
  row.onclick=()=>go("exercise-detail",{name:r.name}); return row;
}
function muscleBalanceCard(){
  const wk=7*86400000, ws=weekStartTs(Date.now()), cur=setsByMuscleBetween(ws,ws+wk), last=setsByMuscleBetween(ws-wk,ws), variant=state.settings.planVariant||"his", plan=plannedWeeklySets(variant), cw=cycleWeekOf(Date.now());
  const card=el(`<div class="card"><div class="t-footnote muted" style="margin-bottom:12px">Hard sets this week vs your ${variant==="his"?"His":"Hers"} ${deloadActive()?"deload ":""}plan · Week ${cw} (${cw===1?"A/B/C":"D/E/F"}) · resets Monday</div></div>`);
  ["Legs","Chest","Back","Shoulders","Arms","Core"].forEach(mg=>{ const done=cur[mg]||0, target=plan[mg]||0, prev=last[mg]||0, hit=target>0&&done>=target, pct=target?Math.min(100,done/target*100):(done?100:0);
    card.appendChild(el(`<div class="bar-row"><div class="top"><span>${esc(mg)}</span><span class="n"><b>${done}</b> / ${target} · last wk ${prev}</span></div><div class="track"><div class="fill ${hit?"hit":""}" style="width:${pct.toFixed(0)}%"></div></div></div>`)); });
  return card;
}
function strengthCard(){
  let records=FEATURED_LIFTS.map(strengthRecord).filter(Boolean);
  if(!records.length){ const names=[...new Set(state.workouts.flatMap(w=>w.exercises.map(e=>e.name)))]; records=names.map(strengthRecord).filter(r=>r&&r.bestE>0).sort((a,b)=>b.last-a.last).slice(0,6); }
  const g=el(`<div class="group"></div>`);
  if(!records.length){ g.appendChild(el(`<div class="row"><div class="body"><div class="d">Complete weighted sets to build your record board.</div></div></div>`)); return g; }
  records.slice(0,6).forEach(r=>g.appendChild(recordRow(r))); return g;
}
function bodyweightCard(){
  const bw=[...state.bodyweights].sort((a,b)=>a.dateISO.localeCompare(b.dateISO));
  const card=el(`<div class="card"><div class="card-h">${icon("scaleMass")}<h3>Body weight</h3></div></div>`);
  const add=el(`<button class="btn xs tinted">${icon("plus","xs")}<span>Log</span></button>`); add.onclick=logBodyweight; $(".card-h",card).appendChild(add);
  if(!bw.length){ card.appendChild(el(`<div class="t-subhead muted">Track your weight to see the trend next to your training.</div>`)); return card; }
  const latest=bw[bw.length-1], first=bw[0], delta=latest.weight-first.weight;
  card.appendChild(el(`<div style="display:flex;align-items:baseline;gap:10px;margin:2px 0 10px"><span class="num" style="font-size:30px">${esc(fmtNum(latest.weight))}<span class="t-subhead muted" style="font-weight:500"> ${esc(U())}</span></span>${bw.length>1?`<span class="chip ${delta>0?"orange":"green"}">${delta>0?"+":""}${esc(fmtNum(Math.round(delta*10)/10))} since ${esc(fmtDate(isoToTs(first.dateISO)))}</span>`:""}</div>`));
  if(bw.length>1) card.appendChild(lineChartSVG(bw.map(b=>({x:isoToTs(b.dateISO),y:b.weight})),{zero:false,color:"var(--purple)",height:150}));
  return card;
}
function logBodyweight(){
  const last=state.bodyweights.length?state.bodyweights[state.bodyweights.length-1].weight:"";
  openSheet("Log Body Weight",body=>{
    const wf=el(`<div class="field"><label>Weight (${esc(U())})</label><input class="input" inputmode="decimal" placeholder="e.g. 185" value="${last!==""?esc(String(last)):""}"/></div>`);
    const df=el(`<div class="field"><label>Date</label><input class="input" type="date" max="${todayISO()}" value="${todayISO()}"/></div>`);
    body.append(wf,df);
    const b=el(`<button class="btn primary block">Save</button>`);
    b.onclick=()=>{ const val=parseFloat($("input",wf).value); if(!val||val<=0){ toast("Enter a weight","warning"); return; } const iso=$("input",df).value||todayISO();
      const ex=state.bodyweights.find(x=>x.dateISO===iso); if(ex) ex.weight=val; else state.bodyweights.push({dateISO:iso,weight:val});
      state.bodyweights.sort((a,b)=>a.dateISO.localeCompare(b.dateISO)); save("bodyweights"); closeSheet(); render(); toast("Body weight logged","scaleMass"); };
    body.appendChild(b);
  });
}
function renderExerciseDetail(app,v){
  const name=v.name, rec=strengthRecord(name), ex=exerciseByRef(name);
  app.appendChild(navBar({back:true,title:name,eyebrow:ex?[ex.muscle,ex.equipment?EQUIP_LABELS[ex.equipment]:null,patternLabel(name)].filter(Boolean).join(" · "):"",actions:[navButton("book",null,()=>openExerciseInfo(name),{aria:"How to perform"})]}));
  const main=el(`<main class="screen"></main>`);
  if(!rec){ main.appendChild(emptyState("trends","No sets yet","Log this exercise in a workout to see records and a trend.")); app.appendChild(main); return; }
  main.appendChild(el(`<div class="metrics"><div class="metric tint"><div class="v">${rec.bestE>0?esc(fmtNum(rec.bestE)):"–"}</div><div class="l">Est. 1RM ${esc(U())}</div></div><div class="metric"><div class="v">${esc(fmtNum(rec.bestW))}</div><div class="l">Top weight</div></div><div class="metric"><div class="v">${rec.bestReps}</div><div class="l">Best reps</div></div></div>`));
  const pts=[...state.workouts].sort((a,b)=>a.end-b.end).map(w=>{ const e=w.exercises.find(x=>sameExercise(x,name)); if(!e) return null; const y=Math.max(...e.sets.map(s=>epley(s.weight,s.reps))); return y?{x:w.end,y}:null; }).filter(Boolean);
  if(pts.length){ main.appendChild(sectionHeader("Strength Trend")); const c=el(`<div class="card"></div>`); c.appendChild(lineChartSVG(pts,{aria:"Estimated one-rep max over time"})); c.appendChild(el(`<div class="t-footnote muted" style="margin-top:8px">Estimated one-rep max per session (Epley)</div>`)); main.appendChild(c); }
  const reps=Object.keys(rec.repBests).map(Number).sort((a,b)=>a-b);
  if(reps.length){ main.appendChild(sectionHeader("Rep Records")); const c=el(`<div class="card"></div>`); reps.forEach(r=>c.appendChild(el(`<div class="kv"><span>${r} rep${r!==1?"s":""}</span><b>${esc(fmtNum(rec.repBests[r]))} ${esc(U())}</b></div>`))); main.appendChild(c); }
  const sessions=state.workouts.filter(w=>w.exercises.some(e=>sameExercise(e,name))).slice(0,8);
  if(sessions.length){ main.appendChild(sectionHeader("Recent Sessions")); const g=el(`<div class="group"></div>`);
    sessions.forEach(w=>{ const e=w.exercises.find(x=>sameExercise(x,name)); const row=el(`<button class="row tappable"><div class="body"><div class="t">${esc(fmtDay(w.end))}</div><div class="d">${esc(e.sets.map(s=>(Number(s.weight)?fmtNum(s.weight)+"×":"")+s.reps).join(" · "))}</div></div><span class="trail">${e.sets.some(s=>s.pr)?`<span class="pr-badge">${icon("trophy")}PR</span>`:""}${icon("chevronRight","chev")}</span></button>`); row.onclick=()=>go("history-detail",{id:w.id}); g.appendChild(row); });
    main.appendChild(g); }
  app.appendChild(main);
}

/* ============================================================
   LIBRARY — routines and exercises
   ============================================================ */
let _libTab="routines";
function routineKind(r){ if(r.bodyweight) return "bodyweight"; if(r.specialty) return "specialty"; if(r.barbell) return "barbell"; if(r.preset) return "program"; if(r.generated) return "generated"; return "custom"; }
const KIND_META={program:{label:"Program",color:"ember",badge:""},barbell:{label:"Barbell days",color:"slate",badge:"indigo"},specialty:{label:"Specialty",color:"dusk",badge:"teal"},bodyweight:{label:"Bodyweight",color:"forest",badge:"green"},generated:{label:"Generated",color:"ocean",badge:"blue"},custom:{label:"My routines",color:"ocean",badge:"blue"}};
function routineLetter(r){ const m=/^Workout ([A-F])/.exec(r.name); if(m) return m[1]; const g=/^([GHI]) —/.exec(r.name); if(g) return g[1]; if(r.bodyweight) return "BW"; if(/Lower/.test(r.name)) return "L"; if(/Upper/.test(r.name)) return "U"; return routineBaseName(r)[0].toUpperCase(); }
function renderLibrary(app){
  const add=navButton("plus",null,()=>go("routine-edit",{id:null}),{aria:"New routine"});
  app.appendChild(navBar({title:"Library",actions:[add]}));
  const main=el(`<main class="screen"></main>`);
  main.appendChild(el(`<div style="padding:0 16px 14px"></div>`)).appendChild(segmented([["routines","Routines"],["exercises","Exercises"]],_libTab,v=>{ _libTab=v; render(); },{cls:"lg"}));
  if(_libTab==="routines") routinesView(main); else exerciseListView(main);
  app.appendChild(main);
}
function routinesView(main){
  const gen=el(`<button class="card tappable" style="background:linear-gradient(150deg,#FF8A3D,#E8341F);color:#fff;text-align:left;border:0;width:calc(100% - 32px);display:flex;align-items:center;gap:14px;box-shadow:0 12px 30px rgba(240,86,31,.25)"><span style="width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,.22);display:grid;place-items:center">${icon("sparkles","md")}</span><span style="flex:1;min-width:0"><span style="display:block;font:700 18px var(--font);letter-spacing:-.3px">Generate a workout</span><span style="display:block;font:400 13px var(--font);opacity:.9;margin-top:2px">Balanced across the muscles and equipment you pick</span></span>${icon("chevronRight")}</button>`);
  gen.onclick=()=>go("generator"); main.appendChild(gen);
  const setup=el(`<div style="display:flex;align-items:center;gap:10px;margin:0 20px 16px"><span class="t-footnote muted">Routines start as</span></div>`); setup.appendChild(setupChip()); main.appendChild(setup);
  const groups=groupedRoutines();
  if(!groups.length){ main.appendChild(emptyState("library","No routines yet","Build a reusable routine and start it with one tap.",{label:"Create routine",icon:"plus",run:()=>go("routine-edit",{id:null})})); return; }
  const byKind={};
  groups.forEach(g=>{ const r=selectedRoutine(g); const k=routineKind(r); (byKind[k]=byKind[k]||[]).push({g,r}); });
  ["program","barbell","specialty","bodyweight","generated","custom"].forEach(k=>{
    const list=byKind[k]; if(!list||!list.length) return;
    main.appendChild(sectionHeader(KIND_META[k].label));
    const grp=el(`<div class="group"></div>`);
    list.forEach(({g,r})=>{
      const eq=routineEquipment(r).map(e=>EQUIP_SHORT[e]||e).join(" · ");
      const row=el(`<button class="row tappable with-lead">${letterBadge(routineLetter(r),k==="program"?badgeColorFor(routineLetter(r)):KIND_META[k].badge)}<div class="body"><div class="t">${esc(routineBaseName(r).replace(/^Workout [A-F] — /,""))}</div><div class="d">${r.exercises.length} exercises · ~${routineMinutes(r)} min${eq?" · "+esc(eq):""}</div></div><span class="trail">${icon("chevronRight","chev")}</span></button>`);
      row.onclick=()=>go("routine",{id:r.id}); grp.appendChild(row);
    });
    main.appendChild(grp);
  });
}
function renderRoutineDetail(app,v){
  let r=state.routines.find(x=>x.id===v.id); if(!r){ back(); return; }
  const group=groupedRoutines().find(g=>g.single===r||g.his===r||g.hers===r);
  const paired=!!(group&&!group.single&&group.his&&group.hers);
  if(paired) r=selectedRoutine(group)||r;
  const kind=routineKind(r), km=KIND_META[kind];
  const more=navButton("ellipsis",null,()=>actionSheet("Routine",[
    {icon:"pencil",label:"Edit routine",run:()=>go("routine-edit",{id:r.id})},
    {icon:"repeat",label:"Duplicate",run:()=>{ const copy=JSON.parse(JSON.stringify(r)); copy.id=uid(); copy.preset=false; copy.name=routineBaseName(r)+" copy"; state.routines.push(copy); save("routines"); toast("Routine duplicated","check"); }},
    !r.preset&&{icon:"trash",label:"Delete routine",destructive:true,run:async()=>{ if(await confirmAct("Workouts already logged from it are kept.",{title:"Delete this routine?",confirmText:"Delete routine"})){ state.routines=state.routines.filter(x=>x.id!==r.id); save("routines"); back(); } }},
  ]),{aria:"Routine options"});
  app.appendChild(navBar({back:true,title:routineBaseName(r).replace(/^Workout [A-F] — /,""),large:false,actions:[more]}));
  const main=el(`<main class="screen"></main>`);
  const eq=routineEquipment(r).map(e=>EQUIP_LABELS[e]||e).join(" · ");
  main.appendChild(el(`<section class="routine-hero ${km.color}"><div class="eyebrow">${esc(km.label)}${/^Workout [A-F]/.test(r.name)?" · "+esc(/^Workout [A-F]/.exec(r.name)[0]):""}</div><h2>${esc(routineBaseName(r).replace(/^Workout [A-F] — /,""))}</h2><div class="meta">${r.exercises.length} exercises · about ${routineMinutes(r)} min${eq?" · "+esc(eq):""}</div><div class="chips">${routineMuscles(r).map(m=>`<span class="chip">${esc(m)}</span>`).join("")}</div></section>`));
  if(paired){ const wrap=el(`<div style="padding:0 16px 14px"></div>`); wrap.appendChild(segmented([["his","His · Mass"],["hers","Hers · Tone"]],state.settings.planVariant||"his",val=>{ state.settings.planVariant=val; save("settings"); render(); },{cls:"lg"})); main.appendChild(wrap); }
  if(r.note) main.appendChild(el(`<div class="callout">${icon("info")}<div class="body">${esc(cleanNote(r.note))}</div></div>`));
  const g=el(`<div class="group"></div>`);
  r.exercises.forEach((re,i)=>{
    const mapped=r.bodyweight?re.name:mapExerciseForMode(re.name,equipMode()), lib=exerciseByRef(mapped);
    const row=el(`<div class="row with-lead">${letterBadge(String(i+1),"gray","sm")}<div class="body"><div class="t">${esc(mapped)}${mapped!==re.name?` <span class="t-caption muted">via ${esc(re.name)}</span>`:""}</div><div class="d">${re.sets||1} × ${esc(re.reps||"—")}${lib&&lib.equipment?" · "+esc(EQUIP_SHORT[lib.equipment]):""}${re.muscle?" · "+esc(re.muscle):""}</div></div></div>`);
    row.appendChild(infoButton(mapped)); g.appendChild(row);
  });
  main.appendChild(sectionHeader("Exercises",{small:true})); main.appendChild(g);
  const setup=el(`<div style="display:flex;align-items:center;gap:10px;margin:-6px 20px 16px"><span class="t-footnote muted">Resolved for</span></div>`); setup.appendChild(setupChip()); main.appendChild(setup);
  const acts=el(`<div class="stack" style="padding:0 16px"></div>`);
  const start=el(`<button class="btn primary block lg">${icon("play","sm")}<span>Start</span></button>`); start.onclick=()=>startFromRoutine(r.id);
  const edit=el(`<button class="btn tinted block">${icon("pencil","sm")}<span>Edit routine</span></button>`); edit.onclick=()=>go("routine-edit",{id:r.id});
  acts.append(start,edit); main.appendChild(acts);
  app.appendChild(main);
}
function renderRoutineEdit(app,v){
  const editing=v.id?state.routines.find(r=>r.id===v.id):null;
  const draft=editing?JSON.parse(JSON.stringify(editing)):{id:uid(),name:"",exercises:[]};
  const saveBtn=navButton(null,"Save",()=>{
    if(!draft.name.trim()){ toast("Give your routine a name","warning"); return; }
    if(!draft.exercises.length){ toast("Add at least one exercise","warning"); return; }
    draft.name=draft.name.trim();
    if(editing){ const i=state.routines.findIndex(r=>r.id===editing.id); state.routines[i]=draft; } else state.routines.push(draft);
    save("routines"); back(); toast("Routine saved","check");
  },{cls:"text"});
  app.appendChild(navBar({back:true,title:editing?"Edit Routine":"New Routine",large:false,actions:[saveBtn]}));
  const main=el(`<main class="screen" style="padding-top:12px"></main>`);
  const g=el(`<div class="group"></div>`);
  const nameF=el(`<div class="row"><div class="body"><input class="input" placeholder="Routine name" value="${esc(draft.name)}" style="background:none;padding:0;height:auto;font-weight:600"/></div></div>`);
  $("input",nameF).oninput=e=>draft.name=e.target.value;
  const noteF=el(`<div class="row"><div class="body"><input class="input" placeholder="Note shown when you start (optional)" value="${esc(draft.note||"")}" style="background:none;padding:0;height:auto"/></div></div>`);
  $("input",noteF).oninput=e=>draft.note=e.target.value;
  g.append(nameF,noteF); main.appendChild(g);
  main.appendChild(sectionHeader("Exercises",{small:true}));
  const list=el(`<div></div>`); main.appendChild(list);
  function drawList(){
    list.innerHTML="";
    if(!draft.exercises.length) list.appendChild(el(`<div class="group"><div class="row"><div class="body"><div class="d">No exercises yet. Add one below.</div></div></div></div>`));
    draft.exercises.forEach((ex,i)=>{
      const c=el(`<div class="card" style="padding:14px 16px"><div class="row" style="padding:0;min-height:0"><div class="body"><div class="t" style="font-weight:600">${esc(ex.name)}</div><div class="d">${esc(ex.muscle||"")}</div></div></div></div>`);
      const st=el(`<div style="display:flex;align-items:center;gap:10px"><span class="num" style="font-size:15px;min-width:50px;text-align:right">${ex.sets} set${ex.sets!==1?"s":""}</span></div>`);
      st.appendChild(stepper(()=>{ ex.sets=Math.max(1,ex.sets-1); drawList(); },()=>{ ex.sets=Math.min(15,ex.sets+1); drawList(); },{minusLabel:"Fewer sets",plusLabel:"More sets"}));
      $(".row",c).appendChild(st);
      const reps=el(`<input class="input" placeholder="Target reps, e.g. 8-10" value="${esc(ex.reps||"")}" style="margin-top:12px"/>`); reps.oninput=()=>ex.reps=reps.value; c.appendChild(reps);
      const cue=el(`<input class="input" placeholder="Form cue (optional)" value="${esc(ex.note||"")}" style="margin-top:8px"/>`); cue.oninput=()=>ex.note=cue.value; c.appendChild(cue);
      const ctl=el(`<div class="btn-row" style="margin-top:10px"></div>`);
      const up=el(`<button class="btn gray sm" aria-label="Move up">${icon("chevronUp","sm")}</button>`); up.onclick=()=>{ if(i>0){ [draft.exercises[i-1],draft.exercises[i]]=[draft.exercises[i],draft.exercises[i-1]]; drawList(); } };
      const dn=el(`<button class="btn gray sm" aria-label="Move down">${icon("chevronDown","sm")}</button>`); dn.onclick=()=>{ if(i<draft.exercises.length-1){ [draft.exercises[i+1],draft.exercises[i]]=[draft.exercises[i],draft.exercises[i+1]]; drawList(); } };
      const rm=el(`<button class="btn destructive tinted sm">${icon("trash","sm")}<span>Remove</span></button>`); rm.onclick=()=>{ draft.exercises.splice(i,1); drawList(); };
      ctl.append(up,dn,rm); c.appendChild(ctl); list.appendChild(c);
    });
  }
  drawList();
  const addEx=el(`<div style="padding:0 16px 16px"><button class="btn tinted block">${icon("plus","sm")}<span>Add exercise</span></button></div>`);
  $("button",addEx).onclick=()=>openPicker(sel=>{ sel.forEach(e=>draft.exercises.push(attachExerciseRef({name:e.name,muscle:e.muscle,sets:3},e.name))); drawList(); });
  main.appendChild(addEx);
  if(editing&&!editing.preset){ const del=el(`<div style="padding:0 16px"><button class="btn destructive tinted block">Delete routine</button></div>`);
    $("button",del).onclick=async()=>{ if(await confirmAct("Workouts already logged from it are kept.",{title:"Delete this routine?",confirmText:"Delete routine"})){ state.routines=state.routines.filter(r=>r.id!==editing.id); save("routines"); popToRoot(); } }; main.appendChild(del); }
  app.appendChild(main);
}
function renderGenerator(app){
  const cfg=ensureGeneratorState();
  app.appendChild(navBar({back:true,title:"Generate",sub:"Balanced patterns, fresh picks, compounds first."}));
  const main=el(`<main class="screen"></main>`);
  main.appendChild(sectionHeader("Muscle groups",{small:true}));
  const mc=el(`<div class="card"><div class="opt-grid"></div><div class="t-footnote muted" style="margin-top:10px">Every selected group gets at least one movement.</div></div>`);
  GENERATOR_MUSCLES.forEach(m=>{ const on=cfg.muscles.has(m); const b=el(`<button class="chip chip-btn lg ${on?"on":""}" aria-pressed="${on}">${esc(m)}</button>`); b.onclick=()=>{ if(cfg.muscles.has(m)) cfg.muscles.delete(m); else cfg.muscles.add(m); cfg.draft=null; render(); }; $(".opt-grid",mc).appendChild(b); });
  main.appendChild(mc);
  main.appendChild(sectionHeader("Equipment",{small:true}));
  const ec=el(`<div class="card"><div class="opt-grid"></div></div>`);
  GENERATOR_EQUIPMENT.forEach(eq=>{ const on=cfg.equipment.has(eq); const b=el(`<button class="chip chip-btn lg ${on?"on":""}" aria-pressed="${on}">${icon(equipmentIconName(eq),"xs")}<span>${esc(eq==="barbell"?"Barbell / rack":EQUIP_LABELS[eq])}</span></button>`); b.onclick=()=>{ if(cfg.equipment.has(eq)) cfg.equipment.delete(eq); else cfg.equipment.add(eq); cfg.draft=null; render(); }; $(".opt-grid",ec).appendChild(b); });
  main.appendChild(ec);
  main.appendChild(sectionHeader("Length",{small:true}));
  const sc=el(`<div class="card"></div>`);
  sc.appendChild(segmented([[4,"4 · short"],[6,"6 · standard"],[8,"8 · long"]],cfg.size,v=>{ cfg.size=Number(v); cfg.draft=null; render(); },{cls:"lg"}));
  sc.appendChild(el(`<div class="t-footnote muted" style="margin-top:10px">About ${cfg.size===4?"25–35":cfg.size===6?"40–55":"55–70"} minutes.</div>`));
  main.appendChild(sc);
  const gen=el(`<div style="padding:0 16px 16px"><button class="btn primary block lg">${icon("sparkles","sm")}<span>${cfg.draft?"Generate another":"Generate workout"}</span></button></div>`);
  $("button",gen).onclick=()=>{ cfg.draft=generateWorkoutDraft(cfg,cfg.draft); if(cfg.draft) render(); }; main.appendChild(gen);
  if(cfg.draft){
    const d=cfg.draft, used=[...new Set(d.exercises.map(re=>exerciseByRef(re)).filter(Boolean).map(x=>x.equipment))].map(e=>EQUIP_LABELS[e]||e);
    main.appendChild(el(`<section class="routine-hero ocean"><div class="eyebrow">Generated plan</div><h2>${esc(d.name)}</h2><div class="meta">${d.exercises.length} exercises · ${esc(used.join(" + "))} · ${esc(variantLabel())}</div></section>`));
    const g=el(`<div class="group"></div>`);
    d.exercises.forEach((re,i)=>{ const ex=exerciseByRef(re);
      const row=el(`<div class="row with-lead">${letterBadge(String(i+1),"gray","sm")}<div class="body"><div class="t">${esc(re.name)}</div><div class="d">${re.sets} × ${esc(re.reps)} · ${esc(re.muscle)}${ex&&ex.equipment?" · "+esc(EQUIP_SHORT[ex.equipment]):""}</div></div></div>`);
      row.appendChild(infoButton(re.name));
      const sw=el(`<button class="info-btn" aria-label="Swap ${esc(re.name)}">${icon("swap")}</button>`); sw.onclick=()=>swapGeneratedExercise(i); row.appendChild(sw); g.appendChild(row); });
    main.appendChild(g);
    const acts=el(`<div class="btn-row" style="padding:0 16px"></div>`);
    const saveB=el(`<button class="btn tinted">${icon("library","sm")}<span>Save</span></button>`); saveB.onclick=()=>saveGeneratedRoutine(d);
    const startB=el(`<button class="btn green" style="flex:1.5">${icon("play","sm")}<span>Start</span></button>`); startB.onclick=()=>startGeneratedWorkout(d);
    acts.append(saveB,startB); main.appendChild(acts);
  }
  app.appendChild(main);
}
function saveGeneratedRoutine(draft){
  openSheet("Save Routine",body=>{
    const f=el(`<div class="field"><label>Routine name</label><input class="input" value="${esc(draft.name)}"/></div>`); body.appendChild(f);
    const b=el(`<button class="btn primary block">Save</button>`);
    b.onclick=()=>{ const name=$("input",f).value.trim(); if(!name){ toast("Give the routine a name","warning"); return; }
      state.routines.push({id:uid(),name,note:draft.note,generated:true,exercises:draft.exercises.map(re=>attachExerciseRef({name:re.name,muscle:re.muscle,sets:re.sets,reps:re.reps,note:re.note||""},re.name))});
      save("routines"); closeSheet(); toast("Routine saved","check"); };
    body.appendChild(b);
  });
}
function renderExerciseLibrary(app){ _libTab="exercises"; renderLibrary(app); }
const _lib={q:"",eq:"all",fav:false};
function exerciseListView(main){
  const search=el(`<div class="search-bar">${icon("search","sm")}<input placeholder="Search movements" value="${esc(_lib.q)}" autocomplete="off"/></div>`);
  main.appendChild(search);
  main.appendChild(equipFilterChips(_lib.eq,v=>{ _lib.eq=v; draw(); }));
  const tools=el(`<div style="display:flex;gap:8px;align-items:center;margin:0 16px 12px"></div>`);
  const fav=el(`<button class="chip chip-btn lg ${_lib.fav?"on":""}" aria-pressed="${_lib.fav}">${icon("star","xs")}<span>Favorites</span></button>`); fav.onclick=()=>{ _lib.fav=!_lib.fav; fav.classList.toggle("on",_lib.fav); draw(); };
  const add=el(`<button class="chip chip-btn lg" style="margin-left:auto">${icon("plus","xs")}<span>Custom</span></button>`); add.onclick=()=>createCustomExercise(()=>draw());
  tools.append(fav,add); main.appendChild(tools);
  const summary=el(`<div class="t-footnote muted" style="margin:0 20px 8px" aria-live="polite"></div>`); main.appendChild(summary);
  const results=el(`<div></div>`); main.appendChild(results);
  function draw(){
    const q=_lib.q.trim().toLowerCase();
    const filtered=state.exercises.filter(e=>{ const pool=e.pattern&&MOVEMENT_POOLS[e.pattern]; const hay=[e.name,e.muscle,pool&&pool.label,e.difficulty,...(e.requirements||[])].filter(Boolean).join(" ").toLowerCase();
      return (!q||hay.includes(q))&&(_lib.eq==="all"||e.equipment===_lib.eq)&&(!_lib.fav||e.favorite); }).sort((a,b)=>a.name.localeCompare(b.name));
    summary.textContent=`${filtered.length} movement${filtered.length!==1?"s":""}`;
    const groups={}; filtered.forEach(e=>{ (groups[e.muscle||"Other"]=groups[e.muscle||"Other"]||[]).push(e); });
    results.innerHTML="";
    Object.keys(groups).sort().forEach(mg=>{
      results.appendChild(sectionHeader(mg,{small:true}));
      const g=el(`<div class="group"></div>`);
      groups[mg].forEach(e=>{
        const row=el(`<button class="row tappable"><div class="body"><div class="t">${esc(e.name)}</div><div class="d">${esc(EQUIP_LABELS[e.equipment]||"Custom setup")}${e.difficulty?" · "+esc(e.difficulty):""}${e.unilateral?" · unilateral":""}${e.custom?" · custom":""}</div></div></button>`);
        row.onclick=()=>openExerciseInfo(e.name);
        const star=el(`<button class="info-btn" aria-label="${e.favorite?"Remove from favorites":"Add to favorites"}" style="color:${e.favorite?"var(--yellow)":"var(--label-4)"}">${icon(e.favorite?"starFill":"star")}</button>`);
        star.onclick=ev=>{ ev.stopPropagation(); e.favorite=!e.favorite; save("exercises"); draw(); }; row.appendChild(star);
        g.appendChild(row);
      });
      results.appendChild(g);
    });
    if(!filtered.length) results.appendChild(emptyState("search","No matches","Try another word, clear a filter, or create a custom movement."));
  }
  $("input",search).oninput=e=>{ _lib.q=e.target.value; draw(); }; draw();
}

/* ============================================================
   EXERCISE INFO, PICKER, CUSTOM EXERCISE
   ============================================================ */
function openExerciseInfo(name){
  name=canonicalExerciseName(name);
  const ex=exerciseByRef(name), info=(typeof EXERCISE_INFO!=="undefined"&&EXERCISE_INFO[name])||null;
  openSheet(name,body=>{
    const chips=el(`<div class="chips" style="margin-bottom:12px"></div>`);
    if(ex&&ex.muscle) chips.appendChild(el(`<span class="chip tint">${esc(ex.muscle)}</span>`));
    if(ex&&ex.equipment) chips.appendChild(el(`<span class="chip">${icon(equipmentIconName(ex.equipment),"xs")}<span>${esc(EQUIP_LABELS[ex.equipment]||ex.equipment)}</span></span>`));
    const pl=patternLabel(name); if(pl) chips.appendChild(el(`<span class="chip">${esc(pl)}</span>`));
    if(ex&&ex.difficulty) chips.appendChild(el(`<span class="chip">${esc(ex.difficulty[0].toUpperCase()+ex.difficulty.slice(1))}</span>`));
    body.appendChild(chips);
    if(info){
      if(info.c&&info.c.length){ body.appendChild(sectionHeader("Quick form check",{small:true})); const ul=el(`<ul class="ex-cues"></ul>`); info.c.slice(0,3).forEach(t=>ul.appendChild(el(`<li>${esc(t)}</li>`))); body.appendChild(ul); }
      if(info.s){ body.appendChild(sectionHeader("Setup",{small:true})); body.appendChild(el(`<div class="ex-info-block">${esc(info.s)}</div>`)); }
      if(info.m&&info.m.length){ body.appendChild(sectionHeader("The motion",{small:true})); const ol=el(`<ol class="ex-steps"></ol>`); info.m.forEach(t=>ol.appendChild(el(`<li>${esc(t)}</li>`))); body.appendChild(ol); }
    } else if(ex&&ex.desc) body.appendChild(el(`<div class="ex-info-block">${esc(ex.desc)}</div>`));
    else body.appendChild(el(`<div class="t-subhead muted">No description for this exercise yet.</div>`));
    if(ex&&ex.feel){ body.appendChild(sectionHeader("What you should feel",{small:true})); body.appendChild(el(`<div class="ex-info-block">${esc(ex.feel)}</div>`)); }
    if(ex&&ex.safety){ body.appendChild(sectionHeader("Safety & setup",{small:true})); body.appendChild(el(`<div class="callout orange">${icon("warning")}<div class="body">${esc(ex.safety)}</div></div>`)); }
    if(ex&&ex.requirements&&ex.requirements.length){ body.appendChild(sectionHeader("You'll need",{small:true})); body.appendChild(el(`<div class="chips">${ex.requirements.map(x=>`<span class="chip">${esc(x)}</span>`).join("")}</div>`)); }
    if(ex){ body.appendChild(sectionHeader("Volume logging",{small:true})); body.appendChild(el(`<div class="callout blue">${icon("number")}<div class="body"><b>Automatic ×${volumeFactors(ex).multiplier}.</b> ${esc(volumeRuleText(ex))}</div></div>`)); }
    if(ex&&((ex.regressions&&ex.regressions.length)||(ex.progressions&&ex.progressions.length))){
      body.appendChild(sectionHeader("Scale it",{small:true})); const c=el(`<div class="card"></div>`);
      if(ex.regressions&&ex.regressions.length) c.appendChild(el(`<div class="kv"><span>Easier</span><b style="text-align:right;font-weight:500">${esc(ex.regressions.join(" · "))}</b></div>`));
      if(ex.progressions&&ex.progressions.length) c.appendChild(el(`<div class="kv"><span>Progress</span><b style="text-align:right;font-weight:500">${esc(ex.progressions.join(" · "))}</b></div>`)); body.appendChild(c);
    }
    const subs=suggestedSubs(name);
    if(subs.length){ body.appendChild(sectionHeader("Substitutions",{small:true})); const c=el(`<div class="card"></div>`); subs.forEach(o=>c.appendChild(el(`<div class="kv" style="display:block"><div style="font-weight:600">${esc(o.name)} <span class="chip" style="margin-left:4px">${esc(EQUIP_SHORT[o.equipment]||"")}</span></div><div class="t-footnote muted" style="margin-top:2px">${esc(o.reason)}</div></div>`))); body.appendChild(c); }
    const prev=lastPerformance(name), hb=historicalBest(name);
    if(prev||hb.e>0){ body.appendChild(sectionHeader("Your numbers",{small:true})); const c=el(`<div class="card"></div>`);
      if(prev) c.appendChild(el(`<div class="kv"><span>Last time</span><b>${esc(prev.map(s=>(Number(s.weight)?fmtNum(s.weight)+"×":"")+s.reps).join(" · "))}</b></div>`));
      if(hb.e>0) c.appendChild(el(`<div class="kv"><span>Best</span><b>${esc(fmtNum(hb.w))} ${esc(U())} · e1RM ${esc(fmtNum(hb.e))}</b></div>`));
      body.appendChild(c);
      const more=el(`<button class="btn plain sm" style="margin:6px 0 0 -4px">${icon("trends","sm")}<span>See trend & records</span></button>`); more.onclick=()=>{ closeSheet(); go("exercise-detail",{name}); }; body.appendChild(more); }
    if(ex){
      body.appendChild(sectionHeader("My cue",{small:true}));
      const cue=el(`<textarea class="input" rows="2" placeholder="e.g. Brace before the descent; bench notch 3…">${esc(ex.personalCue||"")}</textarea>`); body.appendChild(cue);
      const saveCue=el(`<button class="btn tinted block" style="margin-top:8px">Save cue</button>`);
      saveCue.onclick=()=>{ ex.personalCue=cue.value.trim(); save("exercises"); closeSheet(); render(); toast(ex.personalCue?"Cue saved":"Cue cleared","check"); }; body.appendChild(saveCue);
      if(ex.custom){
        body.appendChild(sectionHeader("Custom exercise",{small:true}));
        const ta=el(`<textarea class="input" rows="3" placeholder="Setup, motion, cues…">${esc(ex.desc||"")}</textarea>`); ta.onchange=()=>{ ex.desc=ta.value.trim(); save("exercises"); }; body.appendChild(ta);
        const del=el(`<button class="btn destructive tinted block" style="margin-top:8px">Delete custom exercise</button>`);
        del.onclick=async()=>{ if(await confirmAct(`Remove “${ex.name}” from your library. Logged sets are kept.`,{title:"Delete custom exercise?",confirmText:"Delete exercise"})){ state.exercises=state.exercises.filter(x=>x.id!==ex.id); save("exercises"); closeSheet(); render(); } }; body.appendChild(del);
      }
    }
    body.appendChild(el(`<div class="spacer"></div>`));
  });
}
function openPicker(onDone){
  const chosen=new Set(); let eqFilter="all";
  const {body,sheet}=openSheet("Add Exercises",body=>{
    const search=el(`<div class="search-bar" style="margin:0 0 10px">${icon("search","sm")}<input placeholder="Search movements" autocomplete="off"/></div>`); body.appendChild(search);
    body.appendChild(equipFilterChips(eqFilter,v=>{ eqFilter=v; draw(); },{inSheet:true}));
    const listWrap=el(`<div></div>`); body.appendChild(listWrap);
    const newBtn=el(`<button class="btn plain sm" style="margin:6px 0 0 -4px">${icon("plus","sm")}<span>Create custom exercise</span></button>`); newBtn.onclick=()=>createCustomExercise(()=>draw()); body.appendChild(newBtn);
    function draw(){
      const q=$("input",search).value.trim().toLowerCase(); const groups={};
      state.exercises.filter(e=>!q||e.name.toLowerCase().includes(q)||(e.muscle||"").toLowerCase().includes(q)).filter(e=>eqFilter==="all"||e.equipment===eqFilter).sort((a,b)=>a.name.localeCompare(b.name)).forEach(e=>{ (groups[e.muscle||"Other"]=groups[e.muscle||"Other"]||[]).push(e); });
      listWrap.innerHTML="";
      Object.keys(groups).sort().forEach(mg=>{ listWrap.appendChild(sectionHeader(mg,{small:true}));
        groups[mg].forEach(e=>{ const on=chosen.has(e.id);
          const row=el(`<div class="pick-row" role="checkbox" aria-checked="${on}"><div class="body"><div class="t">${esc(e.name)}</div><div class="d">${esc(EQUIP_LABELS[e.equipment]||"Custom")}${e.custom?" · custom":""}</div></div><span class="check ${on?"on":""}">${icon("check")}</span></div>`);
          row.insertBefore(infoButton(e.name),row.firstChild);
          row.onclick=()=>{ if(chosen.has(e.id)) chosen.delete(e.id); else chosen.add(e.id); footer.textContent=chosen.size?`Add ${chosen.size} exercise${chosen.size!==1?"s":""}`:"Add"; footer.disabled=!chosen.size; draw(); };
          listWrap.appendChild(row); }); });
      if(!Object.keys(groups).length) listWrap.appendChild(el(`<div class="t-subhead muted" style="padding:16px 4px">No matches. Create a custom exercise below.</div>`));
    }
    $("input",search).oninput=draw; draw();
  });
  const footer=el(`<button class="btn primary block" style="margin:8px 16px calc(8px + var(--safe-bottom));flex:0 0 auto" disabled>Add</button>`);
  footer.onclick=()=>{ const sel=state.exercises.filter(e=>chosen.has(e.id)); closeSheet(); if(sel.length) onDone(sel); };
  sheet.appendChild(footer);
}
function createCustomExercise(done){
  openSheet("Custom Exercise",body=>{
    const nf=el(`<div class="field"><label>Name</label><input class="input" placeholder="Exercise name"/></div>`);
    const mf=el(`<div class="field"><label>Primary muscle group</label><select class="input">${["Chest","Back","Legs","Shoulders","Arms","Core","Cardio","Mobility","Other"].map(m=>`<option>${m}</option>`).join("")}</select></div>`);
    const ef=el(`<div class="field"><label>Equipment</label><select class="input"><option value="bodyweight">Bodyweight</option><option value="dumbbell">Dumbbells</option><option value="barbell">Barbell</option><option value="pullup">Pull-up bar</option><option value="gym">Gym equipment</option></select></div>`);
    const vf=el(`<div class="field"><label>Loaded implements per rep</label><select class="input"><option value="">Automatic by equipment</option><option value="1">One dumbbell / total loaded weight</option><option value="2">Two dumbbells — weight entered per dumbbell</option></select></div>`);
    const rf=el(`<div class="field"><label>Rep counting</label><select class="input"><option value="total">Total reps as entered</option><option value="per_side">Reps per arm, leg, or side</option></select></div>`);
    const pf=el(`<div class="field"><label>Movement pattern</label><select class="input"><option value="">Unassigned</option>${Object.entries(MOVEMENT_POOLS).map(([k,p])=>`<option value="${esc(k)}">${esc(p.label)}</option>`).join("")}</select></div>`);
    const lf=el(`<div class="field"><label>Difficulty</label><select class="input"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>`);
    const df=el(`<div class="field"><label>How to do it (optional)</label><textarea class="input" rows="3" placeholder="Setup, motion, cues…"></textarea></div>`);
    body.append(nf,mf,ef,vf,rf,pf,lf,df);
    const b=el(`<button class="btn primary block">Add Exercise</button>`);
    b.onclick=()=>{ const name=$("input",nf).value.trim(); if(!name){ toast("Enter a name","warning"); return; } if(exerciseByRef(name)){ toast("That exercise already exists","warning"); return; }
      const ex={id:uid(),name,muscle:$("select",mf).value,equipment:$("select",ef).value,pattern:$("select",pf).value||null,difficulty:$("select",lf).value,custom:true,desc:$("textarea",df).value.trim()}; ex.key="custom:"+ex.id;
      Object.assign(ex,metadataFor(ex.name,ex.muscle,ex.equipment,ex.pattern),{key:ex.key,difficulty:ex.difficulty});
      if($("select",vf).value) ex.loadCount=Number($("select",vf).value); ex.repMode=$("select",rf).value; ex.unilateral=ex.repMode==="per_side";
      state.exercises.push(ex); save("exercises"); closeSheet(); done&&done(); toast("Exercise added","check"); };
    body.appendChild(b);
  });
}

/* ============================================================
   SETTINGS
   ============================================================ */
function renderSettings(app){
  app.appendChild(navBar({back:true,title:"Settings"}));
  const main=el(`<main class="screen"></main>`);
  const name=syncName(), last=Number(localStorage.getItem("forge_lastBackup")||0);
  const prof=el(`<div class="card profile-card"><span class="avatar lg">${name?esc(name[0].toUpperCase()):icon("person","lg")}</span><div style="min-width:0"><div class="t">${name?esc(name):"Not connected"}</div><div class="d">${name?(last?"Backed up "+esc(relTime(last)).toLowerCase():"Connected · not backed up yet"):"Connect to your home server to back up and sync"}</div></div></div>`);
  main.appendChild(prof);

  main.appendChild(sectionHeader("Appearance",{small:true}));
  let g=el(`<div class="group"></div>`);
  const ar=el(`<div class="row with-lead"><span class="lead indigo">${icon("halfCircle")}</span><div class="body" style="display:flex;flex-direction:column;gap:10px"><div class="t">Theme</div></div></div>`);
  $(".body",ar).appendChild(segmented([["system","System"],["light","Light"],["dark","Dark"]],state.settings.theme||"system",v=>{ state.settings.theme=v; save("settings"); applyTheme(); }));
  g.appendChild(ar); main.appendChild(g);

  main.appendChild(sectionHeader("Training",{small:true}));
  g=el(`<div class="group"></div>`);
  const pr=el(`<div class="row with-lead"><span class="lead tint">${icon("person")}</span><div class="body" style="display:flex;flex-direction:column;gap:10px"><div class="t">Prescription</div></div></div>`);
  $(".body",pr).appendChild(segmented([["his","His · Mass"],["hers","Hers · Tone"]],state.settings.planVariant||"his",v=>{ state.settings.planVariant=v; save("settings"); })); g.appendChild(pr);
  const eqr=el(`<div class="row with-lead"><span class="lead orange">${icon("equipment")}</span><div class="body" style="display:flex;flex-direction:column;gap:10px"><div class="t">Equipment</div></div></div>`);
  $(".body",eqr).appendChild(segmented([["db","Dumbbell"],["combo","Combo"],["bb","Barbell"]],equipMode(),v=>{ state.settings.equipMode=v; save("settings"); })); g.appendChild(eqr);
  const ur=el(`<div class="row with-lead"><span class="lead teal">${icon("ruler")}</span><div class="body" style="display:flex;flex-direction:column;gap:10px"><div class="t">Weight unit</div></div></div>`);
  $(".body",ur).appendChild(segmented([["lb","Pounds"],["kg","Kilograms"]],state.settings.unit,v=>{ state.settings.unit=v; save("settings"); })); g.appendChild(ur);
  g.appendChild(switchRow("Deload this week",deloadActive(),on=>{ if(on!==deloadActive()) toggleDeload(); },{lead:"leaf",leadColor:"green",sub:"Working sets drop by a third until Monday"}));
  main.appendChild(g);

  main.appendChild(sectionHeader("Rest Timer",{small:true}));
  g=el(`<div class="group"></div>`);
  const rd=Number(state.settings.restDefault); const rdLabel=rd===-1?"Adaptive":rd===0?"Off":rd+"s";
  g.appendChild(valueRow("Rest between sets",rdLabel,()=>restTimerSheet(),{lead:"timer",leadColor:"blue"}));
  g.appendChild(switchRow("Sound when rest ends",state.settings.soundOn!==false,on=>{ state.settings.soundOn=on; save("settings"); if(on) beep(1); },{lead:"speaker",leadColor:"pink"}));
  g.appendChild(switchRow("Notify in the background",state.settings.notifyRest===true,async on=>{
    if(on){ if(!("Notification" in window)||!("serviceWorker" in navigator)){ toast("Notifications aren't supported here","warning"); render(); return; }
      let perm=Notification.permission; if(perm==="default"){ try{ perm=await Notification.requestPermission(); }catch(e){ perm="denied"; } }
      if(perm!=="granted"){ toast(perm==="denied"?"Allow notifications for Forge in system settings":"Notifications not enabled","warning"); state.settings.notifyRest=false; save("settings"); render(); return; } }
    state.settings.notifyRest=on; save("settings");
  },{lead:"bell",leadColor:"red"}));
  main.appendChild(g);

  main.appendChild(sectionHeader("During a Workout",{small:true}));
  g=el(`<div class="group"></div>`);
  g.appendChild(switchRow("Keep screen awake",state.settings.keepAwake!==false,on=>{ state.settings.keepAwake=on; save("settings"); if(on&&state.active&&peek().screen==="workout") acquireWake(); else if(!on) releaseWake(); },{lead:"sun",leadColor:"yellow"}));
  g.appendChild(switchRow("Ask how the workout felt",state.settings.askDifficulty!==false,on=>{ state.settings.askDifficulty=on; save("settings"); },{lead:"gauge",leadColor:"purple"}));
  main.appendChild(g);
  main.appendChild(el(`<div class="group-note">Dumbbells: enter the weight shown on one dumbbell. Barbell: the total loaded bar. Reps marked per side are entered per side; Forge counts the pair and both sides.</div>`));

  main.appendChild(sectionHeader("Barbell",{small:true}));
  g=el(`<div class="group"></div>`);
  g.appendChild(valueRow("Bar weight",`${configuredBarWeight()} lb`,()=>{ actionSheet("Bar weight",[{icon:"barbell",label:"45 lb",sub:"Standard plate math",run:()=>{ state.settings.barWeight=45; save("settings"); render(); }},{icon:"barbell",label:"44 lb",sub:"Exact 20 kg bar",run:()=>{ state.settings.barWeight=44; save("settings"); render(); }}]); },{lead:"barbell",leadColor:"gray"}));
  const plates=el(`<div class="row"><div class="body"><div class="t">Matched plate pairs</div><div class="d">Used by the plate calculator</div><div class="plate-grid" style="margin-top:12px"></div></div></div>`);
  const grid=$(".plate-grid",plates), pairs=platePairs();
  [45,35,25,10,5,2.5].forEach(wt=>{ const cell=el(`<div class="cell"><div class="l">${wt} lb</div></div>`); const val=el(`<span class="val">${Math.max(0,Number(pairs[wt])||0)}</span>`);
    const st=stepper(()=>{ const p=platePairs(); p[wt]=Math.max(0,(Number(p[wt])||0)-1); state.settings.platePairs=p; save("settings"); val.textContent=p[wt]; },()=>{ const p=platePairs(); p[wt]=(Number(p[wt])||0)+1; state.settings.platePairs=p; save("settings"); val.textContent=p[wt]; });
    st.insertBefore(val,st.lastElementChild); cell.appendChild(st); grid.appendChild(cell); });
  g.appendChild(plates); main.appendChild(g);

  main.appendChild(sectionHeader("Exercises",{small:true}));
  g=el(`<div class="group"></div>`);
  g.appendChild(linkRow("Exercise library",()=>{ _libTab="exercises"; setTab("library"); },{lead:"library",leadColor:"indigo",sub:`${state.exercises.length} movements · favorites, custom, how-tos`}));
  main.appendChild(g);

  main.appendChild(sectionHeader("Backup & Sync",{small:true}));
  g=el(`<div class="group"></div>`);
  const nf=el(`<div class="row with-lead"><span class="lead blue">${icon("cloud")}</span><div class="body"><div class="t">Home server</div><div class="d">Backs up to the Mac on your network and merges history between phones.</div><input class="input" style="margin-top:10px" placeholder="Sync name (e.g. his / hers)" value="${esc(name)}" autocapitalize="none" autocomplete="off"/></div></div>`);
  g.appendChild(nf);
  const brow=el(`<div class="row"><div class="body btn-row"></div></div>`);
  const connectB=el(`<button class="btn tinted sm">${name?"Update name":"Connect"}</button>`); connectB.onclick=()=>{ const n=$("input",nf).value.trim(); if(!/^[A-Za-z0-9_-]{1,40}$/.test(n)){ toast("Use letters, numbers, - or _","warning"); return; } connectSync(n); };
  $(".body",brow).appendChild(connectB);
  if(name){ const syncB=el(`<button class="btn gray sm">${icon("sync","sm")}<span>Sync now</span></button>`); syncB.onclick=async()=>{ const ok=await syncNow(); render(); toast(ok?"Synced & backed up":"Server unreachable",ok?"cloud":"warning"); }; $(".body",brow).appendChild(syncB); }
  g.appendChild(brow);
  if(name) g.appendChild(linkRow("Restore from backup",()=>forceRestore(),{lead:"download",leadColor:"gray",sub:"Replace this device with the server copy"}));
  main.appendChild(g);

  main.appendChild(sectionHeader("Data",{small:true}));
  g=el(`<div class="group"></div>`);
  g.appendChild(linkRow("Export backup file",exportData,{lead:"share",leadColor:"green",noChevron:true}));
  g.appendChild(linkRow("Import backup file",importData,{lead:"import",leadColor:"orange",noChevron:true}));
  if(!state.workouts.length) g.appendChild(linkRow("Load sample data",async()=>{ if(await confirmAct("Adds eight weeks of example workouts so you can explore the app. Erase all data removes it again.",{title:"Load sample data?",confirmText:"Load sample",danger:false})){ loadDemoData(); toast("Sample data loaded","sparkles"); popToRoot(); } },{lead:"sparkles",leadColor:"purple",noChevron:true,sub:"Explore with eight weeks of example training"}));
  g.appendChild(linkRow("Erase all data",async()=>{ if(await confirmAct("Every workout, routine and custom exercise on this device will be erased. This cannot be undone.",{title:"Erase all data?",confirmText:"Erase everything"})){ ["settings","exercises","routines","workouts","active","plan","bodyweights","deleted","seed_v1","seed_bw","seed_v2","seed_v3","seed_v4b","updatedAt","lastBackup","welcomed"].forEach(k=>localStorage.removeItem("forge_"+k)); location.reload(); } },{lead:"trash",leadColor:"red",noChevron:true,destructive:true}));
  main.appendChild(g);
  main.appendChild(el(`<div class="t-footnote muted center" style="padding:6px 20px 12px">Forge · your data lives on this device and your home server</div>`));
  app.appendChild(main);
}
function restTimerSheet(){
  const opts=[[-1,"Adaptive","By movement, equipment and target reps"],[0,"Off",""],[45,"45 seconds",""],[60,"60 seconds",""],[90,"90 seconds",""],[120,"2 minutes",""],[150,"2½ minutes",""],[180,"3 minutes",""]];
  const cur=Number(state.settings.restDefault);
  openSheet("Rest Between Sets",body=>{
    const list=el(`<div class="action-list"></div>`);
    opts.forEach(([v,l,s])=>{ const b=el(`<button class="action"><span class="ic">${icon(v===cur?"checkFill":"circle")}</span><span class="body"><span>${esc(l)}</span>${s?`<span class="sub">${esc(s)}</span>`:""}</span></button>`); b.onclick=()=>{ state.settings.restDefault=v; save("settings"); closeSheet(); render(); }; list.appendChild(b); });
    body.appendChild(list);
  });
}

/* ============================================================
   ONBOARDING (first launch only)
   ============================================================ */
function maybeOnboard(){
  if(DB.get("welcomed",false) || state.workouts.length || syncName()) return;
  if(document.querySelector(".sheet-bg")) return;
  openSheet("",body=>{
    body.classList.add("onboard");
    body.appendChild(el(`<div class="hero-mark">${icon("anvil")}</div><h2>Welcome to Forge</h2><p class="lead">A training log that knows your program, your rack and your pace.</p>`));
    [["ember","rings","Rings for the week","Sessions, sets and volume against your plan, closed one workout at a time."],["forest","sparkles","Numbers that suggest","Every set starts pre-filled from last time, nudged up when you earned it."],["ocean","cloud","Backed up at home","Sync to your own server. Nothing leaves your network."]]
      .forEach(([c,ic,t,d])=>body.appendChild(el(`<div class="feature"><span class="ic tile ${c}" style="width:40px;height:40px;padding:0;border-radius:12px;display:grid;place-items:center;box-shadow:none">${icon(ic)}</span><div><div class="t">${esc(t)}</div><div class="d">${esc(d)}</div></div></div>`)));
    const b=el(`<button class="btn primary block lg" style="margin-top:18px">Continue</button>`); b.onclick=()=>{ DB.set("welcomed",true); closeSheet(); }; body.appendChild(b);
  },()=>DB.set("welcomed",true));
  document.querySelector(".sheet-head").style.display="none";
}

/* ============================================================
   SAMPLE DATA — eight weeks of the program, for exploring
   ============================================================ */
function loadDemoData(){
  const variant=state.settings.planVariant||"his", wk=7*86400000, ws=weekStartTs(Date.now()), now=Date.now();
  const base={"DB Goblet Squat":50,"Flat DB Bench Press":45,"One-Arm DB Row":50,"DB Overhead Press":30,"Weighted Glute Bridge":50,"DB Anchored Russian Twist":20,"DB Romanian Deadlift":50,"Incline DB Press":40,"Chest Supported Row":40,"DB Lateral Raise":15,"DB Bicep Curl":25,"DB Plank Pull-Through":25,"Bulgarian Split Squat":30,"DB Bench Fly":25,"DB Renegade Row":30,"Overhead DB Tricep Extension":35,"DB Shrug":50,"DB 90-Degree Heel Tap":15,"DB Front Squat":40,"DB Floor Press":45,"Gorilla Row":45,"DB Push Press":35,"DB Hip Thrust":60,"Hollow Body Hold":0,"Heels-Elevated Goblet Squat":45,"Incline DB Squeeze Press":35,"Seal Row":40,"Leaning Lateral Raise":15,"Zottman Curl":20,"DB Wood Chop":20,"Single-Leg DB RDL":35,"DB Reverse Lunge":30,"DB Bent-Over Row":40,"Weighted Push-Up":25,"DB Skullcrusher":20,"Dead Bug":0};
  const seen={}, out=[];
  for(let wi=7;wi>=0;wi--){
    const start=ws-wi*wk, plan=WEEK_PLANS[cycleWeekOf(start)];
    [1,3,5].forEach((dow,di)=>{
      if(wi===3&&dow===3) return;                                   // one missed session for realism
      const end=start+(dow-1)*86400000+(17*60+30+di*7)*60000;
      if(end>now) return;
      const key=plan[dow], r=planRoutine(key,variant); if(!r) return;
      const bump=Math.floor((7-wi)/2);                               // add load every two weeks
      const exercises=r.exercises.map(re=>{
        const b=base[re.name]??30, unit=(re.muscle==="Arms"||re.muscle==="Shoulders"||re.muscle==="Core")?2.5:5;
        const weight=b?b+bump*unit:0, range=parseRepRange(re.reps)||{lo:10,hi:10};
        const reps=Math.min(range.hi,range.lo+((7-wi)%2)+ (range.hi>range.lo?1:0));
        const pr=weight>0&&(seen[re.name]===undefined||weight>seen[re.name]); seen[re.name]=Math.max(seen[re.name]||0,weight);
        return attachExerciseRef({id:uid(),name:re.name,muscle:re.muscle,target:re.reps,sets:Array.from({length:re.sets},(_,i)=>({weight:String(weight),reps:String(Math.max(1,reps-(i===re.sets-1?1:0))),done:true,pr:pr&&i===0}))},re.name);
      });
      const duration=(44+di*4+wi)*60000;
      out.push({id:uid(),name:r.name,start:end-duration,end,duration,exercises,notes:wi===0?"Felt strong. Bench moved fast.":"",deload:false,planKey:key,difficulty:["right","right","hard","easy"][(wi+di)%4],editedAt:end});
    });
  }
  state.workouts=out.sort((a,b)=>b.end-a.end); save("workouts");
  const bw=[]; const startW=U()==="kg"?86:190; for(let wi=8;wi>=0;wi--){ const ts=ws-wi*wk+86400000; if(ts>now) continue; bw.push({dateISO:isoOf(ts),weight:Math.round((startW-(8-wi)*0.4+((wi%3)-1)*0.3)*10)/10}); }
  state.bodyweights=bw; save("bodyweights");
  DB.set("welcomed",true);
}

/* ============================================================
   BOOT
   ============================================================ */
if(!state.exercises||!state.exercises.length){ state.exercises=DEFAULT_EXERCISES; save("exercises"); }
seedData();
applyTheme();
(function bootParams(){
  const q=new URLSearchParams(location.search);
  if(q.get("theme")){ state.settings.theme=q.get("theme"); applyTheme(); }
  if(q.get("demo")==="1"&&!state.workouts.length) loadDemoData();
  const s=q.get("screen");
  if(s==="workout"){ const {due}=planState(); const r=due?planRoutine(due.key,state.settings.planVariant||"his"):state.routines.find(x=>x.preset); if(r&&!state.active){ startFromRoutine(r.id,due&&due.key); } else if(state.active) nav.overlay="workout"; }
  else if(s==="history"||s==="trends"||s==="library"){ nav.tab=s; }
  else if(s==="settings"){ nav.stacks.summary.push({screen:"settings"}); }
  else if(s==="awards"){ nav.tab="trends"; nav.stacks.trends.push({screen:"awards"}); }
  else if(s==="detail"&&state.workouts.length){ nav.tab="history"; nav.stacks.history.push({screen:"history-detail",id:state.workouts[0].id}); }
  else if(s==="routine"){ const r=state.routines.find(x=>x.id==="preset-A-his"); if(r){ nav.tab="library"; nav.stacks.library.push({screen:"routine",id:r.id}); } }
  if(q.get("welcome")==="0") DB.set("welcomed",true);
})();
render();
// dev/preview only: ?log=1 with ?screen=workout shows the session mid-set with the rest timer running
if(new URLSearchParams(location.search).get("log")==="1"&&state.active&&state.active.exercises[0]){
  const ex=state.active.exercises[0], prev=lastPerformance(ex.name), pl=plannedFor(ex,0,prev,suggestNext(ex,prev));
  Object.assign(ex.sets[0],{weight:pl.w||"40",reps:pl.r||"8",done:true}); save("active"); render(); startRest(90);
}
if(syncName()) syncNow();
if("serviceWorker" in navigator && document.querySelector('meta[name="forge-sw"]')){
  let _refreshing=false;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{ if(_refreshing) return; _refreshing=true; if(state.active&&peek().screen==="workout"){ _refreshing=false; return; } location.reload(); });
  window.addEventListener("load",()=>{ navigator.serviceWorker.register("sw.js").then(reg=>{ reg.update(); setInterval(()=>reg.update(),60*60*1000); }).catch(()=>{}); });
}
