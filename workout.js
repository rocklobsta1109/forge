"use strict";
/* ============================================================
   Live workout — one exercise in focus, a single Log Set action,
   steppers for weight and reps, and the rest countdown living in
   the floating glass bar. Everything here writes through
   state.active and save("active") exactly as before.
   ============================================================ */

const DIFFICULTY={easy:{label:"Easy",color:"var(--green)"},right:{label:"About right",color:"var(--orange)"},hard:{label:"Hard",color:"var(--red)"}};
function difficultyText(v){ const d=DIFFICULTY[v]; return d?d.label:""; }

function currentExerciseIndex(w){
  const n=w.exercises.length; if(!n){ w.cur=0; return 0; }
  if(!Number.isInteger(w.cur)||w.cur<0||w.cur>=n){ const i=w.exercises.findIndex(e=>e.sets.some(s=>!s.done)); w.cur=i<0?0:i; }
  return w.cur;
}
function setCurrentExercise(i){ const w=state.active; if(!w) return; w.cur=i; _focusEx=i; save("active"); render(); }
function advanceExercise(ei){
  const w=state.active, n=w.exercises.length;
  for(let k=1;k<n;k++){ const j=(ei+k)%n; if(w.exercises[j].sets.some(s=>!s.done)){ w.cur=j; _focusEx=j; return true; } }
  return false;
}
function nextSetIndex(ex){ return ex.sets.findIndex(s=>!s.done); }
function isBodyweightEx(ex){ const lib=exerciseByRef(ex); return !!lib && (lib.equipment==="bodyweight"||lib.equipment==="pullup"); }
function cleanNote(t){ return String(t||"").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\uFE0F?\s*/gu,"").replace(/\s{2,}/g," ").trim(); }
function prettyName(name){ return String(name||"Workout").replace(/\s*\((?:His · Mass|Hers · Tone)\)$/,"").replace(/^Workout [A-F] — /,"").trim(); }
function setLabel(s){ const wt=s.weight!==""?fmtNum(Number(s.weight)):null, r=s.reps!==""?s.reps:null;
  if(wt!==null&&r!==null) return `${wt} ${U()} × ${r}`; if(r!==null) return `${r} reps`; if(wt!==null) return `${wt} ${U()}`; return ""; }

/* Planned numbers for a set that has not been logged: this session's last logged set wins,
   then the progression suggestion, then last time's matching set, then the target rep range. */
function plannedFor(ex, si, prevSets, sug){
  const pv=prevSets&&prevSets[si], range=parseRepRange(ex.target);
  let w=pv?String(fmtNum(pv.weight)):"", r=pv?String(pv.reps):(range?String(range.lo):"");
  if(sug&&sug.type==="weight"){ w=String(fmtNum(sug.weight)); r=String(sug.reps); }
  else if(sug&&sug.type==="reps"&&pv){ const n=Math.min((Number(pv.reps)||0)+1,sug.hi); if(n>0) r=String(n); }
  else if(sug&&sug.type==="time"&&pv){ r=String((Number(pv.reps)||0)+sug.add); }
  const prior=[...ex.sets.slice(0,si)].reverse().find(s=>s.done);
  if(prior){ if(prior.weight!=="") w=String(fmtNum(Number(prior.weight))); if(prior.reps!==""&&!(sug&&sug.type==="weight"&&si===0)) r=String(prior.reps); }
  if(isBodyweightEx(ex)&&w==="") w="0";
  return {w,r};
}

/* ---------- screen ---------- */
function renderWorkout(app){
  const w=state.active; if(!w){ setTab("summary"); return; }
  if(!w.date) w.date=todayISO();
  currentExerciseIndex(w);
  const menu=navButton("ellipsis",null,openWorkoutMenu,{aria:"Workout options"});
  app.appendChild(navBar({title:prettyName(w.name), large:false, back:true, backIcon:"chevronDown", backAria:"Minimize workout", onBack:minimizeWorkout, actions:[menu]}));
  const main=el(`<main class="screen"></main>`);
  main.appendChild(el(`<div class="eyebrow" style="margin:10px 20px 10px">${esc(fmtDay(isoToTs(w.date)))}${w.planKey?" · Workout "+esc(w.planKey):""}${w.deload?" · Deload":""}</div>`));
  main.appendChild(el(`<div class="wk-metrics"><div class="m tint"><div class="v" id="wkTimer">0:00</div><div class="l">Elapsed</div></div><div class="m"><div class="v" id="wkSets"></div><div class="l">Sets</div></div><div class="m"><div class="v" id="wkVol"></div><div class="l">${esc(U())} volume</div></div></div>`));
  if(w.note){
    const note=el(`<div class="callout tint note collapsed" role="note">${icon("flame")}<div class="body"></div><span class="chev">${icon("chevronDown","sm")}</span></div>`);
    const full=cleanNote(w.note); $(".body",note).textContent=full;
    note.style.cursor="pointer"; note.onclick=()=>note.classList.toggle("collapsed");
    main.appendChild(note);
  }
  if(w.deload) main.appendChild(el(`<div class="callout green">${icon("leaf")}<div class="body"><b>Deload session</b> · working sets were reduced; keep every rep crisp and leave plenty in reserve.</div></div>`));

  if(!w.exercises.length){
    main.appendChild(emptyState("dumbbell","No exercises yet","Add a movement to start logging sets.",{label:"Add exercise",icon:"plus",run:()=>addExercisesToWorkout()}));
  } else {
    main.appendChild(exerciseCard(w.exercises[w.cur], w.cur));
    const others=w.exercises.map((ex,i)=>({ex,i})).filter(o=>o.i!==w.cur);
    if(others.length){
      main.appendChild(sectionHeader("Exercises",{small:true}));
      const g=el(`<div class="group upnext"></div>`);
      others.forEach(({ex,i})=>{
        const done=ex.sets.filter(s=>s.done).length, total=ex.sets.length, full=total>0&&done===total;
        const row=el(`<button class="row tappable with-lead ${full?"done":""}" data-ei="${i}"><span class="letter-badge sm ${full?"green":"gray"}">${full?icon("check","sm"):i+1}</span><div class="body"><div class="t">${esc(ex.name)}</div><div class="d">${ex.target?esc(`${total} × ${ex.target}`):`${total} set${total!==1?"s":""}`}${(()=>{ const l=[...ex.sets].reverse().find(s=>s.done); return l?" · last "+esc(setLabel(l)):""; })()}</div></div><span class="trail"><span class="prog ${full?"full":""}">${done}/${total}</span>${icon("chevronRight","chev")}</span></button>`);
        row.onclick=()=>setCurrentExercise(i); g.appendChild(row);
      });
      main.appendChild(g);
    }
  }
  if(w.exercises.length){ const add=el(`<div style="padding:0 16px 14px"><button class="btn tinted block">${icon("plus","sm")}<span>Add exercise</span></button></div>`);
    $("button",add).onclick=()=>addExercisesToWorkout(); main.appendChild(add); }
  const notes=el(`<div class="card" style="padding:14px 16px"><div class="eyebrow" style="margin-bottom:8px">Session note</div><textarea class="input" rows="2" placeholder="Energy, soreness, what to remember…">${esc(w.notes||"")}</textarea></div>`);
  $("textarea",notes).oninput=e=>{ w.notes=e.target.value; save("active"); }; main.appendChild(notes);
  app.appendChild(main);
  const bar=workoutBar(); app.appendChild(bar); paintWorkoutBar(bar);
  paintMetrics(); startTimer(); acquireWake();
}
function addExercisesToWorkout(){
  const w=state.active; if(!w) return;
  openPicker(sel=>{
    const first=w.exercises.length;
    sel.forEach(e=>w.exercises.push(attachExerciseRef({id:uid(),name:e.name,muscle:e.muscle,sets:[{weight:"",reps:"",done:false},{weight:"",reps:"",done:false},{weight:"",reps:"",done:false}]},e.name)));
    const cur=w.exercises[w.cur]; if(sel.length&&(!cur||cur.sets.every(x=>x.done))){ w.cur=first; _focusEx=first; }
    save("active"); render();
  });
}
function paintMetrics(){
  const w=state.active; if(!w) return;
  const p=workoutSetProgress(w), s=document.getElementById("wkSets"), v=document.getElementById("wkVol");
  if(s) s.innerHTML=`${p.done}<small>/${p.total}</small>`;
  if(v) v.textContent=fmtNum(workoutVolume(w)).toLocaleString();
}

/* ---------- the focused exercise card ---------- */
function exerciseCard(ex, ei){
  const w=state.active, lib=exerciseByRef(ex);
  const card=el(`<section class="exercise-card" data-ei="${ei}" aria-label="${esc(ex.name)}"></section>`);
  const head=el(`<div class="head"><div class="body"><div class="name">${esc(ex.name)}</div><div class="meta"></div></div></div>`);
  const meta=$(".meta",head);
  meta.appendChild(el(`<span class="chip tint">${icon("target","xs")}<span>${esc(ex.target?`${ex.sets.length} × ${ex.target}`:`${ex.sets.length} set${ex.sets.length!==1?"s":""}`)}</span></span>`));
  if(ex.muscle) meta.appendChild(el(`<span class="chip">${esc(ex.muscle)}</span>`));
  if(lib&&lib.equipment) meta.appendChild(el(`<span class="chip">${icon(equipmentIconName(lib.equipment),"xs")}<span>${esc(EQUIP_SHORT[lib.equipment]||lib.equipment)}</span></span>`));
  head.appendChild(infoButton(ex.name));
  const more=el(`<button class="info-btn" aria-label="Options for ${esc(ex.name)}">${icon("ellipsis")}</button>`); more.onclick=()=>openExerciseMenu(ei); head.appendChild(more);
  card.appendChild(head);

  const prevSets=lastPerformance(ex.name), sug=suggestNext(ex,prevSets);
  if(sug) card.appendChild(el(`<div class="tip">${icon("sparkles")}<span>${esc(sug.text)}</span></div>`));
  else if(prevSets) card.appendChild(el(`<div class="tip" style="background:var(--fill-2)">${icon("history")}<span>Last time · ${esc(prevSets.map(s=>(Number(s.weight)?fmtNum(s.weight)+"×":"")+s.reps).join(" · "))}</span></div>`));
  if(ex.note) card.appendChild(el(`<div class="cue">${esc(ex.note)}</div>`));
  const my=personalCueFor(ex.name); if(my) card.appendChild(el(`<div class="mycue">${icon("person")}<span>${esc(my)}</span></div>`));

  const active=nextSetIndex(ex);
  const list=el(`<div class="sets" role="list"></div>`);
  ex.sets.forEach((s,si)=>{
    const pv=prevSets&&prevSets[si];
    if(s.done){
      const row=el(`<button class="set done" role="listitem" aria-label="Set ${si+1}, ${esc(setLabel(s))}, logged. Tap to edit."><span class="n">${icon("check")}</span><span class="v">${s.weight!==""?`${fmtNum(Number(s.weight))}<small>${esc(U())}</small>`:""}${s.weight!==""&&s.reps!==""?`<span class="sep">×</span>`:""}${s.reps!==""?`${esc(s.reps)}`:""}</span><span class="s">${s.pr?`<span class="pr-badge">${icon("trophy")}PR</span>`:""}</span></button>`);
      row.onclick=()=>editSetSheet(ei,si); list.appendChild(row);
    } else if(si===active){
      list.appendChild(el(`<div class="set active" role="listitem"><span class="n">${si+1}</span><span class="v">Up next</span><span class="s">${pv?`Last ${esc(fmtNum(pv.weight))}×${esc(pv.reps)}`:""}</span></div>`));
    } else {
      const pl=plannedFor(ex,si,prevSets,sug);
      list.appendChild(el(`<div class="set planned" role="listitem"><span class="n">${si+1}</span><span class="v">${pl.w!==""&&pl.w!=="0"?`${esc(pl.w)}<small>${esc(U())}</small><span class="sep">×</span>`:""}${esc(pl.r||"–")}</span><span class="s">planned</span></div>`));
    }
  });
  card.appendChild(list);

  if(active>=0){
    const s=ex.sets[active], pl=plannedFor(ex,active,prevSets,sug);
    const bw=isBodyweightEx(ex);
    const entry=el(`<div class="entry"></div>`);
    const wF=el(`<div class="fld"><div class="lbl">${esc(U())}${bw?" · added":""}</div><div class="ctl"><button class="step" aria-label="Decrease weight">${icon("minus")}</button><input inputmode="decimal" aria-label="Weight in ${esc(U())}" placeholder="${esc(pl.w||"0")}" value="${esc(s.weight!==""?s.weight:pl.w)}"/><button class="step" aria-label="Increase weight">${icon("plus")}</button></div></div>`);
    const rF=el(`<div class="fld"><div class="lbl">${/s$/.test(String(ex.target||""))?"Seconds":"Reps"}</div><div class="ctl"><button class="step" aria-label="Decrease reps">${icon("minus")}</button><input inputmode="numeric" aria-label="Reps" placeholder="${esc(pl.r||"0")}" value="${esc(s.reps!==""?s.reps:pl.r)}"/><button class="step" aria-label="Increase reps">${icon("plus")}</button></div></div>`);
    const wIn=$("input",wF), rIn=$("input",rF), inc=progressIncrement(ex);
    const cur=(inp)=>{ const v=parseFloat(inp.value); return Number.isFinite(v)?v:(parseFloat(inp.placeholder)||0); };
    const setW=v=>{ v=Math.max(0,Math.round(v*100)/100); wIn.value=String(fmtNum(v)); s.weight=wIn.value; save("active"); };
    const setR=v=>{ v=Math.max(0,Math.round(v)); rIn.value=String(v); s.reps=rIn.value; save("active"); };
    const [wm,wp]=wF.querySelectorAll(".step"), [rm,rp]=rF.querySelectorAll(".step");
    wm.onclick=()=>setW(cur(wIn)-inc); wp.onclick=()=>setW(cur(wIn)+inc); rm.onclick=()=>setR(cur(rIn)-1); rp.onclick=()=>setR(cur(rIn)+1);
    wIn.oninput=()=>{ s.weight=wIn.value; save("active"); }; rIn.oninput=()=>{ s.reps=rIn.value; save("active"); };
    wIn.onfocus=rIn.onfocus=e=>e.target.select();
    entry.append(wF,rF); card.appendChild(entry);
    const log=el(`<button class="btn primary block lg log-btn">${icon("check")}<span>Log Set ${active+1}</span></button>`);
    log.onclick=()=>logSet(ei,active,wIn,rIn); card.appendChild(log);
  } else if(ex.sets.length){
    card.appendChild(el(`<div class="callout green" style="margin:14px 0 0">${icon("checkCircle")}<div class="body"><b>All ${ex.sets.length} sets logged.</b> Pick the next exercise below, or add a set.</div></div>`));
  }
  const addSet=el(`<button class="btn plain sm add-set">${icon("plus","sm")}<span>Add set</span></button>`);
  addSet.onclick=()=>{ const last=ex.sets[ex.sets.length-1]; ex.sets.push({weight:"",reps:"",done:false}); if(last&&last.done){} save("active"); replaceCard(ei); paintMetrics(); paintWorkoutBar(); };
  card.appendChild(addSet);
  return card;
}
function replaceCard(ei){
  const w=state.active; const old=document.querySelector(".exercise-card"); if(!old||!w||!w.exercises[ei]) { render(); return; }
  old.replaceWith(exerciseCard(w.exercises[ei],ei));
}
function logSet(ei, si, wIn, rIn){
  const w=state.active; const ex=w.exercises[ei]; const s=ex.sets[si]; if(!s||s.done) return;
  const wv=wIn.value.trim()!==""?wIn.value.trim():wIn.placeholder, rv=rIn.value.trim()!==""?rIn.value.trim():rIn.placeholder;
  s.weight=Number.isFinite(parseFloat(wv))?String(fmtNum(parseFloat(wv))):""; s.reps=Number.isFinite(parseFloat(rv))?String(Math.round(parseFloat(rv))):"";
  if(s.weight===""&&s.reps===""){ toast("Enter reps to log this set","warning"); rIn.focus(); return; }
  s.done=true;
  unlockAudio();
  const hb=historicalBest(ex.name), e1=epley(s.weight,s.reps), wt=Number(s.weight)||0;
  s.pr = hb.e>0 && ((e1>hb.e+0.001) || (wt>hb.w));
  if(s.pr){ toast("New record · "+ex.name,"trophy"); if(navigator.vibrate) navigator.vibrate([60,40,120]); }
  else if(navigator.vibrate) navigator.vibrate(30);
  const rest=restSecondsFor(ex); if(rest>0) startRest(rest);
  let advanced=false;
  if(ex.sets.every(x=>x.done)){ advanced=advanceExercise(ei); if(!advanced&&!s.pr) toast("All sets logged · finish when you're ready","checkCircle"); }
  save("active");
  if(advanced){ render(); return; }
  replaceCard(ei); paintMetrics(); paintWorkoutBar();
}
function editSetSheet(ei, si){
  const w=state.active; const ex=w.exercises[ei]; const s=ex.sets[si]; if(!s) return;
  openSheet(`Set ${si+1} · ${ex.name}`, body=>{
    const wF=el(`<div class="field"><label>Weight (${esc(U())})</label><input class="input" inputmode="decimal" value="${esc(s.weight)}"/></div>`);
    const rF=el(`<div class="field"><label>Reps</label><input class="input" inputmode="numeric" value="${esc(s.reps)}"/></div>`);
    body.append(wF,rF);
    const acts=el(`<div class="stack"></div>`);
    const upd=el(`<button class="btn primary block">Update set</button>`);
    upd.onclick=()=>{ s.weight=$("input",wF).value.trim(); s.reps=$("input",rF).value.trim(); const hb=historicalBest(ex.name); s.pr=false; save("active"); closeSheet(); replaceCard(ei); paintMetrics(); };
    const undo=el(`<button class="btn gray block">Mark as not done</button>`);
    undo.onclick=()=>{ s.done=false; s.pr=false; save("active"); closeSheet(); replaceCard(ei); paintMetrics(); paintWorkoutBar(); };
    const del=el(`<button class="btn destructive tinted block">Delete set</button>`);
    del.onclick=()=>{ if(ex.sets.length>1){ ex.sets.splice(si,1); } else { s.done=false; s.weight=""; s.reps=""; } save("active"); closeSheet(); replaceCard(ei); paintMetrics(); paintWorkoutBar(); };
    acts.append(upd,undo,del); body.appendChild(acts);
  });
}

/* ---------- floating bar: rest countdown or what's next, plus Finish ---------- */
function workoutBar(){
  const bar=el(`<div class="wkbar glass" id="wkBar"><div class="mid" id="wkMid"></div></div>`);
  const finish=el(`<button class="btn green finish" aria-label="Finish workout">${icon("check")}</button>`);
  finish.onclick=()=>finishWorkout(); bar.appendChild(finish);
  return bar;
}
function paintWorkoutBar(bar=document.getElementById("wkBar")){
  const w=state.active; if(!bar||!w) return;
  const mid=$("#wkMid",bar);
  if(restInt){
    const left=Math.max(0,Math.ceil((restEnd-Date.now())/1000)), p=restTotal?Math.max(0,Math.min(1,left/restTotal)):0;
    if(mid.dataset.mode!=="rest"){
      mid.dataset.mode="rest";
      mid.innerHTML=`<div class="rest-ring">${smallRing(1,"var(--tint)")}${icon("timer")}</div><div class="rest-text"><div class="rest-lbl">Rest</div><div class="rest-time" id="restTime" role="timer" aria-live="off"></div></div><div class="ctl"><button class="btn gray sm" id="restPlus" aria-label="Add 30 seconds">+30</button><button class="btn gray sm" id="restSkip" aria-label="Skip rest">Skip</button></div>`;
      $("#restPlus",mid).onclick=()=>{ restEnd+=30000; restTotal+=30; paintWorkoutBar(); };
      $("#restSkip",mid).onclick=()=>stopRest();
      bar.classList.add("resting");
    }
    $("#restTime",mid).textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,"0")}`;
    const prog=$(".rest-ring .prog",mid); if(prog){ const c=parseFloat(prog.getAttribute("stroke-dasharray")); prog.style.strokeDashoffset=(c*(1-p)).toFixed(2); }
  } else {
    bar.classList.remove("resting");
    const ex=w.exercises[w.cur]; const si=ex?nextSetIndex(ex):-1;
    const allDone=w.exercises.length>0&&w.exercises.every(e=>e.sets.every(s=>s.done));
    if(mid.dataset.mode!=="next"){ mid.dataset.mode="next"; mid.innerHTML=`<div class="upnext"><div class="l" id="nextL"></div><div class="n" id="nextN"></div></div>`; }
    $("#nextL",mid).textContent= allDone?"Done":(si>=0?`Set ${si+1} of ${ex.sets.length}`:"Up next");
    $("#nextN",mid).textContent= allDone?"All sets logged":(ex?ex.name:"Add an exercise");
  }
}

/* ---------- menus and tools ---------- */
function openWorkoutMenu(){
  const w=state.active; if(!w) return;
  actionSheet("Workout",[
    {icon:"pencil",label:"Edit name & date",run:openWorkoutDetails},
    w.exercises.some(ex=>altsFor(ex.name).length)&&{icon:"shuffle",label:"Shuffle all movements",sub:"Same patterns, fresh variations",run:shuffleAllExercises},
    {icon:"plus",label:"Add exercise",run:addExercisesToWorkout},
    {icon:"trash",label:"Discard workout",destructive:true,run:async()=>{
      if(await confirmAct("Nothing from this session will be saved.",{title:"Discard this workout?",confirmText:"Discard workout"})){
        state.active=null; save("active"); stopTimer(); stopRest(); setTab("summary"); }
    }},
  ],{subtitle:`${prettyName(w.name)} · ${fmtDate(isoToTs(w.date||todayISO()))}`});
}
function openWorkoutDetails(){
  const w=state.active; if(!w) return;
  openSheet("Session details",body=>{
    const nameF=el(`<div class="field"><label>Workout name</label><input class="input" value="${esc(w.name||"")}" placeholder="Workout name"/></div>`);
    const dateF=el(`<div class="field"><label>Date</label><input class="input" type="date" value="${esc(w.date||todayISO())}" max="${todayISO()}"/></div>`);
    body.append(nameF,dateF);
    const saveB=el(`<button class="btn primary block">Save</button>`);
    saveB.onclick=()=>{ w.name=$("input",nameF).value.trim()||"Workout"; w.date=$("input",dateF).value||todayISO(); save("active"); closeSheet(); render(); };
    body.appendChild(saveB);
  });
}
function openExerciseMenu(ei){
  const w=state.active; const ex=w.exercises[ei]; const canSwap=altsFor(ex.name).length>0, bb=isBarbell(ex);
  const swapCur=(a,b)=>{ if(w.cur===a) w.cur=b; else if(w.cur===b) w.cur=a; };
  actionSheet(ex.name,[
    {icon:"book",label:"How to perform",run:()=>openExerciseInfo(ex.name)},
    bb&&{icon:"flame",label:"Warm-up sets",run:()=>openWarmup(ex)},
    bb&&{icon:"plate",label:"Plate calculator",run:()=>openPlateCalculator(ex)},
    canSwap&&{icon:"swap",label:"Swap movement",sub:patternLabel(ex.name)||"",run:()=>openSwap(ei)},
    canSwap&&{icon:"shuffle",label:"Shuffle this movement",run:()=>shuffleExercise(ei)},
    {icon:"plus",label:"Add a set",run:()=>{ ex.sets.push({weight:"",reps:"",done:false}); save("active"); render(); }},
    ex.sets.length>1&&{icon:"minus",label:"Remove last set",run:()=>{ ex.sets.pop(); save("active"); render(); }},
    ei>0&&{icon:"chevronUp",label:"Move up",run:()=>{ [w.exercises[ei-1],w.exercises[ei]]=[w.exercises[ei],w.exercises[ei-1]]; swapCur(ei,ei-1); save("active"); render(); }},
    ei<w.exercises.length-1&&{icon:"chevronDown",label:"Move down",run:()=>{ [w.exercises[ei+1],w.exercises[ei]]=[w.exercises[ei],w.exercises[ei+1]]; swapCur(ei,ei+1); save("active"); render(); }},
    {icon:"trash",label:"Remove exercise",destructive:true,run:()=>{ w.exercises.splice(ei,1); save("active"); render(); }},
  ]);
}
function openWarmup(ex){
  let work=suggestedWorkingWeight(ex);
  openSheet("Warm-up sets",body=>{
    body.appendChild(el(`<div class="confirm-msg" style="margin-top:-4px">${esc(ex.name)} · advisory ramp only, not logged as working sets.</div>`));
    const field=el(`<div class="field"><label>Working weight (${esc(U())})</label><input class="input" inputmode="decimal" value="${esc(fmtNum(work))}"/></div>`);
    body.appendChild(field); const out=el(`<div class="card"></div>`); body.appendChild(out);
    const draw=()=>{ work=Number($("input",field).value)||configuredBarWeight(); const steps=warmupSetsFor(ex,work); out.innerHTML="";
      steps.forEach((s,i)=>out.appendChild(el(`<div class="kv"><span>${i===0?"Empty bar":"Warm-up "+i}</span><b>${fmtNum(s.weight)} ${esc(U())} × ${s.reps}</b></div>`)));
      out.appendChild(el(`<div class="kv"><span style="color:var(--tint);font-weight:600">Working sets</span><b style="color:var(--tint)">${fmtNum(work)} ${esc(U())}</b></div>`)); };
    $("input",field).oninput=draw; draw();
  });
}
function openPlateCalculator(ex){
  let target=suggestedWorkingWeight(ex);
  openSheet("Plate calculator",body=>{
    body.appendChild(el(`<div class="confirm-msg" style="margin-top:-4px">${esc(ex.name)} · uses your bar and plate pairs from Settings.</div>`));
    if(U()!=="lb"){ body.appendChild(el(`<div class="callout orange">${icon("warning")}<div class="body">Switch the weight unit to lb in Settings to use your plate inventory.</div></div>`)); return; }
    const field=el(`<div class="field"><label>Total bar weight (lb)</label><input class="input" inputmode="decimal" value="${esc(fmtNum(target))}"/></div>`);
    body.appendChild(field); const out=el(`<div></div>`); body.appendChild(out);
    const draw=()=>{ target=Number($("input",field).value)||0; const p=platePlan(target); out.innerHTML="";
      if(p.error){ out.appendChild(el(`<div class="callout orange">${icon("warning")}<div class="body">${esc(p.error)}</div></div>`)); return; }
      out.appendChild(el(`<div class="card"><div class="eyebrow">Each side</div><div class="lead-title" style="margin-top:4px">${esc(p.text)}</div><div class="muted t-footnote" style="margin-top:6px">${fmtNum(p.bar)} lb bar + ${fmtNum(p.per)} lb per side = ${fmtNum(target)} lb</div></div>`)); };
    $("input",field).oninput=draw; draw();
  });
}
function openSwap(ei){
  const w=state.active; const ex=w.exercises[ei]; const alts=altsFor(ex.name); const lbl=patternLabel(ex.name);
  let eqFilter="all";
  const apply=o=>{ ex.name=o.name; ex.muscle=o.muscle; ex.note=""; attachExerciseRef(ex,o.name); save("active"); closeSheet(); render(); toast("Swapped in "+o.name,"swap"); };
  openSheet("Swap movement",body=>{
    if(lbl) body.appendChild(el(`<div class="confirm-msg" style="margin-top:-4px">Same target and motion · <b>${esc(lbl)}</b></div>`));
    const subs=suggestedSubs(ex.name);
    if(subs.length){
      body.appendChild(sectionHeader("Suggested",{small:true}));
      const g=el(`<div class="group"></div>`);
      subs.forEach(o=>{ const r=el(`<button class="row tappable"><div class="body"><div class="t">${esc(o.name)}</div><div class="d">${esc(o.reason)}</div></div><span class="trail"><span class="chip">${esc(EQUIP_SHORT[o.equipment]||"")}</span>${icon("chevronRight","chev")}</span></button>`); r.onclick=()=>apply(o); g.appendChild(r); });
      body.appendChild(g);
    }
    body.appendChild(sectionHeader("All alternatives",{small:true}));
    body.appendChild(equipFilterChips(eqFilter,v=>{ eqFilter=v; draw(); },{inSheet:true}));
    const g=el(`<div class="group"></div>`); body.appendChild(g);
    function draw(){
      g.innerHTML="";
      const shown=alts.filter(a=>eqFilter==="all"||a.equipment===eqFilter);
      shown.forEach(a=>{ const r=el(`<button class="row tappable"><div class="body"><div class="t">${esc(a.name)}</div><div class="d">${esc(a.muscle||"")}${a.difficulty?" · "+esc(a.difficulty):""}</div></div><span class="trail"><span class="chip">${esc(EQUIP_SHORT[a.equipment]||"")}</span>${icon("chevronRight","chev")}</span></button>`); r.onclick=()=>apply(a); g.appendChild(r); });
      if(!shown.length) g.appendChild(el(`<div class="row"><div class="body"><div class="d">No alternates with that equipment.</div></div></div>`));
    }
    draw();
  });
}

/* ---------- completion summary ---------- */
function openWorkoutSummary(finished, prs){
  const muscles={}; finished.exercises.forEach(ex=>{ muscles[ex.muscle||"Other"]=(muscles[ex.muscle||"Other"]||0)+ex.sets.length; });
  const plan=plannedWeeklySets(state.settings.planVariant||"his"), ws=weekStartTs(Date.now()), weekly=setsByMuscleBetween(ws,ws+7*86400000);
  const planTotal=Object.values(plan).reduce((a,b)=>a+b,0), weekTotal=Object.keys(plan).reduce((n,k)=>n+(weekly[k]||0),0);
  const newAwards=computeAwards().filter(a=>a.earned&&a.workoutId===finished.id);
  openSheet("Workout Complete",body=>{
    body.appendChild(el(`<div class="sheet-hero"><div class="mark ${prs?"pr":""} pop">${icon(prs?"trophy":"check")}</div><h2>${esc(prettyName(finished.name))}</h2><p>${esc(fmtDay(finished.end))}${prs?` · ${prs} personal record${prs!==1?"s":""}`:""}</p></div>`));
    body.appendChild(el(`<div class="metrics inline strip" style="margin-bottom:14px"><div class="metric"><div class="v">${esc(fmtDur(finished.duration))}</div><div class="l">Duration</div></div><div class="metric"><div class="v">${workoutSets(finished)}</div><div class="l">Sets</div></div><div class="metric tint"><div class="v">${esc(fmtNum(workoutVolume(finished)).toLocaleString())}</div><div class="l">${esc(U())} volume</div></div></div>`));
    if(newAwards.length){
      body.appendChild(sectionHeader(newAwards.length===1?"New Award":"New Awards",{small:true}));
      const row=el(`<div class="medals" style="padding-left:0;padding-right:0;justify-content:center"></div>`);
      newAwards.forEach(a=>{ const m=el(`<button class="medal pop"><span>${medallion(a.glyph,a.colors[0],a.colors[1],true)}</span><div class="t">${esc(a.title)}</div></button>`); m.onclick=()=>awardSheet(a); row.appendChild(m); });
      body.appendChild(row);
    }
    body.appendChild(sectionHeader("Muscle groups",{small:true}));
    const box=el(`<div class="card"></div>`);
    Object.entries(muscles).sort((a,b)=>b[1]-a[1]).forEach(([mg,n])=>box.appendChild(el(`<div class="kv"><span>${esc(mg)}</span><b>${n} set${n!==1?"s":""}</b></div>`)));
    body.appendChild(box);
    body.appendChild(el(`<div class="callout blue">${icon("target")}<div class="body"><b>Weekly plan · ${weekTotal} / ${planTotal} sets.</b> Your muscle-volume targets already include this workout${deloadActive()?" and this week's deload adjustment":""}.</div></div>`));
    if(state.settings.askDifficulty!==false){
      body.appendChild(sectionHeader("How did that feel?",{small:true}));
      body.appendChild(segmented(Object.entries(DIFFICULTY).map(([k,d])=>[k,d.label]), finished.difficulty||"", v=>{ finished.difficulty=v; finished.editedAt=Date.now(); save("workouts"); },{cls:"lg"}));
    }
    body.appendChild(sectionHeader("Session note",{small:true}));
    const notes=el(`<textarea class="input" rows="2" placeholder="Energy, soreness, what to remember…">${esc(finished.notes||"")}</textarea>`);
    notes.onchange=()=>{ finished.notes=notes.value.trim(); finished.editedAt=Date.now(); save("workouts"); }; body.appendChild(notes);
    const done=el(`<button class="btn primary block lg" style="margin-top:16px">Done</button>`);
    done.onclick=()=>{ finished.notes=notes.value.trim(); finished.editedAt=Date.now(); save("workouts"); closeSheet(); render(); }; body.appendChild(done);
  });
}
