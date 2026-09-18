"use strict";
/* ============================================================
   Forge core — data model, program logic, sync.
   Lifted verbatim from the single-file app so stored data, the
   home-server backup format and the training program behave
   exactly as before. UI-facing calls (render, toast, confirmAct,
   openSheet, go, setTab, stopTimer, stopRest, openWorkoutSummary,
   peek) are provided by ui.js / workout.js / screens.js.
   ============================================================ */

/* ==================== Storage, identity, exercise library, programs, presets, movement pools, equipment, plates, mode mapping, seeding, plan rotation, state, sync, wake lock, audio, notifications, PR detection ==================== */
"use strict";
/* ============================================================
   Forge — workout tracker (vanilla JS PWA)
   ============================================================ */

/* ---------- Storage ---------- */
const DB = {
  get(k, def){ try{ const v = localStorage.getItem("forge_"+k); return v===null?def:JSON.parse(v);}catch(e){return def;} },
  set(k, v){ localStorage.setItem("forge_"+k, JSON.stringify(v)); }
};
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7);

/* Stable exercise identity. Display names can change; keys keep routines and history joined. */
const EXERCISE_ALIASES={
  "Incline Dumbbell Press":"Incline DB Press",
  "Dumbbell Shoulder Press":"DB Overhead Press",
  "Lateral Raise":"DB Lateral Raise",
  "Dumbbell Curl":"DB Bicep Curl",
};
function canonicalExerciseName(name){
  let n=String(name||"").trim(), seen=new Set();
  while(EXERCISE_ALIASES[n]&&!seen.has(n)){ seen.add(n); n=EXERCISE_ALIASES[n]; }
  return n;
}
function exerciseSlug(name){ return canonicalExerciseName(name).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
function canonicalExerciseKey(name){ return "ex:"+exerciseSlug(name); }

/* ---------- Default exercise library ---------- */
const DEFAULT_EXERCISES = [
  ["Barbell Bench Press","Chest"],["Push-Up","Chest"],
  ["Cable Fly","Chest"],["Dip","Chest"],
  ["Back Squat","Legs"],["Front Squat","Legs"],["Leg Press","Legs"],["Romanian Deadlift","Legs"],
  ["Leg Extension","Legs"],["Leg Curl","Legs"],["Walking Lunge","Legs"],["Calf Raise","Legs"],
  ["Deadlift","Back"],["Pull-Up","Back"],["Lat Pulldown","Back"],["Barbell Row","Back"],
  ["Seated Cable Row","Back"],["Face Pull","Back"],
  ["Overhead Press","Shoulders"],["DB Overhead Press","Shoulders"],["DB Lateral Raise","Shoulders"],
  ["Rear Delt Fly","Shoulders"],
  ["Barbell Curl","Arms"],["DB Bicep Curl","Arms"],["Hammer Curl","Arms"],
  ["Tricep Pushdown","Arms"],["Skullcrusher","Arms"],["Close-Grip Bench Press","Arms"],
  ["Plank","Core"],["Hanging Leg Raise","Core"],["Cable Crunch","Core"],["Russian Twist","Core"],
  ["Treadmill Run","Cardio"],["Rowing Machine","Cardio"],["Cycling","Cardio"],
  // --- At-home dumbbell program exercises ---
  ["DB Goblet Squat","Legs"],["Flat DB Bench Press","Chest"],["One-Arm DB Row","Back"],
  ["DB Overhead Press","Shoulders"],["Weighted Glute Bridge","Legs"],["DB Anchored Russian Twist","Core"],
  ["DB Romanian Deadlift","Legs"],["Incline DB Press","Chest"],["Chest Supported Row","Back"],
  ["DB Lateral Raise","Shoulders"],["DB Bicep Curl","Arms"],["DB Plank Pull-Through","Core"],
  ["Bulgarian Split Squat","Legs"],["DB Bench Fly","Chest"],["DB Renegade Row","Back"],
  ["Overhead DB Tricep Extension","Arms"],["DB Shrug","Back"],["DB 90-Degree Heel Tap","Core"],
  ["90/90 Hip Stretch","Mobility"],
  // --- Bodyweight (no equipment) ---
  ["Superman","Back"],
].map(([name,muscle])=>({id:canonicalExerciseKey(name), key:canonicalExerciseKey(name), name, muscle, custom:false}));

/* ---------- Preset program: 3-Day At-Home Full Body (His Mass / Hers Tone) ---------- */
const PROGRAM = [
  { key:"A", title:"Foundation & Push", ex:[
    {name:"DB Goblet Squat",muscle:"Legs",his:[3,"8-10"],hers:[3,"12-15"],note:"Hold heavy DB vertically at chest; sit deep between hips."},
    {name:"Flat DB Bench Press",muscle:"Chest",his:[4,"8"],hers:[3,"12"],note:"Lie flat; press weights straight over chest, explosive drive up."},
    {name:"One-Arm DB Row",muscle:"Back",his:[3,"8 / arm"],hers:[3,"12 / arm"],note:"Support body on bench; pull DB back to your hip pocket."},
    {name:"DB Overhead Press",muscle:"Shoulders",his:[3,"10"],hers:[3,"12-15"],note:"Seated or standing; press dumbbells straight up overhead."},
    {name:"Weighted Glute Bridge",muscle:"Legs",his:[3,"12"],hers:[4,"15"],note:"DB on hips; drive heels to lift pelvis high."},
    {name:"DB Anchored Russian Twist",muscle:"Core",his:[3,"12 total"],hers:[3,"16 total"],note:"Feet anchored, lean back 45°, rotate torso smoothly side-to-side."},
  ]},
  { key:"B", title:"Pull & Posterior", ex:[
    {name:"DB Romanian Deadlift",muscle:"Legs",his:[3,"10"],hers:[3,"12"],note:"Hinge at hips, slide DBs down shins; slow 3s lowering."},
    {name:"Incline DB Press",muscle:"Chest",his:[3,"8-10"],hers:[3,"12"],note:"30° incline; press from the upper chest."},
    {name:"Chest Supported Row",muscle:"Back",his:[3,"10"],hers:[3,"12"],note:"Face down on incline bench; row elbows high, 1s squeeze."},
    {name:"DB Lateral Raise",muscle:"Shoulders",his:[3,"12"],hers:[3,"15"],note:"Raise DBs to shoulder height. Strict form, no swinging."},
    {name:"DB Bicep Curl",muscle:"Arms",his:[3,"10"],hers:[3,"15"],note:"Palms up; keep elbows pinned to your ribs."},
    {name:"DB Plank Pull-Through",muscle:"Core",his:[3,"12 total"],hers:[3,"16 total"],note:"Plank, feet wide; reach under body to pull DB across the floor."},
  ]},
  { key:"C", title:"Power & Stability",
    warmup:"Warm-up: 90/90 hip stretch, 30s per side, to open the hips and prevent popping.", ex:[
    {name:"Bulgarian Split Squat",muscle:"Legs",his:[3,"8 / leg"],hers:[3,"12 / leg"],note:"Back foot elevated on bench; drop straight down smoothly."},
    {name:"DB Bench Fly",muscle:"Chest",his:[3,"10"],hers:[3,"15"],note:"Flat bench, wide arc, soft elbow bend; deep stretch at the bottom."},
    {name:"DB Renegade Row",muscle:"Back",his:[3,"10 total"],hers:[3,"12 total"],note:"Plank on DB handles; row one side at a time, hips square."},
    {name:"Overhead DB Tricep Extension",muscle:"Arms",his:[3,"10"],hers:[3,"12"],note:"Seated; hold one DB with both hands behind your head."},
    {name:"DB Shrug",muscle:"Back",his:[3,"12"],hers:[2,"15"],note:"Straight arms; lift shoulders to ears, pause and squeeze at top."},
    {name:"DB 90-Degree Heel Tap",muscle:"Core",his:[3,"10 total"],hers:[3,"14 total"],note:"Lower back flat, DB over chest, knees at 90°; tap heels, no hip pop."},
  ]},
];

/* ---------- Week-2 program: D/E/F (alternates weekly with A/B/C) ---------- */
const PROGRAM2 = [
  { key:"D", title:"Strength & Drive",
    warmup:"Warm-up: one light set of the first two moves before working weight.", ex:[
    {name:"DB Front Squat",muscle:"Legs",his:[4,"6-8"],hers:[3,"10-12"],note:"DBs racked on the shoulders, elbows high; sit tall between the hips."},
    {name:"DB Floor Press",muscle:"Chest",his:[4,"6-8"],hers:[3,"10-12"],note:"Lie on the floor; triceps touch down each rep, then press to lockout."},
    {name:"Gorilla Row",muscle:"Back",his:[4,"6-8 / arm"],hers:[3,"10 / arm"],note:"Hinge over two DBs on the floor; row one to the hip while the other stays planted."},
    {name:"DB Push Press",muscle:"Shoulders",his:[3,"6-8"],hers:[3,"10"],note:"Slight knee dip, then drive the DBs overhead in one explosive push."},
    {name:"DB Hip Thrust",muscle:"Legs",his:[3,"8-10"],hers:[4,"12"],note:"Upper back on the bench, DB on hips; drive to full lockout and squeeze."},
    {name:"Hollow Body Hold",muscle:"Core",his:[3,"30s"],hers:[3,"20s"],note:"Lower back pressed to the floor, arms and legs long and hovering."},
  ]},
  { key:"E", title:"Pump & Squeeze", ex:[
    {name:"Heels-Elevated Goblet Squat",muscle:"Legs",his:[3,"12"],hers:[3,"15"],note:"Heels on a plate or board; stay upright and ride the quads."},
    {name:"Incline DB Squeeze Press",muscle:"Chest",his:[3,"10-12"],hers:[3,"12-15"],note:"Press the DBs together hard for the whole set on a 30° incline."},
    {name:"Seal Row",muscle:"Back",his:[3,"10-12"],hers:[3,"12-15"],note:"Chest down on the bench; row to the ribs and pause 1s at the top."},
    {name:"Leaning Lateral Raise",muscle:"Shoulders",his:[3,"12"],hers:[3,"15"],note:"Hold the bench and lean away; raise the outside DB to shoulder height."},
    {name:"Zottman Curl",muscle:"Arms",his:[3,"10"],hers:[3,"12"],note:"Curl palms up, rotate at the top, lower slowly palms down."},
    {name:"DB Wood Chop",muscle:"Core",his:[3,"10 / side"],hers:[3,"12 / side"],note:"Swing the DB hip-to-shoulder across the body; rotate through the trunk."},
  ]},
  { key:"F", title:"Posterior & Arms", ex:[
    {name:"Single-Leg DB RDL",muscle:"Legs",his:[3,"8 / leg"],hers:[3,"10 / leg"],note:"Hinge on one leg, DB in the opposite hand; hips square, back flat."},
    {name:"DB Reverse Lunge",muscle:"Legs",his:[3,"8 / leg"],hers:[3,"12 / leg"],note:"Step back, drop the knee straight down, drive through the front heel."},
    {name:"DB Bent-Over Row",muscle:"Back",his:[3,"10"],hers:[3,"12"],note:"Hinge to 45°, row both DBs to the hips; no torso bounce."},
    {name:"Weighted Push-Up",muscle:"Chest",his:[3,"12"],hers:[3,"10-12"],note:"Plate or light DB on the upper back — or bodyweight; chest to the floor."},
    {name:"DB Skullcrusher",muscle:"Arms",his:[3,"10"],hers:[3,"12"],note:"Lying on the bench; bend only at the elbows, lower beside the forehead."},
    {name:"Dead Bug",muscle:"Core",his:[3,"10 / side"],hers:[3,"12 / side"],note:"Lower opposite arm and leg slowly; lower back glued to the floor."},
  ]},
];
const ALL_PROGRAM = PROGRAM.concat(PROGRAM2);

function buildPresets(){
  const variants=[
    ["his","His · Mass","💪 Mass focus — rest 60–90s. Lower the weights slowly (3s) for progressive overload."],
    ["hers","Hers · Tone","🔥 Tone focus — rest 30–45s between sets to keep intensity high."],
  ];
  const out=[];
  ALL_PROGRAM.forEach(day=>variants.forEach(([k,label,tip])=>{
    out.push({
      id:"preset-"+day.key+"-"+k, preset:true,
      name:`Workout ${day.key} — ${day.title} (${label})`,
      note:(day.warmup?day.warmup+"  ":"")+tip,
      exercises: day.ex.map(e=>attachExerciseRef({name:e.name, muscle:e.muscle, sets:e[k][0], reps:e[k][1], note:e.note},e.name)),
    });
  }));
  return out;
}
/* ---------- Movement-pattern pools (for "shuffle" / swap alternates) ----------
   Each pool = same primary muscle + same motion type. First entry is the program anchor.
   Everything is doable with adjustable dumbbells + a flat/incline bench (or bodyweight). */
const MOVEMENT_POOLS = {
  squat:        {label:"Squat (knee-dominant)", muscle:"Legs",
                 list:["DB Goblet Squat","DB Front Squat","DB Sumo Squat","Heels-Elevated Goblet Squat","DB Box Squat","Bodyweight Squat","Tempo Goblet Squat","Back Squat","Front Squat"]},
  knee_extension:{label:"Knee extension / machine press", muscle:"Legs",
                 list:["Leg Press","Leg Extension","Reverse Nordic Curl","Rack-Assisted Sissy Squat"]},
  knee_flexion: {label:"Knee flexion (hamstrings)", muscle:"Legs",
                 list:["Leg Curl","Slider Hamstring Curl"]},
  lunge:        {label:"Lunge / split squat (single-leg)", muscle:"Legs",
                 list:["Bulgarian Split Squat","DB Reverse Lunge","DB Forward Lunge","Walking Lunge","DB Step-Up","DB Split Squat","Curtsy Lunge","Reverse Lunge","Barbell Reverse Lunge"]},
  hinge:        {label:"Hip hinge (posterior chain)", muscle:"Legs",
                 list:["DB Romanian Deadlift","DB Stiff-Leg Deadlift","Single-Leg DB RDL","DB Good Morning","DB Sumo Deadlift","Bodyweight Hip Hinge","Romanian Deadlift","Deadlift","Rack Pull","Barbell Good Morning"]},
  bridge:       {label:"Glute bridge / hip thrust", muscle:"Legs",
                 list:["Weighted Glute Bridge","DB Hip Thrust","Single-Leg Glute Bridge","Frog Pump","B-Stance Hip Thrust","Barbell Hip Thrust"]},
  press_flat:   {label:"Horizontal press (flat)", muscle:"Chest",
                 list:["Flat DB Bench Press","Push-Up","DB Floor Press","Weighted Push-Up","Close-Grip DB Press","Wide-Grip Push-Up","Barbell Bench Press","Close-Grip Bench Press","Dip"]},
  press_incline:{label:"Incline press (upper chest)", muscle:"Chest",
                 list:["Incline DB Press","Low-Incline DB Press","Incline DB Squeeze Press","Feet-Elevated Push-Up","Incline Hex Press","Barbell Incline Press"]},
  fly:          {label:"Chest fly (adduction)", muscle:"Chest",
                 list:["DB Bench Fly","Incline DB Fly","Floor DB Fly","Plate Svend Press","Cable Fly"]},
  row:          {label:"Horizontal pull / row", muscle:"Back",
                 list:["One-Arm DB Row","Chest Supported Row","DB Renegade Row","DB Bent-Over Row","Inverted Row","Seal Row","Gorilla Row","Barbell Row","Pendlay Row","Seated Cable Row"]},
  pull_vert:    {label:"Vertical pull (lats)", muscle:"Back",
                 list:["Pull-Up","Weighted Pull-Up","Chin-Up","Assisted Pull-Up","Eccentric Pull-Up","Lat Pulldown"]},
  pullup_skill: {label:"Pull-up skill / active hang", muscle:"Back",
                 list:["Dead Hang","Scapular Pull-Up"]},
  scapular:     {label:"Scapular control / rear delts", muscle:"Shoulders",
                 list:["Rear Delt Fly","Chest-Supported Rear-Delt Row","Prone Y-T-W Raise","Scapular Push-Up","Face Pull","Superman"]},
  press_oh:     {label:"Overhead press (vertical)", muscle:"Shoulders",
                 list:["DB Overhead Press","Seated DB Shoulder Press","DB Push Press","Arnold Press","Single-Arm DB Press","Pike Push-Up","Overhead Press","Barbell Push Press"]},
  lateral:      {label:"Lateral / delt raise", muscle:"Shoulders",
                 list:["DB Lateral Raise","DB Front Raise","Leaning Lateral Raise","Seated Lateral Raise","6-Way Shoulder Raise"]},
  shrug:        {label:"Shrug / traps", muscle:"Back",
                 list:["DB Shrug","Incline DB Shrug","DB Upright Row","DB High Pull","Farmer-Hold Shrug","Barbell Shrug"]},
  curl:         {label:"Biceps curl", muscle:"Arms",
                 list:["DB Bicep Curl","Incline-Bench DB Preacher Curl","DB Reverse Curl","Hammer Curl","Incline DB Curl","Concentration Curl","Cross-Body Hammer Curl","Zottman Curl","Spider Curl","Barbell Curl"]},
  triceps:      {label:"Triceps extension", muscle:"Arms",
                 list:["Overhead DB Tricep Extension","Rolling DB Triceps Extension","DB PJR Pullover","DB Skullcrusher","DB Kickback","Close-Grip Push-Up","Bench Dip","DB Tate Press","Skullcrusher","Tricep Pushdown"]},
  calf:         {label:"Calves / lower leg", muscle:"Legs",
                 list:["Calf Raise","Seated DB Calf Raise","Standing Barbell Calf Raise","Single-Leg DB Calf Raise","Tibialis Raise"]},
  hip_abduction:{label:"Hip abduction / glute medius", muscle:"Legs",
                 list:["Side-Lying Hip Abduction"]},
  rotator:      {label:"Rotator cuff", muscle:"Shoulders",
                 list:["Side-Lying DB External Rotation"]},
  forearm:      {label:"Forearms / grip isolation", muscle:"Arms",
                 list:["Plate Pinch Hold","DB Wrist Curl","DB Reverse Wrist Curl"]},
  carry:        {label:"Loaded carry / grip", muscle:"Core",
                 list:["Farmer Carry","Suitcase Carry","Front-Rack Carry","Barbell Static Hold"]},
  core_rot:     {label:"Core — rotation / anti-rotation", muscle:"Core",
                 list:["DB Anchored Russian Twist","Russian Twist","DB Plank Pull-Through","DB Wood Chop","Side Plank Reach-Through","Bicycle Crunch","DB Standing Twist"]},
  core_stab:    {label:"Core — anti-extension / lower abs", muscle:"Core",
                 list:["DB 90-Degree Heel Tap","Dead Bug","Hollow Body Hold","Reverse Crunch","Lying Leg Raise","Plank","Mountain Climbers","Barbell Rollout"]},
  core_flexion: {label:"Core — trunk / hip flexion", muscle:"Core",
                 list:["Hanging Knee Raise","Hanging Leg Raise","Cable Crunch"]},
  core_lateral: {label:"Core — lateral stability", muscle:"Core",
                 list:["Side Plank"]},
  cardio:       {label:"Conditioning / cardio", muscle:"Cardio",
                 list:["Treadmill Run","Rowing Machine","Cycling"]},
  mobility:     {label:"Mobility", muscle:"Mobility",
                 list:["90/90 Hip Stretch"]},
};
const PATTERN_META={
  squat:{secondary:["Glutes","Core"],feel:"Quads and glutes working while the whole foot stays planted."},
  knee_extension:{secondary:["Glutes"],feel:"Quads working through a controlled knee bend and extension."},
  knee_flexion:{secondary:["Calves"],feel:"Hamstrings shortening behind the thigh without the hips lifting."},
  hip_abduction:{secondary:["Hip stabilizers"],feel:"The outside glute lifting the leg while the pelvis stays stacked."},
  lunge:{secondary:["Glutes","Core"],feel:"Front-leg quads and glutes with the pelvis staying level."},
  hinge:{secondary:["Hamstrings","Glutes","Core"],feel:"Hamstrings lengthening on the way down and glutes driving the return."},
  bridge:{secondary:["Hamstrings","Core"],feel:"Glutes producing the lockout without pressure in the lower back."},
  press_flat:{secondary:["Triceps","Front delts"],feel:"Chest and triceps pressing while the shoulder blades stay supported."},
  press_incline:{secondary:["Triceps","Front delts"],feel:"Upper chest and triceps pressing without the shoulders rolling forward."},
  fly:{secondary:["Front delts"],feel:"Chest stretching and then squeezing the arms back together."},
  row:{secondary:["Biceps","Rear delts"],feel:"Upper back and lats pulling the elbow toward the body."},
  pull_vert:{secondary:["Biceps","Upper back"],feel:"Lats drawing the elbows down while the shoulders stay away from the ears."},
  pullup_skill:{secondary:["Grip","Core"],feel:"Shoulder blades and grip supporting a controlled active hang."},
  scapular:{secondary:["Upper back","Rotator cuff"],feel:"Rear shoulders and muscles around the shoulder blades moving with control."},
  press_oh:{secondary:["Triceps","Core"],feel:"Shoulders and triceps pressing while the ribs stay stacked over the pelvis."},
  lateral:{secondary:["Upper traps"],feel:"Side or rear delts lifting the arms without torso momentum."},
  shrug:{secondary:["Grip"],feel:"Upper traps elevating the shoulders straight up and down."},
  curl:{secondary:["Forearms"],feel:"Biceps and forearms moving the load while the upper arm stays quiet."},
  triceps:{secondary:["Chest","Shoulders"],feel:"Triceps straightening the elbow without shoulder movement."},
  calf:{secondary:["Feet","Lower leg"],feel:"Calves shortening at the top and stretching fully at the bottom."},
  rotator:{secondary:["Rear delts"],feel:"The back of the shoulder rotating the arm without the elbow leaving its support."},
  forearm:{secondary:["Grip"],feel:"Forearms controlling the wrist or maintaining a secure pinch without elbow movement."},
  carry:{secondary:["Grip","Upper back","Obliques"],feel:"Grip and trunk resisting sway while you walk tall."},
  core_rot:{secondary:["Obliques"],feel:"The trunk controlling rotation without the lower back taking over."},
  core_stab:{secondary:["Hip flexors"],feel:"Deep abdominal tension keeping the ribs and pelvis connected."},
  core_flexion:{secondary:["Hip flexors"],feel:"Lower abs curling the pelvis rather than swinging the legs."},
  core_lateral:{secondary:["Glutes","Shoulders"],feel:"Side abs and glutes holding the body in one straight line."},
  cardio:{secondary:["Heart and lungs"],feel:"A sustainable whole-body effort at the intended pace."},
  mobility:{secondary:[],feel:"A controlled stretch without pinching or sharp pain."},
};
const EXERCISE_META_OVERRIDES={
  "Back Squat":{difficulty:"intermediate",requirements:["Rack","Barbell","Plates","Safety arms"],safety:"Set the safeties just below your deepest controlled position and use collars."},
  "Front Squat":{difficulty:"intermediate",requirements:["Rack","Barbell","Plates","Safety arms"],safety:"Set safeties below the bottom position and keep the rack area clear before unracking."},
  "Barbell Bench Press":{difficulty:"intermediate",requirements:["Rack","Bench","Barbell","Plates","Safety arms"],safety:"Set the safeties just below chest height and use a spotter for near-limit sets."},
  "Barbell Incline Press":{difficulty:"intermediate",requirements:["Rack","Incline bench","Barbell","Plates","Safety arms"],safety:"Confirm the bench is centered and the safeties sit just below the bottom bar position."},
  "Deadlift":{difficulty:"intermediate",requirements:["Barbell","Plates","Open floor"],safety:"Clear the floor, use collars, and reset your brace before every rep."},
  "Pull-Up":{difficulty:"intermediate",requirements:["Pull-up bar"],regressions:["Assisted Pull-Up","Eccentric Pull-Up"],progressions:["Add a pause at the top","Add load only after strict reps are repeatable"]},
  "Weighted Pull-Up":{difficulty:"advanced",requirements:["Pull-up bar","Dip belt, weighted vest, or securely held dumbbell"],safety:"Use added load only after strict full-range pull-ups are repeatable. Enter only the added external load.",regressions:["Pull-Up","Chin-Up"],progressions:["Add load in the smallest available increment"]},
  "Assisted Pull-Up":{difficulty:"beginner",requirements:["Pull-up bar","Stable foot support or assistance"],progressions:["Eccentric Pull-Up","Pull-Up"]},
  "Eccentric Pull-Up":{difficulty:"beginner",requirements:["Pull-up bar","Stable step or bench"],regressions:["Assisted Pull-Up"],progressions:["Pull-Up"]},
  "Dead Hang":{difficulty:"beginner",requirements:["Pull-up bar"],safety:"Use a securely mounted bar and step down if your grip begins to open."},
  "Scapular Pull-Up":{difficulty:"beginner",requirements:["Pull-up bar"],regressions:["Dead Hang"],progressions:["Assisted Pull-Up","Pull-Up"]},
  "Farmer Carry":{difficulty:"beginner",requirements:["Dumbbells","Clear walking lane"],safety:"Clear the walking path and set the weights down under control before grip fails."},
  "Suitcase Carry":{difficulty:"beginner",requirements:["Dumbbell","Clear walking lane"],safety:"Keep the walking path clear; stop if you cannot resist leaning toward the weight."},
  "Front-Rack Carry":{difficulty:"intermediate",requirements:["Rack","Barbell","Plates","Clear walking lane"],safety:"Use collars, take short controlled steps, and keep the rack return path clear."},
  "Barbell Static Hold":{difficulty:"intermediate",requirements:["Rack","Barbell","Plates","Safety arms"],safety:"Set safety arms just below the hold position and never step away from the rack."},
  "Standing Barbell Calf Raise":{difficulty:"intermediate",requirements:["Rack","Barbell","Plates","Safety arms"],safety:"Keep the bar inside the rack and set safeties just below shoulder height."},
  "Prone Y-T-W Raise":{difficulty:"beginner",requirements:["Incline bench","Very light dumbbells (optional)"],safety:"Use bodyweight or very light loads; stop before the shoulders shrug or pinch."},
  "Incline-Bench DB Preacher Curl":{requirements:["Incline bench","Dumbbell"],repMode:"per_side",loadCount:1,safety:"Support the full upper arm and stop short of forcing the elbow into a painful bottom range."},
  "Rolling DB Triceps Extension":{requirements:["Bench","Dumbbells"],safety:"Keep the dumbbells controlled beside the head and use a load you can return without shoulder strain."},
  "DB PJR Pullover":{requirements:["Bench","Dumbbell"],loadCount:1,safety:"Use a controlled stretch behind the head and keep the ribs down; stop if the shoulders pinch."},
  "Seated DB Calf Raise":{requirements:["Bench","Dumbbell","Plate or block (optional)"],loadCount:1},
  "Reverse Nordic Curl":{requirements:["Knee pad or folded mat"],safety:"Begin with a short range and keep hips extended; stop if the knees feel sharp or compressed."},
  "Slider Hamstring Curl":{requirements:["Sliders or towels","Smooth floor"],safety:"Keep the hips controlled and shorten the slide if the hamstrings cramp or the lower back arches."},
  "Rack-Assisted Sissy Squat":{requirements:["Rack upright"],safety:"Use the rack for balance, start with a shallow range, and stop if the knees feel sharp or unstable."},
  "Side-Lying Hip Abduction":{repMode:"per_side",requirements:["Floor mat (optional)"]},
  "Side-Lying DB External Rotation":{repMode:"per_side",loadCount:1,requirements:["Very light dumbbell","Bench or floor"],safety:"Use a very light load and stop before the shoulder rolls backward or pinches."},
  "Plate Pinch Hold":{requirements:["Weight plates"],safety:"Keep plates clear of the feet and end the hold before the grip opens unexpectedly."},
};
function inferredRequirements(name,equipment){
  const r=[];
  if(equipment==="barbell") r.push("Barbell","Plates");
  if(equipment==="dumbbell") r.push("Dumbbells");
  if(equipment==="pullup") r.push("Pull-up bar");
  if(equipment==="gym") r.push("Gym equipment");
  if(/Bench|Chest Supported|Chest-Supported|Seal Row|Hip Thrust|Skullcrusher|Tate Press|Spider Curl|Rolling DB Triceps|PJR Pullover|Seated DB Calf/.test(name)) r.push("Bench");
  if(/Back Squat|Front Squat|Bench Press|Incline Press|Rack Pull|Barbell Reverse Lunge|Barbell Static Hold|Standing Barbell Calf Raise/.test(name)) r.push("Rack");
  return [...new Set(r)];
}
const SINGLE_DUMBBELL_LOADS=new Set([
  "DB Goblet Squat","Heels-Elevated Goblet Squat","One-Arm DB Row","Weighted Glute Bridge","DB Hip Thrust",
  "DB Anchored Russian Twist","DB Plank Pull-Through","DB Wood Chop","DB 90-Degree Heel Tap","Overhead DB Tricep Extension",
  "Gorilla Row","DB Renegade Row","Single-Leg DB RDL","Leaning Lateral Raise","Concentration Curl","Cross-Body Hammer Curl",
  "DB Sumo Deadlift","DB Good Morning","Plate Svend Press","Calf Raise","Suitcase Carry","Single-Leg DB Calf Raise","Single-Arm DB Press",
  "Incline-Bench DB Preacher Curl","DB PJR Pullover","Seated DB Calf Raise","Side-Lying DB External Rotation",
]);
function inferredLoadCount(name,equipment){
  if(equipment!=="dumbbell") return 1; // barbells and machines are entered as their total loaded weight
  return SINGLE_DUMBBELL_LOADS.has(name)||/One-Arm|Single-Arm/.test(name)?1:2; // dumbbells are entered per implement
}
function inferredRepMode(name,pattern){
  return pattern==="lunge"||/One-Arm|Single-Arm|Single-Leg|Suitcase|Side Plank|Leaning Lateral Raise|Concentration Curl|Cross-Body Hammer Curl|DB Wood Chop|Dead Bug/.test(name)?"per_side":"total";
}
function metadataFor(name,muscle,equipment,pattern){
  const p=PATTERN_META[pattern]||{}, o=EXERCISE_META_OVERRIDES[name]||{};
  const accessory=["knee_extension","knee_flexion","hip_abduction","lateral","scapular","rotator","curl","triceps","forearm","calf","core_rot","core_stab","core_flexion","core_lateral"].includes(pattern);
  const conditioning=["carry","cardio"].includes(pattern);
  const repMode=o.repMode||inferredRepMode(name,pattern), loadCount=o.loadCount||inferredLoadCount(name,equipment), unilateral=repMode==="per_side";
  return {
    key:canonicalExerciseKey(name), primaryMuscles:[muscle], secondaryMuscles:p.secondary||[],
    difficulty:o.difficulty||((equipment==="barbell"&&["squat","hinge","press_flat","press_oh"].includes(pattern))?"intermediate":"beginner"),
    unilateral, loadCount, repMode, requirements:o.requirements||inferredRequirements(name,equipment),
    restCategory:conditioning?"conditioning":accessory?"accessory":equipment==="barbell"?"strength":"standard",
    feel:o.feel||p.feel||"Move through a controlled range without sharp pain.", safety:o.safety||"Use a controlled load and stop the set if position breaks down.",
    regressions:o.regressions||[], progressions:o.progressions||[],
  };
}
function exPattern(name){ const e=exerciseByRef(name); return e&&e.pattern; }
function patternLabel(name){ const p=exPattern(name); return p&&MOVEMENT_POOLS[p]?MOVEMENT_POOLS[p].label:""; }
function altsFor(name){ const p=exPattern(name); if(!p) return [];
  return state.exercises.filter(e=>e.pattern===p && !sameExercise(e,name)); }

/* ---------- Equipment tagging ---------- */
const EQUIP_LABELS={barbell:"Barbell",dumbbell:"Dumbbells",bodyweight:"Bodyweight",pullup:"Pull-up bar",gym:"Gym"};
const EQUIP_SHORT ={barbell:"BB",dumbbell:"DB",bodyweight:"BW",pullup:"Bar",gym:"Gym"};
const EQUIP_EXPLICIT={
  // barbell (names without a "Barbell" prefix)
  "Back Squat":"barbell","Front Squat":"barbell","Deadlift":"barbell","Romanian Deadlift":"barbell",
  "Overhead Press":"barbell","Close-Grip Bench Press":"barbell","Skullcrusher":"barbell",
  "Rack Pull":"barbell","Pendlay Row":"barbell",
  // pull-up bar
  "Pull-Up":"pullup","Weighted Pull-Up":"pullup","Chin-Up":"pullup","Hanging Leg Raise":"pullup","Inverted Row":"pullup",
  "Dead Hang":"pullup","Scapular Pull-Up":"pullup","Assisted Pull-Up":"pullup","Eccentric Pull-Up":"pullup","Hanging Knee Raise":"pullup",
  // dumbbell (names the prefix rules miss)
  "Hammer Curl":"dumbbell","Lateral Raise":"dumbbell","Rear Delt Fly":"dumbbell","Chest Supported Row":"dumbbell",
  "Weighted Glute Bridge":"dumbbell","Bulgarian Split Squat":"dumbbell","Walking Lunge":"dumbbell","Curtsy Lunge":"dumbbell",
  "Arnold Press":"dumbbell","Leaning Lateral Raise":"dumbbell","Seated Lateral Raise":"dumbbell","6-Way Shoulder Raise":"dumbbell",
  "Farmer-Hold Shrug":"dumbbell","Incline Hex Press":"dumbbell","Plate Svend Press":"dumbbell","Concentration Curl":"dumbbell",
  "Spider Curl":"dumbbell","Zottman Curl":"dumbbell","Cross-Body Hammer Curl":"dumbbell","Gorilla Row":"dumbbell",
  "Seal Row":"dumbbell","Calf Raise":"dumbbell","Incline-Bench DB Preacher Curl":"dumbbell","DB Reverse Curl":"dumbbell",
  "Rolling DB Triceps Extension":"dumbbell","DB PJR Pullover":"dumbbell","Seated DB Calf Raise":"dumbbell",
  "Side-Lying DB External Rotation":"dumbbell","DB Wrist Curl":"dumbbell","DB Reverse Wrist Curl":"dumbbell",
  "Farmer Carry":"dumbbell","Suitcase Carry":"dumbbell","Single-Leg DB Calf Raise":"dumbbell",
  "Chest-Supported Rear-Delt Row":"dumbbell","Prone Y-T-W Raise":"dumbbell",
  "Front-Rack Carry":"barbell","Barbell Static Hold":"barbell","Standing Barbell Calf Raise":"barbell",
  // bodyweight
  "Push-Up":"bodyweight","Wide-Grip Push-Up":"bodyweight","Close-Grip Push-Up":"bodyweight","Feet-Elevated Push-Up":"bodyweight",
  "Weighted Push-Up":"bodyweight","Pike Push-Up":"bodyweight","Bodyweight Squat":"bodyweight","Reverse Lunge":"bodyweight",
  "Bodyweight Hip Hinge":"bodyweight","Single-Leg Glute Bridge":"bodyweight","Frog Pump":"bodyweight","B-Stance Hip Thrust":"bodyweight",
  "Superman":"bodyweight","Plank":"bodyweight","Mountain Climbers":"bodyweight","Dead Bug":"bodyweight","Hollow Body Hold":"bodyweight",
  "Reverse Crunch":"bodyweight","Lying Leg Raise":"bodyweight","Bicycle Crunch":"bodyweight","Side Plank Reach-Through":"bodyweight",
  "Russian Twist":"bodyweight","Bench Dip":"bodyweight","90/90 Hip Stretch":"bodyweight",
  "Tibialis Raise":"bodyweight","Scapular Push-Up":"bodyweight","Side Plank":"bodyweight",
  "Reverse Nordic Curl":"bodyweight","Slider Hamstring Curl":"bodyweight","Rack-Assisted Sissy Squat":"bodyweight","Side-Lying Hip Abduction":"bodyweight",
  "Plate Pinch Hold":"barbell",
  // gym machines / cables / cardio
  "Cable Fly":"gym","Dip":"gym","Leg Press":"gym","Leg Extension":"gym","Leg Curl":"gym","Lat Pulldown":"gym",
  "Seated Cable Row":"gym","Face Pull":"gym","Tricep Pushdown":"gym","Cable Crunch":"gym",
  "Treadmill Run":"gym","Rowing Machine":"gym","Cycling":"gym",
};
function equipFor(name){
  if(EQUIP_EXPLICIT[name]) return EQUIP_EXPLICIT[name];
  if(/^Barbell/.test(name)) return "barbell";
  if(/(^|\s)DB\s|Dumbbell|Goblet/.test(name)) return "dumbbell";
  return null;   // custom / unknown → shows under "All" only
}
function exerciseByRef(ref){
  if(!ref) return null;
  const key=typeof ref==="string"&&ref.startsWith("ex:")?ref:(ref.exerciseKey||ref.key||canonicalExerciseKey(ref.name||ref));
  const name=canonicalExerciseName(typeof ref==="string"?ref:(ref.name||""));
  return state.exercises.find(e=>e.key===key)||state.exercises.find(e=>e.name===name)||null;
}
function exerciseKeyOf(ref){
  if(!ref) return "";
  if(typeof ref==="string") return ref.startsWith("ex:")?ref:canonicalExerciseKey(ref);
  return ref.exerciseKey||ref.key||canonicalExerciseKey(ref.name||"");
}
function sameExercise(a,b){ return exerciseKeyOf(a)===exerciseKeyOf(b); }
function attachExerciseRef(target,name){
  const canonical=canonicalExerciseName(name||target.name);
  const lib=typeof state!=="undefined"&&exerciseByRef(canonical);
  target.name=canonical; target.exerciseKey=(lib&&lib.key)||canonicalExerciseKey(canonical);
  return target;
}

/* ---------- Curated substitutions (first choices shown before the full pool) ---------- */
const SUBSTITUTIONS={
  "Back Squat":[["Front Squat","More upright and quad-focused."],["DB Goblet Squat","Rack-free, simple fallback."],["Heels-Elevated Goblet Squat","Lower-load quad option."]],
  "DB Goblet Squat":[["Back Squat","Best option when you want to load heavy."],["Front Squat","Upright barbell alternative."],["Heels-Elevated Goblet Squat","More quad emphasis with the same DB."]],
  "DB Front Squat":[["Front Squat","Barbell version with the same upright pattern."],["Back Squat","Heavier bilateral squat option."],["DB Goblet Squat","Simpler rack-free fallback."]],
  "Bulgarian Split Squat":[["DB Reverse Lunge","Single-leg work with less balance demand."],["Barbell Reverse Lunge","Load both legs from the rack."],["DB Step-Up","Knee-friendly single-leg alternative."]],
  "DB Reverse Lunge":[["Barbell Reverse Lunge","Heavier bilateral loading."],["Bulgarian Split Squat","More stable rear-foot-elevated option."],["DB Step-Up","Controlled single-leg substitute."]],
  "DB Romanian Deadlift":[["Romanian Deadlift","Barbell version for heavier loading."],["Deadlift","Full-range pull from the floor."],["Barbell Hip Thrust","Glute-focused posterior-chain option."]],
  "Romanian Deadlift":[["DB Romanian Deadlift","Lighter, easier-to-control version."],["Deadlift","Full-range floor pull."],["Barbell Hip Thrust","Less hamstring stretch, more glute focus."]],
  "Deadlift":[["Romanian Deadlift","Less demanding from the floor."],["Rack Pull","Partial range from the safeties."],["DB Romanian Deadlift","Dumbbell fallback."]],
  "Barbell Hip Thrust":[["DB Hip Thrust","Same motion without loading the bar."],["Weighted Glute Bridge","Floor-based option."],["Romanian Deadlift","Posterior-chain substitute without a bench setup."]],
  "Weighted Glute Bridge":[["Barbell Hip Thrust","Best heavy progression option."],["DB Hip Thrust","Bench-supported DB version."],["Single-Leg Glute Bridge","No-load alternative."]],
  "Flat DB Bench Press":[["Barbell Bench Press","Best heavy bilateral press."],["DB Floor Press","Shoulder-friendly shorter range."],["Push-Up","No-bench fallback."]],
  "Barbell Bench Press":[["Flat DB Bench Press","Independent-arm alternative."],["DB Floor Press","Safe shorter-range fallback."],["Push-Up","No-rack option."]],
  "Incline DB Press":[["Barbell Incline Press","Heavier upper-chest option."],["Flat DB Bench Press","Flat-press fallback."],["Feet-Elevated Push-Up","Portable upper-chest option."]],
  "DB Bench Fly":[["Incline DB Squeeze Press","Pressing option with a chest squeeze."],["Flat DB Bench Press","More loadable chest movement."],["Push-Up","Simple fallback."]],
  "One-Arm DB Row":[["Barbell Row","Heavy bilateral row."],["Chest Supported Row","Less lower-back fatigue."],["Inverted Row","Pull-up-bar alternative."]],
  "Barbell Row":[["One-Arm DB Row","Bench-supported unilateral alternative."],["Pendlay Row","Dead-stop power-row option."],["Pull-Up","Vertical-pull alternative."]],
  "Chest Supported Row":[["One-Arm DB Row","More load and range freedom."],["Barbell Row","Heavy bilateral row."],["Pull-Up","Vertical-pull substitution."]],
  "Pull-Up":[["Weighted Pull-Up","Add external load after strict reps are repeatable."],["Assisted Pull-Up","Keep the full motion with less effective bodyweight."],["Eccentric Pull-Up","Build strength through slow lowering."]],
  "Weighted Pull-Up":[["Pull-Up","Use bodyweight while keeping the same movement."],["Chin-Up","Supinated-grip bodyweight alternative."],["Assisted Pull-Up","Scale the vertical pull while preserving full range."]],
  "Chin-Up":[["Pull-Up","More lat-focused grip."],["Inverted Row","Scalable rack alternative."],["One-Arm DB Row","Dumbbell fallback."]],
  "DB Overhead Press":[["Overhead Press","Barbell strength option."],["DB Push Press","Use leg drive to keep load moving."],["Pike Push-Up","Bodyweight fallback."]],
  "Overhead Press":[["DB Overhead Press","Use if the 45 lb bar is too heavy."],["Barbell Push Press","Leg-drive alternative."],["Pike Push-Up","Bodyweight fallback."]],
  "DB Lateral Raise":[["Leaning Lateral Raise","Longer tension at the bottom."],["Seated Lateral Raise","Removes momentum."],["Rear Delt Fly","Rear-delt-focused alternative."]],
  "DB Bicep Curl":[["Incline-Bench DB Preacher Curl","Strict supported curl with less momentum."],["DB Reverse Curl","More brachialis and forearm emphasis."],["Hammer Curl","Neutral-grip alternative."]],
  "Incline-Bench DB Preacher Curl":[["DB Bicep Curl","Free-standing bilateral curl."],["Concentration Curl","Another strict single-arm option."],["Spider Curl","Bench-supported curl with a different strength curve."]],
  "Overhead DB Tricep Extension":[["DB Skullcrusher","Bench-supported triceps option."],["Close-Grip Bench Press","Heavier compound triceps press."],["Close-Grip Push-Up","Bodyweight fallback."]],
  "DB Skullcrusher":[["Rolling DB Triceps Extension","Adds a shoulder roll and long-head stretch."],["DB PJR Pullover","Single-dumbbell long-head option."],["Overhead DB Tricep Extension","No-bench version."]],
  "Seated DB Calf Raise":[["Single-Leg DB Calf Raise","Straight-knee unilateral alternative."],["Standing Barbell Calf Raise","Heavier standing calf option."],["Tibialis Raise","Front-of-shin balance work."]],
  "Plate Pinch Hold":[["Barbell Static Hold","Heavier whole-hand grip option."],["Farmer Carry","Grip work with locomotion."],["DB Wrist Curl","Direct wrist-flexor work."]],
  "DB Anchored Russian Twist":[["DB Wood Chop","Standing diagonal rotation."],["DB Plank Pull-Through","Anti-rotation core work."],["Side Plank Reach-Through","Bodyweight rotational option."]],
  "DB Plank Pull-Through":[["DB Anchored Russian Twist","Seated rotation option."],["Dead Bug","Lower-back-friendly core stability."],["Plank","Simple no-load alternative."]],
  "Barbell Rollout":[["Hollow Body Hold","No-equipment anti-extension work."],["Plank","Simpler anti-extension option."],["Dead Bug","Most scalable core substitute."]],
  "Assisted Pull-Up":[["Eccentric Pull-Up","More emphasis on lowering strength."],["Inverted Row","Fully scalable horizontal pull."],["Pull-Up","Progress when strict assisted reps are repeatable."]],
  "Farmer Carry":[["Suitcase Carry","One-sided carry with more core demand."],["Barbell Static Hold","Rack-based grip option without walking."],["Farmer-Hold Shrug","Stationary dumbbell alternative."]],
  "Suitcase Carry":[["Farmer Carry","Two-sided carry for heavier loading."],["Side Plank","No-equipment lateral-core alternative."],["DB Plank Pull-Through","Anti-rotation dumbbell alternative."]],
  "Standing Barbell Calf Raise":[["Single-Leg DB Calf Raise","Unilateral dumbbell alternative."],["Calf Raise","Simple supported fallback."],["Tibialis Raise","Balances lower-leg work on the front of the shin."]],
  "Chest-Supported Rear-Delt Row":[["Rear Delt Fly","Lighter rear-delt isolation."],["Prone Y-T-W Raise","Scapular-control alternative."],["Face Pull","Cable-based upper-back option."]],
  "Side Plank":[["Suitcase Carry","Loaded moving alternative."],["Side Plank Reach-Through","Adds controlled rotation."],["Plank","Simpler bilateral stability option."]],
};
function modeAllowsEquipment(equipment,mode){
  if(mode==="db") return ["dumbbell","bodyweight","pullup"].includes(equipment);
  if(mode==="bb") return ["barbell","bodyweight","pullup"].includes(equipment);
  return equipment!=="gym";
}
function suggestedSubs(name,mode=equipMode()){
  return (SUBSTITUTIONS[name]||[]).map(([n,reason])=>{
    const ex=exerciseByRef(n); return ex&&{...ex,reason};
  }).filter(Boolean).filter(ex=>modeAllowsEquipment(ex.equipment,mode));
}

/* ---------- Barbell warm-up + plate planning ---------- */
const DEFAULT_PLATE_PAIRS={45:1,35:1,25:1,10:1,5:2,2.5:2};
function isBarbell(ex){ const lib=exerciseByRef(ex); return (lib&&lib.equipment)==="barbell"; }
function configuredBarWeight(){ return U()==="kg" ? 20 : (Number(state.settings.barWeight)||45); }
function platePairs(){ return {...DEFAULT_PLATE_PAIRS,...(state.settings.platePairs||{})}; }
function suggestedWorkingWeight(ex){
  const sug=suggestNext(ex,lastPerformance(ex.name));
  if(sug&&sug.type==="weight") return sug.weight;
  const prev=lastPerformance(ex.name); return prev&&Math.max(...prev.map(s=>Number(s.weight)||0))||configuredBarWeight();
}
function roundLoad(n){ const step=U()==="kg"?2.5:5; return Math.round(n/step)*step; }
function warmupSetsFor(ex,work){
  const bar=configuredBarWeight(), target=Number(work)||bar;
  if(target<=bar+5) return [{weight:bar,reps:8}];
  const raw=[bar,roundLoad(target*.55),roundLoad(target*.72),roundLoad(target*.86)];
  const seen=new Set();
  return raw.filter(w=>w<target&&w>=bar&&!seen.has(w)&&(seen.add(w),true)).map((weight,i,a)=>({weight,reps:i===0?8:i===a.length-1?1:i===1?5:3}));
}
function bestPlateLoad(perSide){
  const available=platePairs();
  const vals=Object.keys(available).map(Number).filter(v=>available[v]>0).sort((a,b)=>b-a);
  const goal=Math.round(perSide*2), counts={}; let best=null;
  function walk(i,left,plates){
    if(left===0){ if(!best||plates<best.plates) best={plates,counts:{...counts}}; return; }
    if(i>=vals.length||left<0||(best&&plates>=best.plates)) return;
    const v=vals[i], max=Math.min(Number(available[v])||0,Math.floor(left/(v*2)));
    for(let n=max;n>=0;n--){ if(n) counts[v]=n; else delete counts[v]; walk(i+1,left-n*v*2,plates+n); }
    delete counts[v];
  }
  walk(0,goal,0); return best;
}
function platePlan(total){
  const bar=configuredBarWeight(), target=Number(total);
  if(!target||target<bar) return {error:`Enter a working weight of at least ${fmtNum(bar)} lb.`};
  const per=(target-bar)/2, result=bestPlateLoad(per);
  if(!result) return {error:`${fmtNum(target)} lb cannot be made from the configured plates.`};
  const text=Object.entries(result.counts).sort((a,b)=>Number(b[0])-Number(a[0])).map(([v,n])=>n>1?`${n} × ${v}`:v).join(" + ")||"bar only";
  return {per,text,bar};
}

/* ---------- Equipment mode (Dumbbell / Combo / Barbell) ----------
   One authored routine, three implements: at start time each exercise resolves
   through its movement pool to the anchor for the chosen mode.
   big:true pools are the ones Combo upgrades to the bar. */
const POOL_ANCHORS={
  squat:        {db:"DB Goblet Squat",        bb:"Back Squat",           big:true},
  lunge:        {db:"DB Reverse Lunge",       bb:"Barbell Reverse Lunge",big:false},
  hinge:        {db:"DB Romanian Deadlift",   bb:"Romanian Deadlift",    big:true},
  bridge:       {db:"DB Hip Thrust",          bb:"Barbell Hip Thrust",   big:true},
  press_flat:   {db:"Flat DB Bench Press",    bb:"Barbell Bench Press",  big:true},
  press_incline:{db:"Incline DB Press",       bb:"Barbell Incline Press",big:false},
  row:          {db:"One-Arm DB Row",         bb:"Barbell Row",          big:true},
  press_oh:     {db:"DB Overhead Press",      bb:"Overhead Press",       big:true},
  shrug:        {db:"DB Shrug",               bb:"Barbell Shrug",        big:false},
  curl:         {db:"DB Bicep Curl",          bb:"Barbell Curl",         big:false},
  triceps:      {db:"Overhead DB Tricep Extension", bb:"Skullcrusher",   big:false},
  calf:         {db:"Calf Raise",              bb:"Standing Barbell Calf Raise",big:false},
  carry:        {db:"Farmer Carry",             bb:"Front-Rack Carry",   big:false},
};
/* name-level refinements; null = never map this movement (keeps its intent) */
const BB_OVERRIDES={
  "DB Front Squat":"Front Squat","DB Sumo Deadlift":"Deadlift","DB Good Morning":"Barbell Good Morning",
  "DB Push Press":"Barbell Push Press","Gorilla Row":"Pendlay Row",
  "Single-Leg DB RDL":null,"DB Step-Up":null,"DB Renegade Row":null,"DB Upright Row":null,"DB High Pull":null,
};
const DB_OVERRIDES={
  "Front Squat":"DB Front Squat","Pendlay Row":"Gorilla Row","Barbell Push Press":"DB Push Press",
  "Barbell Good Morning":"DB Good Morning","Barbell Incline Press":"Incline DB Press","Skullcrusher":"DB Skullcrusher",
  "Barbell Reverse Lunge":"DB Reverse Lunge","Close-Grip Bench Press":"Close-Grip DB Press",
  "Rack Pull":"DB Romanian Deadlift","Barbell Rollout":null,
};
function mapExerciseForMode(name, mode){
  const e=exerciseByRef(name);
  if(!e) return name;
  if(!mode||mode==="db"){          // dumbbell mode: bring barbell movements down to DB equivalents
    if(e.equipment!=="barbell") return name;
    if(DB_OVERRIDES[name]!==undefined) return DB_OVERRIDES[name]||name;
    const a=e.pattern&&POOL_ANCHORS[e.pattern];
    return (a&&a.db)||name;
  }
  // combo / bb: upgrade dumbbell movements to the bar (bodyweight & pull-up work stays deliberate)
  if(e.equipment!=="dumbbell") return name;
  const a=e.pattern&&POOL_ANCHORS[e.pattern];
  if(BB_OVERRIDES[name]!==undefined){
    const o=BB_OVERRIDES[name]; if(!o) return name;
    return (mode==="bb"||(a&&a.big))?o:name;
  }
  if(!a||!a.bb) return name;
  return (mode==="bb"||a.big)?a.bb:name;
}
function targetForMappedExercise(target,source,mapped){
  let t=String(target||""); if(source===mapped) return t;
  const arm=/One-Arm|Single-Arm/.test(mapped), leg=/Single-Leg/.test(mapped), side=/Suitcase|Side Plank/.test(mapped);
  if(!arm) t=t.replace(/\s*\/\s*arm\b/i,"");
  if(!leg&&!/Lunge|Split Squat|Step-Up/.test(mapped)) t=t.replace(/\s*\/\s*leg\b/i,"");
  if(!side) t=t.replace(/\s*\/\s*side\b/i,"");
  if(arm&&!/\/\s*arm\b/i.test(t)) t+=" / arm";
  if(leg&&!/\/\s*leg\b/i.test(t)) t+=" / leg";
  if(side&&!/\/\s*side\b/i.test(t)) t+=" / side";
  return t.trim();
}
function equipMode(){ return state.settings.equipMode||"db"; }

/* ---------- Bodyweight "away day" program (no equipment) ---------- */
const BW_PROGRAM = { ex:[
  {name:"Bodyweight Squat",muscle:"Legs",his:[3,"20"],hers:[3,"15"],note:"Sit deep, chest up; control the descent."},
  {name:"Push-Up",muscle:"Chest",his:[4,"12-15"],hers:[3,"10-12"],note:"Body straight; lower chest to the floor. Drop to knees to scale."},
  {name:"Reverse Lunge",muscle:"Legs",his:[3,"12 / leg"],hers:[3,"10 / leg"],note:"Step back, drop the back knee straight down, drive through the front heel."},
  {name:"Pike Push-Up",muscle:"Shoulders",his:[3,"10-12"],hers:[3,"8-10"],note:"Hips high, head between hands; press up to lockout."},
  {name:"Single-Leg Glute Bridge",muscle:"Legs",his:[3,"12 / leg"],hers:[3,"12 / leg"],note:"Drive through the heel; squeeze the glute hard at the top."},
  {name:"Superman",muscle:"Back",his:[3,"15"],hers:[3,"12"],note:"Lift chest, arms and legs; squeeze 1s at the top."},
  {name:"Mountain Climbers",muscle:"Core",his:[3,"40 total"],hers:[3,"30 total"],note:"Plank position, hips low, drive knees fast."},
  {name:"Plank",muscle:"Core",his:[3,"45s"],hers:[3,"30s"],note:"Forearms down, straight line from head to heels."},
]};
function buildBodyweightPresets(){
  const variants=[
    ["his","His · Mass","💪 Push reps near failure, rest 45–60s."],
    ["hers","Hers · Tone","🔥 Keep moving, rest 20–40s."],
  ];
  return variants.map(([k,label,tip])=>({
    id:"preset-BW-"+k, preset:true, bodyweight:true,
    name:`Bodyweight Full Body (${label})`,
    note:"🧳 No equipment needed — do it anywhere.  "+tip,
    exercises: BW_PROGRAM.ex.map(e=>attachExerciseRef({name:e.name, muscle:e.muscle, sets:e[k][0], reps:e[k][1], note:e.note},e.name)),
  }));
}

/* ---------- Barbell strength days (standalone — start from Routines) ---------- */
const BARBELL_PROGRAM=[
  { key:"BB-L", title:"Barbell Lower",
    warmup:"Warm-up: 1–2 empty-bar sets of squats before loading.", ex:[
    {name:"Back Squat",muscle:"Legs",his:[4,"6"],hers:[3,"8-10"],note:"Bar on the upper traps; set the safeties just below your bottom position."},
    {name:"Romanian Deadlift",muscle:"Legs",his:[3,"8"],hers:[3,"10"],note:"Bar slides down the thighs; flat back, deep hamstring stretch."},
    {name:"Barbell Hip Thrust",muscle:"Legs",his:[3,"8-10"],hers:[4,"10-12"],note:"Upper back on the bench, bar padded across the hips; full lockout + squeeze."},
    {name:"Barbell Reverse Lunge",muscle:"Legs",his:[3,"8 / leg"],hers:[3,"10 / leg"],note:"Bar on the back; step back under control, drive through the front heel."},
    {name:"Barbell Rollout",muscle:"Core",his:[3,"8"],hers:[3,"6"],note:"Kneeling; roll out only as far as your flat back allows."},
  ]},
  { key:"BB-U", title:"Barbell Upper",
    warmup:"Warm-up: empty-bar bench + a few easy pulls before working weight.", ex:[
    {name:"Barbell Bench Press",muscle:"Chest",his:[4,"6"],hers:[3,"8-10"],note:"Safeties just below chest height; feet planted, blades pinched."},
    {name:"Barbell Row",muscle:"Back",his:[4,"6-8"],hers:[3,"10"],note:"Hinge to 45°; pull to the lower ribs, no heaving."},
    {name:"Overhead Press",muscle:"Shoulders",his:[3,"6-8"],hers:[3,"8-10"],note:"Bar is 44 lb empty — swap to DB press if that's too heavy today."},
    {name:"Pull-Up",muscle:"Back",his:[3,"6-10"],hers:[3,"3-6"],note:"Chin over the bar; scale with a band or slow 5s negatives."},
    {name:"DB Skullcrusher",muscle:"Arms",his:[3,"10"],hers:[3,"12"],note:"Only the forearms move; DBs lower beside the forehead."},
    {name:"Hanging Leg Raise",muscle:"Core",his:[3,"10"],hers:[3,"8"],note:"From the pull-up bar; curl the pelvis up, no swinging."},
  ]},
];
function buildBarbellPresets(){
  const variants=[
    ["his","His · Mass","🏋️ Strength focus — rest 2–3 min on the big lifts."],
    ["hers","Hers · Tone","🏋️ Strength focus — rest 60–90s, leave 1–2 reps in the tank."],
  ];
  const out=[];
  BARBELL_PROGRAM.forEach(day=>variants.forEach(([k,label,tip])=>{
    out.push({
      id:"preset-"+day.key+"-"+k, preset:true, barbell:true,
      name:`${day.title} (${label})`,
      note:(day.warmup?day.warmup+"  ":"")+tip,
      exercises: day.ex.map(e=>attachExerciseRef({name:e.name, muscle:e.muscle, sets:e[k][0], reps:e[k][1], note:e.note},e.name)),
    });
  }));
  return out;
}

/* ---------- Specialty workouts (4B — gap coverage) ---------- */
const SPECIALTY_PROGRAM=[
  {key:"SP-G",title:"G — Pull & Carry",equipment:"combo",ex:[
    {name:"Pull-Up",muscle:"Back",his:[4,"4-8"],hers:[4,"3-6"],note:"Use Assisted Pull-Up or Eccentric Pull-Up to keep every rep controlled."},
    {name:"Front Squat",muscle:"Legs",his:[3,"6-8"],hers:[3,"8-10"],note:"Use the rack safeties; equipment mode can map this to DB Front Squat."},
    {name:"Incline DB Press",muscle:"Chest",his:[3,"8-10"],hers:[3,"10-12"],note:"Bench around 30°; lower under control and keep the shoulder blades set."},
    {name:"Chest-Supported Rear-Delt Row",muscle:"Shoulders",his:[3,"10-12"],hers:[3,"12-15"],note:"Elbows wide, light load, chest stays on the bench."},
    {name:"Suitcase Carry",muscle:"Core",his:[3,"40s / side"],hers:[3,"30s / side"],note:"Walk tall and resist leaning toward the DB."},
    {name:"Hanging Knee Raise",muscle:"Core",his:[3,"8-12"],hers:[3,"6-10"],note:"Curl the pelvis up and reset all swinging between reps."},
  ]},
  {key:"SP-H",title:"H — Deadlift & Bench Strength",equipment:"barbell",ex:[
    {name:"Deadlift",muscle:"Back",his:[3,"3-5"],hers:[3,"5"],note:"Reset from the floor and brace before every rep; stop with 1–2 clean reps in reserve."},
    {name:"Barbell Bench Press",muscle:"Chest",his:[4,"5-8"],hers:[3,"6-8"],note:"Set safeties just below chest height and use collars."},
    {name:"Pull-Up",muscle:"Back",his:[3,"4-8"],hers:[3,"3-6"],note:"Scale with assistance or controlled 3–5s eccentrics."},
    {name:"Barbell Reverse Lunge",muscle:"Legs",his:[3,"8 / leg"],hers:[3,"8-10 / leg"],note:"Step back under control and drive through the front foot."},
    {name:"Standing Barbell Calf Raise",muscle:"Legs",his:[3,"10-15"],hers:[3,"12-15"],note:"Stay inside the rack with safeties set; pause high and lower fully."},
    {name:"Barbell Rollout",muscle:"Core",his:[3,"6-10"],hers:[3,"5-8"],note:"Use only the range that keeps the ribs and pelvis connected."},
  ]},
  {key:"SP-I",title:"I — Upper Back & Shoulder Quality",equipment:"combo",ex:[
    {name:"Scapular Pull-Up",muscle:"Back",his:[3,"6-10"],hers:[3,"6-10"],note:"Straight elbows; move only through the shoulder blades."},
    {name:"Chest-Supported Rear-Delt Row",muscle:"Shoulders",his:[3,"12-15"],hers:[3,"12-15"],note:"Use a light strict load with wide elbows."},
    {name:"Prone Y-T-W Raise",muscle:"Shoulders",his:[2,"6 each"],hers:[2,"6 each"],note:"Bodyweight or very light DBs; no shrugging or lower-back extension."},
    {name:"Single-Arm DB Press",muscle:"Shoulders",his:[3,"8 / arm"],hers:[3,"8-10 / arm"],note:"Stay tall against the offset load and finish each side before switching."},
    {name:"Farmer Carry",muscle:"Core",his:[4,"40s"],hers:[4,"30s"],note:"Clear the lane, walk with short steps, and set the DBs down before grip fails."},
    {name:"Side Plank",muscle:"Core",his:[3,"30-40s / side"],hers:[3,"20-30s / side"],note:"Stack the body in one line; bend the knees to scale."},
  ]},
];
function buildSpecialtyPresets(){
  const variants=[
    ["his","His · Mass","Use the listed ranges and leave 1–2 clean reps in reserve."],
    ["hers","Hers · Tone","Use the listed ranges with smooth reps and the same 1–2 rep reserve."],
  ];
  const out=[];
  SPECIALTY_PROGRAM.forEach(day=>variants.forEach(([k,label,tip])=>out.push({
    id:"preset-"+day.key+"-"+k,preset:true,specialty:true,barbell:day.equipment==="barbell",
    name:`${day.title} (${label})`,note:`Specialty workout · ${tip}`,
    exercises:day.ex.map(e=>attachExerciseRef({name:e.name,muscle:e.muscle,sets:e[k][0],reps:e[k][1],note:e.note},e.name)),
  })));
  return out;
}

function migrateExerciseData(){
  const changed=new Set(), merged=[], byKey=new Map();
  (state.exercises||[]).forEach(raw=>{
    if(!raw||!raw.name) return;
    const wasName=raw.name, isAlias=!!EXERCISE_ALIASES[wasName];
    const name=isAlias?canonicalExerciseName(wasName):String(wasName).trim();
    const custom=!!raw.custom&&!isAlias;
    const key=custom?(raw.key||"custom:"+(raw.id||exerciseSlug(name))):canonicalExerciseKey(name);
    const ex={...raw,name,key,id:raw.id||key,custom};
    if(name!==wasName||raw.key!==key||raw.custom!==custom) changed.add("exercises");
    const prior=byKey.get(key);
    if(prior){
      ["personalCue","desc"].forEach(k=>{ if(!prior[k]&&ex[k]) prior[k]=ex[k]; });
      if(ex.favorite) prior.favorite=true;
      changed.add("exercises");
    } else { byKey.set(key,ex); merged.push(ex); }
  });
  state.exercises=merged;
  const migrateRefs=(items,key)=>{
    (items||[]).forEach(item=>{
      if(!item||!item.name) return;
      const name=canonicalExerciseName(item.name), lib=state.exercises.find(e=>e.name===name), exerciseKey=(lib&&lib.key)||canonicalExerciseKey(name);
      if(item.name!==name||item.exerciseKey!==exerciseKey){ item.name=name; item.exerciseKey=exerciseKey; changed.add(key); }
    });
  };
  (state.routines||[]).forEach(r=>migrateRefs(r.exercises,"routines"));
  (state.workouts||[]).forEach(w=>migrateRefs(w.exercises,"workouts"));
  if(state.active) migrateRefs(state.active.exercises,"active");
  changed.forEach(k=>DB.set(k,state[k]));
  return changed;
}

function seedData(){
  const migrated=migrateExerciseData();
  // make sure every program exercise exists in the library (match by name)
  let changed=migrated.has("exercises");
  DEFAULT_EXERCISES.forEach(de=>{ if(!state.exercises.some(e=>e.name===de.name)){ state.exercises.push({...de}); changed=true; } });
  // ensure every movement-pool exercise exists AND is tagged with its pattern
  Object.entries(MOVEMENT_POOLS).forEach(([pat,pool])=>{
    pool.list.forEach(name=>{
      let ex=state.exercises.find(e=>e.name===name);
      if(!ex){ const key=canonicalExerciseKey(name); ex={id:key,key,name,muscle:pool.muscle,custom:false}; state.exercises.push(ex); changed=true; }
      if(ex.pattern!==pat){ ex.pattern=pat; changed=true; }
    });
  });
  // tag every known exercise with stable identity, equipment, and structured metadata.
  state.exercises.forEach(ex=>{
    if(ex.custom){ if(!ex.key){ ex.key="custom:"+ex.id; changed=true; } return; }
    const q=equipFor(ex.name), meta=metadataFor(ex.name,ex.muscle,q,ex.pattern);
    if(q&&ex.equipment!==q){ ex.equipment=q; changed=true; }
    Object.entries(meta).forEach(([k,v])=>{ if(JSON.stringify(ex[k])!==JSON.stringify(v)){ ex[k]=v; changed=true; } });
  });
  if(changed) save("exercises");
  // seed the preset routines exactly once (user can edit/delete afterward)
  if(!DB.get("seed_v1", false)){
    const ids=new Set(state.routines.map(r=>r.id));
    buildPresets().forEach(p=>{ if(!ids.has(p.id)) state.routines.push(p); });
    save("routines"); DB.set("seed_v1", true);
  }
  // seed the bodyweight away-day routines once (added later, so its own flag)
  if(!DB.get("seed_bw", false)){
    const ids=new Set(state.routines.map(r=>r.id));
    buildBodyweightPresets().forEach(p=>{ if(!ids.has(p.id)) state.routines.push(p); });
    save("routines"); DB.set("seed_bw", true);
  }
  // seed the week-2 D/E/F routines once (added later, so its own flag)
  if(!DB.get("seed_v2", false)){
    const ids=new Set(state.routines.map(r=>r.id));
    buildPresets().forEach(p=>{ if(!ids.has(p.id)) state.routines.push(p); });
    save("routines"); DB.set("seed_v2", true);
  }
  // seed the standalone barbell strength routines once
  if(!DB.get("seed_v3", false)){
    const ids=new Set(state.routines.map(r=>r.id));
    buildBarbellPresets().forEach(p=>{ if(!ids.has(p.id)) state.routines.push(p); });
    save("routines"); DB.set("seed_v3", true);
  }
  // seed the 4B specialty routines once; existing routine edits remain untouched.
  if(!DB.get("seed_v4b", false)){
    const ids=new Set(state.routines.map(r=>r.id));
    buildSpecialtyPresets().forEach(p=>{ if(!ids.has(p.id)) state.routines.push(p); });
    save("routines"); DB.set("seed_v4b", true);
  }
  // anchor the 2-week rotation so the week this feature arrived stays A/B/C
  if(!state.plan.cycleAnchor){
    const d=new Date(weekStartTs(Date.now()));
    state.plan.cycleAnchor=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
    save("plan");
  }
}

/* ---------- Weekly schedule (Mon/Wed/Fri; A/B/C and D/E/F alternate weeks) ---------- */
const WEEK_PLANS = {1:{1:"A",3:"B",5:"C"}, 2:{1:"D",3:"E",5:"F"}};   // JS getDay(): 0=Sun … 6=Sat
const DAY_NAME  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_INIT  = ["S","M","T","W","T","F","S"];
/* which rotation week (1 or 2) a timestamp falls in, anchored so the rollout week stayed A/B/C */
function cycleWeekOf(ts){
  const a=state.plan&&state.plan.cycleAnchor; if(!a) return 1;
  const n=Math.round((weekStartTs(ts)-weekStartTs(isoToTs(a)))/(7*86400000));
  return ((n%2)+2)%2===0 ? 1 : 2;
}
function planFor(ts){ return WEEK_PLANS[cycleWeekOf(ts)]; }
function programTitle(key){ const d=ALL_PROGRAM.find(p=>p.key===key); return d?`Workout ${key} — ${d.title}`:`Workout ${key}`; }
function planRoutine(key,variant){ return state.routines.find(r=>r.id==="preset-"+key+"-"+variant); }
function nextPlanDay(fromTs){
  for(let i=1;i<=14;i++){ const ts=fromTs+i*86400000; const d=new Date(ts).getDay();
    const k=planFor(ts)[d]; if(k) return {dow:d, key:k}; }
  return null;
}
function restorePresets(){ const ids=new Set(state.routines.map(r=>r.id));
  buildPresets().concat(buildBodyweightPresets(), buildBarbellPresets(), buildSpecialtyPresets()).forEach(p=>{ if(!ids.has(p.id)) state.routines.push(p); }); save("routines"); }
function startBodyweight(){
  const variant=state.settings.planVariant||"his";
  let r=state.routines.find(x=>x.id==="preset-BW-"+variant);
  if(!r){ const ids=new Set(state.routines.map(x=>x.id)); buildBodyweightPresets().forEach(p=>{ if(!ids.has(p.id)) state.routines.push(p); }); save("routines"); r=state.routines.find(x=>x.id==="preset-BW-"+variant); }
  if(r) startFromRoutine(r.id);
}
function addDaysISO(iso,n){ const [y,m,d]=iso.split("-").map(Number); const dt=new Date(y,m-1,d+n);
  return dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0"); }
function dowOfISO(iso){ const [y,m,d]=iso.split("-").map(Number); return new Date(y,m-1,d).getDay(); }
function originDow(key){ const wp=planFor(Date.now()); for(let d=0;d<7;d++) if(wp[d]===key) return d; return null; }
function weekISO(ts=Date.now()){ const d=new Date(weekStartTs(ts)); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function deloadActive(ts=Date.now()){ return !!(state.plan&&state.plan.deloadWeek===weekISO(ts)); }
function deloadSetCount(n){ return Math.max(1,Math.ceil((Number(n)||1)*2/3)); }
function toggleDeload(){
  if(deloadActive()){ state.plan.deloadWeek=null; save("plan"); render(); toast("Deload week ended"); }
  else { state.plan.deloadWeek=weekISO(); save("plan"); render(); toast("Deload active · working sets reduced","leaf"); }
}

/* what workout (if any) is due today, accounting for deferrals */
function planState(){
  const dow=new Date().getDay(), today=todayISO(), p=state.plan;
  const wp=planFor(Date.now());
  let due=null;
  if(p.deferred && p.deferred.dueISO<=today){
    due={key:p.deferred.key, deferred:true, count:p.deferred.count, overdue:p.deferred.dueISO<today};
  } else if(wp[dow] && !(p.deferred && p.deferred.key===wp[dow])){
    due={key:wp[dow], deferred:false, count:0, overdue:false};
  }
  return {dow, today, p, due};
}
/* press "defer until tomorrow": 1st defer → move to tomorrow; 2nd → skip. Always +1 penalty set. */
function deferDue(){
  const {today,p,due}=planState(); if(!due) return;
  p.penaltySets=(p.penaltySets||0)+1;
  const newCount=(due.count||0)+1;
  if(newCount>1){
    p.deferred=null; save("plan"); render();
    toast(`Workout ${due.key} skipped — moving on · ${p.penaltySets} BW set${p.penaltySets!==1?"s":""} owed`,"skip");
  } else {
    p.deferred={key:due.key, dueISO:addDaysISO(today,1), count:1}; save("plan"); render();
    toast(`Deferred to tomorrow · ${p.penaltySets} BW set${p.penaltySets!==1?"s":""} owed`,"clock");
  }
}
function knockPenalty(){ const p=state.plan; if(p.penaltySets>0){ p.penaltySets--; save("plan"); render(); toast("Nice — 1 set knocked out","check"); } }

/* ---------- App state ---------- */
const state = {
  settings: DB.get("settings", {unit:"lb", restDefault:-1, barWeight:45, platePairs:DEFAULT_PLATE_PAIRS}),
  exercises: DB.get("exercises", DEFAULT_EXERCISES),
  routines: DB.get("routines", []),
  workouts: DB.get("workouts", []),     // completed, newest first
  active: DB.get("active", null),        // in-progress workout
  plan: DB.get("plan", {penaltySets:0, deferred:null}),  // deferral + penalty tracking
  bodyweights: DB.get("bodyweights", []),  // [{dateISO, weight}] newest-last
  deleted: DB.get("deleted", []),  // tombstones [{id,ts}] so deletes survive sync merges
};
if(!state.plan) state.plan={penaltySets:0, deferred:null};
if(!state.bodyweights) state.bodyweights=[];
if(!state.deleted) state.deleted=[];
function save(key){ DB.set(key, state[key]); if(key!=="active"){ localStorage.setItem("forge_updatedAt", String(Date.now())); schedulePush(); } }
const U = () => state.settings.unit;
/* v14: replace the old one-size-fits-all rest setting with adaptive presets. */
if(!state.settings.restPresetV1){
  state.settings.restDefault=-1; state.settings.restPresetV1=true; save("settings");
}
if(!state.settings.platePairs){ state.settings.platePairs={...DEFAULT_PLATE_PAIRS}; save("settings"); }
if(!state.settings.barWeight){ state.settings.barWeight=45; save("settings"); }

/* ---------- Cloud backup (sync to the home server) ---------- */
const DATA_VERSION=2;
const SYNC_KEYS = ["settings","exercises","routines","workouts","plan","bodyweights","deleted"];
let _pushT=null, _syncing=false;
function syncName(){ return (state.settings.syncName||"").trim(); }
function localUpdated(){ return Number(localStorage.getItem("forge_updatedAt")||0); }
function snapshot(){ const o={v:DATA_VERSION, updated:localUpdated()||Date.now()}; SYNC_KEYS.forEach(k=>o[k]=state[k]); return o; }
function applySnapshot(s){ SYNC_KEYS.forEach(k=>{ if(s[k]!==undefined){ state[k]=s[k]; DB.set(k,s[k]); } });
  const received=JSON.stringify(SYNC_KEYS.map(k=>state[k]));
  migrateExerciseData(); seedData();
  const normalized=received!==JSON.stringify(SYNC_KEYS.map(k=>state[k]));
  localStorage.setItem("forge_updatedAt", String(normalized?Math.max(Date.now(),(s.updated||0)+1):(s.updated||Date.now()))); render(); }
function schedulePush(){ if(!syncName()) return; clearTimeout(_pushT); _pushT=setTimeout(syncNow,1500); }

/* Merge two snapshots (b is the newer by .updated).
   Workouts/bodyweights are append-only records → union them so a stale device
   can never clobber history. Everything else is last-write-wins as before. */
function mergeSnapshots(a,b){
  const out={v:Math.max(DATA_VERSION,a.v||1,b.v||1)};
  SYNC_KEYS.forEach(k=>{ out[k] = b[k]!==undefined ? b[k] : a[k]; });   // LWW default
  // deletion tombstones: union, keep 90 days
  const tm={}; [...(a.deleted||[]),...(b.deleted||[])].forEach(t=>{ if(t&&t.id&&(!tm[t.id]||t.ts>tm[t.id].ts)) tm[t.id]=t; });
  const cutoff=Date.now()-90*86400000;
  out.deleted=Object.values(tm).filter(t=>t.ts>cutoff);
  const dead=new Set(out.deleted.map(t=>t.id));
  // workouts: union by id minus tombstones, newest first
  const wm={}; [...(a.workouts||[]),...(b.workouts||[])].forEach(w=>{ if(w&&w.id&&!dead.has(w.id)){
    const prev=wm[w.id]; if(!prev||(w.editedAt||0)>=(prev.editedAt||0)) wm[w.id]=w;
  } });
  out.workouts=Object.values(wm).sort((x,y)=>y.end-x.end);
  // bodyweights: union by date, newer snapshot wins a same-day conflict
  const bm={}; [...(a.bodyweights||[]),...(b.bodyweights||[])].forEach(x=>{ if(x&&x.dateISO) bm[x.dateISO]=x; });
  out.bodyweights=Object.values(bm).sort((x,y)=>x.dateISO.localeCompare(y.dateISO));
  out.updated=Math.max(a.updated||0, b.updated||0);
  return out;
}
function snapCore(s){ return JSON.stringify(SYNC_KEYS.map(k=>s[k])); }

/* one sync routine for both directions: GET server → merge → apply + PUT what changed */
async function syncNow(){
  if(!syncName()||_syncing) return false;
  _syncing=true;
  try{
    const name=encodeURIComponent(syncName());
    let server;
    try{ const res=await fetch("api/data/"+name); if(!res.ok) return false; server=await res.json(); }
    catch(e){ return false; }
    const local=snapshot();
    let merged=local;
    if(server && server.updated){
      merged = server.updated>=local.updated ? mergeSnapshots(local,server) : mergeSnapshots(server,local);
    }
    if(snapCore(merged)!==snapCore(local)) applySnapshot(merged);
    else if(merged.updated>localUpdated()) localStorage.setItem("forge_updatedAt", String(merged.updated));
    if(!server || !server.updated || snapCore(merged)!==snapCore(server)){
      try{
        const put=await fetch("api/data/"+name,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(merged)});
        if(!put.ok) return false;
      }catch(e){ return false; }
    }
    localStorage.setItem("forge_lastBackup", String(Date.now()));
    return true;
  } finally { _syncing=false; }
}

/* ---------- Wake lock (keep screen on during a workout) ---------- */
let _wakeLock=null;
async function acquireWake(){ try{ if(state.settings.keepAwake!==false && "wakeLock" in navigator){ _wakeLock=await navigator.wakeLock.request("screen"); } }catch(e){} }
function releaseWake(){ try{ if(_wakeLock){ _wakeLock.release(); _wakeLock=null; } }catch(e){} }
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible" && state.active && peek().screen==="workout") acquireWake(); });

/* ---------- Audio cue (rest-timer beep) ---------- */
let _audioCtx=null;
function unlockAudio(){ try{ if(!_audioCtx){ const C=window.AudioContext||window.webkitAudioContext; if(C) _audioCtx=new C(); } if(_audioCtx&&_audioCtx.state==="suspended") _audioCtx.resume(); }catch(e){} }
function beep(times=2){ if(state.settings.soundOn===false) return; try{ unlockAudio(); if(!_audioCtx) return;
  for(let i=0;i<times;i++){ const t=_audioCtx.currentTime+i*0.28; const o=_audioCtx.createOscillator(),g=_audioCtx.createGain();
    o.type="sine"; o.frequency.value=880; o.connect(g); g.connect(_audioCtx.destination);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.32,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.22);
    o.start(t); o.stop(t+0.24); } }catch(e){} }

/* ---------- Rest-over notification (when the app is in the background) ---------- */
async function notifyRestOver(){
  if(state.settings.notifyRest!==true) return;
  try{
    if(!("Notification" in window) || Notification.permission!=="granted") return;
    const reg=await navigator.serviceWorker.getRegistration(); if(!reg) return;
    reg.showNotification("Rest over 💪",{
      body:"Back to work — next set is up.",
      tag:"forge-rest", renotify:true, icon:"icon.svg", badge:"icon.svg", vibrate:[120,60,120],
    });
  }catch(e){}
}

/* ---------- PR detection (best e1RM / weight from completed history) ---------- */
function historicalBest(exName){ let e=0,w=0;
  state.workouts.forEach(wk=>wk.exercises.filter(x=>sameExercise(x,exName)).forEach(x=>x.sets.forEach(s=>{ e=Math.max(e,epley(s.weight,s.reps)); w=Math.max(w,Number(s.weight)||0); })));
  return {e,w}; }


/* ==================== DOM helpers ==================== */
/* ---------- Helpers ---------- */
const $ = (sel,el=document)=>el.querySelector(sel);
function el(html){ const t=document.createElement("template"); t.innerHTML=html.trim(); return t.content.firstChild; }
function esc(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

/* ==================== Formatting, volume and date helpers ==================== */
function fmtNum(n){ return Number.isInteger(n)?n:(Math.round(n*10)/10); }
function volumeFactors(ex){
  const lib=exerciseByRef(ex)||{}, target=String((ex&&ex.target)||"");
  const loadCount=Math.max(1,Number((ex&&ex.loadCount)||lib.loadCount)||inferredLoadCount((ex&&ex.name)||lib.name||"",lib.equipment));
  const explicitTotal=/\btotal\b/i.test(target), explicitSide=/\/\s*(?:arm|leg|side)\b/i.test(target);
  const sideCount=explicitTotal?1:(explicitSide||((ex&&ex.repMode)||lib.repMode)==="per_side"?2:1);
  return {loadCount,sideCount,multiplier:loadCount*sideCount,equipment:lib.equipment||""};
}
function volumeRuleText(ex,short=false){
  const f=volumeFactors(ex), parts=[];
  if(f.loadCount===2) parts.push("both dumbbells");
  if(f.sideCount===2) parts.push("both sides");
  if(short) return parts.length?`Volume counts ${parts.join(" and ")} automatically.`:"Volume uses the logged weight and reps.";
  const name=(ex&&ex.name)||"";
  const entry=name==="Weighted Pull-Up"?"Enter only the added external load; bodyweight is not included.":name==="Plate Pinch Hold"?"Enter the total plate weight being held.":f.equipment==="dumbbell"?(f.loadCount===2?"Enter the weight shown on one dumbbell; Forge counts the pair.":"Enter the weight of the single dumbbell."):f.equipment==="barbell"?"Enter the total loaded bar weight.":"Enter the total external load used.";
  return `${entry}${f.sideCount===2?" Reps are per side, and Forge counts both sides.":" Reps are counted as entered."}`;
}
function setVolume(s,ex){ const f=volumeFactors(ex); return (Number(s.weight)||0)*(Number(s.reps)||0)*f.multiplier; }
function workoutVolume(w){ let v=0; w.exercises.forEach(e=>e.sets.forEach(s=>{ if(s.done) v+=setVolume(s,e); })); return v; }
function workoutSets(w){ let n=0; w.exercises.forEach(e=>e.sets.forEach(s=>{ if(s.done) n++; })); return n; }
function epley(weight,reps){ const wt=Number(weight)||0, r=Number(reps)||0; if(!wt||!r) return 0; return wt*(1+r/30); }
function fmtDate(ts){ const d=new Date(ts); return d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}); }
function todayISO(){ const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function isoToTs(iso){ if(!iso) return Date.now(); const [y,m,d]=iso.split("-").map(Number); const n=new Date(); return new Date(y,m-1,d,n.getHours(),n.getMinutes(),n.getSeconds()).getTime(); }
function fmtDay(ts){ const d=new Date(ts); return d.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"}); }
function fmtDur(ms){ const s=Math.floor(ms/1000); const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60;
  return (h?h+":":"")+String(m).padStart(h?2:1,"0")+":"+String(ss).padStart(2,"0"); }
function relTime(ts){ const d=Math.floor((Date.now()-ts)/86400000); if(d<=0)return"Today"; if(d===1)return"Yesterday"; if(d<7)return d+" days ago"; return fmtDate(ts); }
function exById(id){ return state.exercises.find(e=>e.id===id); }
function personalCueFor(name){ const e=exerciseByRef(name); return (e&&e.personalCue||"").trim(); }

/* ==================== Last performance and progressive-overload suggestions ==================== */
/* find last performed set values for an exercise (for "prev" hints) */
function lastPerformance(exName){
  for(const w of state.workouts){
    const ex = w.exercises.find(e=>sameExercise(e,exName));
    if(ex){ const done = ex.sets.filter(s=>s.done && (s.weight||s.reps)); if(done.length) return done; }
  }
  return null;
}

/* ---------- Progressive overload suggestions ---------- */
/* "8-10" → {lo:8,hi:10} · "12 total"/"8 / arm" → {lo:12,hi:12} · "45s" → time-based */
function parseRepRange(target){
  if(!target) return null;
  const t=String(target).trim();
  const time=/^(\d+)\s*s$/i.exec(t);
  if(time) return {lo:+time[1], hi:+time[1], time:true};
  const m=/(\d+)\s*-\s*(\d+)/.exec(t) || /(\d+)/.exec(t);
  if(!m) return null;
  return {lo:+m[1], hi:+(m[2]||m[1]), time:false};
}
/* smaller jumps for isolation work; the barbell floors at 5 lb (2.5s load in pairs) */
function progressIncrement(ex){
  const lib=exerciseByRef(ex);
  if(lib&&lib.equipment==="barbell") return U()==="kg" ? 2.5 : 5;
  const small=["Arms","Shoulders","Core"].includes(ex.muscle);
  return U()==="kg" ? (small?1.25:2.5) : (small?2.5:5);
}
/* Suggest the next step based on last performance vs the target rep range:
   hit the top of the range on every set → add weight (or a rep for bodyweight /
   seconds for timed holds); otherwise → chase reps at the same weight. */
function suggestNext(ex, prevSets){
  if(!prevSets||!prevSets.length) return null;
  const range=parseRepRange(ex.target); if(!range) return null;
  const reps=prevSets.map(s=>Number(s.reps)||0);
  if(!reps.some(r=>r>0)) return null;
  const topW=Math.max(...prevSets.map(s=>Number(s.weight)||0));
  const allTop=reps.every(r=>r>=range.hi);
  if(range.time){
    if(allTop) return {type:"time", add:5, text:`Try ${range.hi+5}s — you owned ${range.hi}s last time`};
    return {type:"reps", hi:range.hi, text:`Build toward ${range.hi}s per set`};
  }
  if(allTop){
    if(topW>0){
      const w=topW+progressIncrement(ex);
      return {type:"weight", weight:w, reps:range.lo,
        text:`Try ${fmtNum(w)} ${U()} × ${range.lo} — you hit the top of the rep range last time`};
    }
    return {type:"reps", hi:range.hi+1, text:`Try +1 rep per set — you topped out at ${range.hi}`};
  }
  return {type:"reps", hi:range.hi,
    text:`Add a rep where you can — top of range is ${range.hi}${topW>0?` at ${fmtNum(topW)} ${U()}`:""}`};
}

/* ==================== Workout generator ==================== */
/* ---------- On-the-fly workout generator ---------- */
const GENERATOR_MUSCLES=["Chest","Back","Legs","Shoulders","Arms","Core"];
const GENERATOR_EQUIPMENT=["dumbbell","barbell","bodyweight","pullup"];
const GENERATOR_ISOLATION=new Set(["knee_extension","knee_flexion","hip_abduction","fly","scapular","lateral","rotator","curl","triceps","forearm","calf","core_rot","core_stab","core_flexion","core_lateral","pullup_skill"]);
let generatorState=null;
function defaultGeneratorEquipment(){
  const mode=equipMode();
  if(mode==="bb") return new Set(["barbell","bodyweight","pullup"]);
  if(mode==="combo") return new Set(["dumbbell","barbell","bodyweight","pullup"]);
  return new Set(["dumbbell","bodyweight","pullup"]);
}
function ensureGeneratorState(){
  if(!generatorState) generatorState={muscles:new Set(),equipment:defaultGeneratorEquipment(),size:6,draft:null};
  return generatorState;
}
function shuffled(items){ const a=[...items]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function recentGeneratorKeys(){
  const keys=new Set();
  state.workouts.slice(0,2).forEach(w=>w.exercises.forEach(ex=>keys.add(exerciseKeyOf(ex))));
  return keys;
}
function generatorIsCompound(ex){ return !GENERATOR_ISOLATION.has(ex.pattern); }
function generatorSideSuffix(ex){
  if(ex.repMode!=="per_side") return "";
  if(/Curl|External Rotation|One-Arm|Single-Arm|Lateral Raise/.test(ex.name)) return " / arm";
  if(/Leg|Lunge|Split Squat|Calf Raise/.test(ex.name)) return " / leg";
  return " / side";
}
function generatorPrescription(ex){
  const hers=(state.settings.planVariant||"his")==="hers";
  let sets=3, reps;
  if(ex.name==="Weighted Pull-Up") reps=hers?"3-6":"4-6";
  else if(ex.name==="Pull-Up"||ex.name==="Chin-Up") reps=hers?"3-6":"4-8";
  else if(ex.pattern==="carry"||ex.pattern==="pullup_skill"||ex.pattern==="core_lateral"||ex.name==="Plate Pinch Hold") reps=hers?"25-35s":"30-45s";
  else if(generatorIsCompound(ex)){
    if(ex.equipment==="barbell"){ sets=hers?3:4; reps=hers?"8-10":"5-8"; }
    else reps=hers?"10-15":"8-12";
  } else reps=hers?"12-15":"10-15";
  return {sets,reps:reps+generatorSideSuffix(ex)};
}
function generatorCandidates(cfg,muscle,exclude=new Set()){
  return state.exercises.filter(ex=>ex.muscle===muscle&&cfg.equipment.has(ex.equipment)&&!exclude.has(exerciseKeyOf(ex))&&ex.pattern&&ex.equipment!=="gym");
}
function pickGeneratedExercise(cfg,muscle,chosen,recent,avoid=new Set()){
  const excluded=new Set(chosen.map(ex=>exerciseKeyOf(ex)));
  let candidates=generatorCandidates(cfg,muscle,excluded);
  if(!candidates.length) return null;
  const usedPatterns=new Set(chosen.map(ex=>ex.pattern)), equipmentCounts={};
  chosen.forEach(ex=>equipmentCounts[ex.equipment]=(equipmentCounts[ex.equipment]||0)+1);
  candidates=candidates.map(ex=>{
    let score=Math.random()*12;
    score+=usedPatterns.has(ex.pattern)?-15:28;
    score+=recent.has(exerciseKeyOf(ex))?-9:14;
    score+=avoid.has(exerciseKeyOf(ex))?-18:0;
    score-=Number(equipmentCounts[ex.equipment]||0)*2;
    if(!chosen.some(x=>x.muscle===muscle)&&generatorIsCompound(ex)) score+=10;
    if(ex.difficulty==="advanced") score-=8;
    return {ex,score};
  }).sort((a,b)=>b.score-a.score);
  return candidates[0].ex;
}
function generatedWorkoutName(muscles){ return `Generated ${muscles.join(" + ")}`; }
function generateWorkoutDraft(cfg,previous){
  if(!cfg.muscles.size){ toast("Choose at least one muscle group"); return null; }
  if(!cfg.equipment.size){ toast("Choose at least one equipment option"); return null; }
  if(cfg.muscles.size>cfg.size){ toast(`Choose at most ${cfg.size} muscle groups for a ${cfg.size}-exercise workout`); return null; }
  const muscles=shuffled([...cfg.muscles]), recent=recentGeneratorKeys(), avoid=new Set((previous&&previous.exercises||[]).map(ex=>exerciseKeyOf(ex)));
  for(const muscle of muscles){
    if(!generatorCandidates(cfg,muscle).length){ toast(`No ${muscle.toLowerCase()} movements match that equipment selection`); return null; }
  }
  const chosen=[], counts={};
  muscles.forEach(muscle=>{
    const ex=pickGeneratedExercise(cfg,muscle,chosen,recent,avoid);
    if(ex){ chosen.push(ex); counts[muscle]=1; }
  });
  while(chosen.length<cfg.size){
    const order=shuffled(muscles).sort((a,b)=>(counts[a]||0)-(counts[b]||0));
    let added=false;
    for(const muscle of order){
      const ex=pickGeneratedExercise(cfg,muscle,chosen,recent,avoid);
      if(ex){ chosen.push(ex); counts[muscle]=(counts[muscle]||0)+1; added=true; break; }
    }
    if(!added) break;
  }
  if(chosen.length<cfg.size){ toast(`Only ${chosen.length} diverse movements match those selections`); }
  chosen.sort((a,b)=>Number(!generatorIsCompound(a))-Number(!generatorIsCompound(b)));
  const exercises=chosen.map(ex=>{ const p=generatorPrescription(ex); return attachExerciseRef({name:ex.name,muscle:ex.muscle,sets:p.sets,reps:p.reps,note:""},ex.name); });
  return {id:uid(),name:generatedWorkoutName([...cfg.muscles]),note:`Generated for ${variantLabel()} · balanced across selected muscles and equipment.`,generated:true,exercises};
}
function swapGeneratedExercise(index){
  const cfg=ensureGeneratorState(), draft=cfg.draft, current=draft&&draft.exercises[index]; if(!current) return;
  const chosen=draft.exercises.map(ex=>exerciseByRef(ex)).filter(Boolean), recent=recentGeneratorKeys(), avoid=new Set([exerciseKeyOf(current)]);
  const replacement=pickGeneratedExercise(cfg,current.muscle,chosen,recent,avoid);
  if(!replacement){ toast("No other matching movement is available"); return; }
  const p=generatorPrescription(replacement);
  draft.exercises[index]=attachExerciseRef({name:replacement.name,muscle:replacement.muscle,sets:p.sets,reps:p.reps,note:""},replacement.name);
  render();
}
async function startGeneratedWorkout(draft){
  if(state.active && !(await confirmAct("You already have a workout in progress. Discard it and start this generated workout?",{title:"Workout in progress",confirmText:"Discard & start"}))) return;
  state.active={id:uid(),name:draft.name,start:Date.now(),date:todayISO(),note:draft.note,generated:true,
    exercises:draft.exercises.map(re=>attachExerciseRef({id:uid(),name:re.name,muscle:re.muscle,target:re.reps,note:re.note||"",
      sets:Array.from({length:Number(re.sets)||1},()=>({weight:"",reps:"",done:false}))},re.name))};
  generatorState.draft=null; save("active"); setTab("home"); go("workout");
}

/* ==================== Streak ==================== */
function computeStreak(){
  // consecutive weeks (incl current) with >=1 workout
  if(!state.workouts.length) return 0;
  const weekKey = ts=>{ const d=new Date(ts); const onejan=new Date(d.getFullYear(),0,1);
    return d.getFullYear()*100 + Math.ceil((((d-onejan)/86400000)+onejan.getDay()+1)/7); };
  const weeks = new Set(state.workouts.map(w=>weekKey(w.end)));
  let streak=0, cur=Date.now();
  for(let i=0;i<260;i++){ if(weeks.has(weekKey(cur))){streak++; cur-=7*86400000;} else { if(i===0){cur-=7*86400000; continue;} break; } }
  return streak;
}

/* ==================== Labels ==================== */
function variantLabel(v=state.settings.planVariant||"his"){ return v==="hers"?"Hers · Tone":"His · Mass"; }
function equipModeLabel(v=equipMode()){ return v==="bb"?"Barbell":v==="db"?"Dumbbell":"Combo"; }

/* ==================== Starting workouts ==================== */
async function startEmpty(){
  if(state.active && !(await confirmAct("You already have a workout in progress. Discard it and start a new one?",{title:"Workout in progress",confirmText:"Discard & start"}))) return;
  state.active = {id:uid(), name:"Workout", start:Date.now(), date:todayISO(), exercises:[]};
  save("active"); go("workout");
}
async function startFromRoutine(rid, planKey){
  const r = state.routines.find(x=>x.id===rid); if(!r) return;
  if(state.active && !(await confirmAct("Discard the workout in progress and start this routine?",{title:"Workout in progress",confirmText:"Discard & start"}))) return;
  const mode = r.bodyweight ? "db" : equipMode();   // away-day routine stays as authored
  const isDeload=deloadActive();
  state.active = {id:uid(), name:r.name, start:Date.now(), date:todayISO(), note:r.note||"", planKey:planKey||null, deload:isDeload,
    exercises: r.exercises.map(re=>{
      const mapped = mapExerciseForMode(re.name, mode);
      const lib = mapped!==re.name && exerciseByRef(mapped);
      return attachExerciseRef({ id:uid(), name:mapped, muscle:(lib&&lib.muscle)||re.muscle,
        note: mapped===re.name ? (re.note||"") : "",   // old form cue doesn't apply; ⓘ has the how-to
        target:targetForMappedExercise(re.reps||"",re.name,mapped),
        sets: Array.from({length:isDeload?deloadSetCount(re.sets):re.sets||1}, ()=>({weight:"",reps:"",done:false})) },mapped);
    })
  };
  save("active"); setTab("home"); go("workout");
}

/* ==================== Set progress ==================== */
function workoutSetProgress(w){
  const total=w.exercises.reduce((n,e)=>n+e.sets.length,0), done=w.exercises.reduce((n,e)=>n+e.sets.filter(s=>s.done).length,0);
  return {total,done,pct:total?Math.round(done/total*100):0};
}

/* ==================== Movement shuffles ==================== */
/* swap one exercise to a random same-pattern alternate (keeps sets + target reps) */
function shuffleExercise(ei){
  const w=state.active; const ex=w.exercises[ei]; const alts=altsFor(ex.name);
  if(!alts.length){ toast("No alternates for this movement"); return; }
  const pick=alts[Math.floor(Math.random()*alts.length)];
  ex.name=pick.name; ex.muscle=pick.muscle; ex.note=""; attachExerciseRef(ex,pick.name); save("active"); render();
  toast("Swapped in "+pick.name,"shuffle");
}
function shuffleAllExercises(){
  const w=state.active; let n=0;
  w.exercises.forEach(ex=>{ const alts=altsFor(ex.name); if(alts.length){ const p=alts[Math.floor(Math.random()*alts.length)]; ex.name=p.name; ex.muscle=p.muscle; ex.note=""; attachExerciseRef(ex,p.name); n++; } });
  save("active"); render();
  toast(n?`Shuffled ${n} movement${n!==1?"s":""}`:"No alternates available", n?"shuffle":undefined);
}

/* ==================== Finishing a workout ==================== */
async function finishWorkout(){
  const w=state.active; if(!w) return;
  const performed = w.exercises.map(e=>({ ...e, sets:e.sets.filter(s=>s.done && (s.weight!==""||s.reps!=="")) }))
                              .filter(e=>e.sets.length);
  if(!performed.length){ if(!(await confirmAct("No sets were completed, so there is nothing to save.",{title:"Discard this workout?",confirmText:"Discard workout"}))) return; state.active=null; save("active"); stopTimer(); stopRest(); setTab("home"); return; }
  const duration = Date.now()-w.start;
  const end = isoToTs(w.date);   // chosen calendar date at current time-of-day
  const finished = { id:w.id, name:w.name||"Workout", start:end-duration, end,   // note: w.cur (UI cursor) is intentionally dropped
    duration, exercises:performed, notes:(w.notes||"").trim(), deload:!!w.deload, editedAt:Date.now() };
  const prs = finished.exercises.reduce((n,e)=>n+e.sets.filter(s=>s.pr).length,0);
  state.workouts.unshift(finished);
  state.workouts.sort((a,b)=>b.end-a.end);   // keep newest-first even for back-dated logs
  save("workouts");
  // if this satisfied a deferred plan workout, clear the deferral
  if(state.plan && state.plan.deferred && w.planKey && state.plan.deferred.key===w.planKey){
    state.plan.deferred=null; save("plan"); }
  state.active=null; save("active");
  stopTimer(); stopRest(); releaseWake();
  setTab("home");
  openWorkoutSummary(finished,prs);
}

/* ==================== Adaptive rest ==================== */
function adaptiveRestSeconds(ex){
  const lib=exerciseByRef(ex)||ex;
  const range=parseRepRange(ex.target), reps=range?range.hi:10;
  if(lib.equipment==="barbell") return reps<=6?180:reps<=8?150:reps<=12?120:90;
  if(["Arms","Shoulders","Core"].includes(ex.muscle)) return reps>=15?45:60;
  if(lib.equipment==="bodyweight"||lib.equipment==="pullup") return reps<=8?120:60;
  return reps<=8?120:reps<=12?90:60;
}
function restSecondsFor(ex){
  const selected=Number(state.settings.restDefault);
  if(selected===0) return 0;
  return selected>0?selected:adaptiveRestSeconds(ex);
}

/* ==================== Weekly sets by muscle ==================== */
/* ---------- Weekly sets by muscle group ---------- */
function weekStartTs(ts){ const d=new Date(ts); d.setHours(0,0,0,0); d.setDate(d.getDate()-((d.getDay()+6)%7)); return d.getTime(); }
function setsByMuscleBetween(from,to){
  const m={};
  state.workouts.forEach(w=>{ if(w.end>=from&&w.end<to) w.exercises.forEach(ex=>{
    const mg=ex.muscle||"Other"; m[mg]=(m[mg]||0)+ex.sets.length; }); });
  return m;
}
function plannedWeeklySets(variant){
  const keys=new Set(Object.values(planFor(Date.now())));
  const m={};
  ALL_PROGRAM.filter(d=>keys.has(d.key)).forEach(d=>d.ex.forEach(e=>{ const sets=(e[variant]&&e[variant][0])||0; m[e.muscle]=(m[e.muscle]||0)+(deloadActive()?deloadSetCount(sets):sets); }));
  return m;
}

/* ==================== Strength records ==================== */
const FEATURED_LIFTS=["Back Squat","Front Squat","Barbell Bench Press","Deadlift","Romanian Deadlift","Overhead Press","Barbell Row","Pull-Up","Chin-Up","DB Goblet Squat","DB Front Squat","Flat DB Bench Press","Incline DB Press","DB Romanian Deadlift","One-Arm DB Row","DB Overhead Press","Bulgarian Split Squat"];
function strengthRecord(name){
  let bestW=0,bestE=0,bestReps=0,bestSet=null,last=0; const repBests={};
  state.workouts.forEach(w=>w.exercises.filter(e=>sameExercise(e,name)).forEach(ex=>{ last=Math.max(last,w.end); ex.sets.forEach(s=>{
    const wt=Number(s.weight)||0,reps=Number(s.reps)||0,e=epley(wt,reps); bestW=Math.max(bestW,wt); bestReps=Math.max(bestReps,reps);
    if(e>bestE){ bestE=e; bestSet={weight:wt,reps}; }
    if(wt&&reps>0&&reps<=20) repBests[reps]=Math.max(repBests[reps]||0,wt);
  }); }));
  return last?{name,bestW,bestE,bestReps,bestSet,last,repBests}:null;
}

/* ==================== Routine helpers ==================== */
function routinePrescription(r){ if(/\(His · Mass\)$/.test(r.name)) return "his"; if(/\(Hers · Tone\)$/.test(r.name)) return "hers"; return null; }
function routineBaseName(r){ return r.name.replace(/\s*\((?:His · Mass|Hers · Tone)\)$/,"" ).trim(); }
function groupedRoutines(){
  const groups=[], byBase=new Map();
  state.routines.forEach(r=>{
    const prescription=routinePrescription(r);
    if(!prescription){ groups.push({key:"single:"+r.id,base:r.name,single:r}); return; }
    const base=routineBaseName(r); let g=byBase.get(base);
    if(!g){ g={key:"paired:"+base,base,his:null,hers:null}; byBase.set(base,g); groups.push(g); }
    g[prescription]=r;
  });
  return groups;
}
function selectedRoutine(group){ const v=state.settings.planVariant||"his"; return group.single||group[v]||group.his||group.hers; }
function routineMinutes(r){ const sets=r.exercises.reduce((n,e)=>n+(Number(e.sets)||1),0); return Math.max(20,Math.round((sets*2.1+r.exercises.length*1.5)/5)*5); }
function routineMuscles(r){ return [...new Set(r.exercises.map(e=>e.muscle).filter(Boolean))]; }
function equipmentIconName(eq){ return eq==="dumbbell"?"dumbbell":eq==="bodyweight"?"body":eq==="pullup"?"body":"equipment"; }
function routineEquipment(r){
  const kinds=new Set(); r.exercises.forEach(re=>{ const mapped=r.bodyweight?re.name:mapExerciseForMode(re.name,equipMode()); const ex=exerciseByRef(mapped); if(ex&&ex.equipment) kinds.add(ex.equipment); });
  return [...kinds];
}

/* ==================== Cloud backup, export and import ==================== */
async function connectSync(name){
  state.settings.syncName=name; DB.set("settings",state.settings);
  clearTimeout(_pushT);
  try{
    const res=await fetch("api/data/"+encodeURIComponent(name));
    if(res.ok){ const server=await res.json();
      if(server && server.updated){
        // workout history is combined either way; the choice only decides settings/routines
        if(await confirmAct(`A backup named “${name}” already exists on the server. Workout history is combined either way. Which settings and routines should win?`,{title:"Backup already exists",confirmText:"Use the backup's",cancelText:"Keep this device's",danger:false})){
          localStorage.setItem("forge_updatedAt","1");   // let the server win last-write-wins
        }
      }
    }
  }catch(e){ toast("Server unreachable — saved name, will back up when reachable"); }
  const ok=await syncNow(); render(); toast(ok?"Backup connected":"Connected · will back up when server is reachable","cloud");
}
async function forceRestore(){
  if(!(await confirmAct(`Everything on this device is replaced with the latest “${syncName()}” backup from the server.`,{title:"Restore from backup?",confirmText:"Replace & restore"}))) return;
  try{ const res=await fetch("api/data/"+encodeURIComponent(syncName())); if(!res.ok){ toast("Server unreachable"); return; }
    const server=await res.json();
    if(!server||!server.updated){ toast("No backup found for this name"); return; }
    applySnapshot(server); toast("⤵︎ Restored from backup");
  }catch(e){ toast("Server unreachable"); }
}

function exportData(){
  const data={version:DATA_VERSION, exported:Date.now(), settings:state.settings, exercises:state.exercises, routines:state.routines, workouts:state.workouts, plan:state.plan, bodyweights:state.bodyweights, deleted:state.deleted};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download=`forge-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000); toast("Backup downloaded");
}
function validateBackupData(d){
  if(!d||typeof d!=="object"||Array.isArray(d)) return "Backup is not a JSON object";
  if(d.version!==undefined&&!Number.isFinite(Number(d.version))) return "Backup format version is invalid";
  if(Number(d.version||1)>DATA_VERSION) return `Backup format v${d.version} is newer than this Forge version`;
  const recognized=["settings","exercises","routines","workouts","plan","bodyweights","deleted"];
  if(!recognized.some(k=>Object.prototype.hasOwnProperty.call(d,k))) return "No Forge data found in this file";
  for(const k of ["exercises","routines","workouts","bodyweights","deleted"]){ if(d[k]!==undefined&&!Array.isArray(d[k])) return `${k} must be a list`; }
  for(const k of ["settings","plan"]){ if(d[k]!==undefined&&(!d[k]||typeof d[k]!=="object"||Array.isArray(d[k]))) return `${k} must be an object`; }
  return "";
}
function importData(){
  const inp=document.createElement("input"); inp.type="file"; inp.accept="application/json,.json";
  inp.onchange=()=>{ const f=inp.files[0]; if(!f)return; const r=new FileReader();
    r.onload=async()=>{ try{ const d=JSON.parse(r.result), invalid=validateBackupData(d); if(invalid){toast(invalid);return;}
      if(!(await confirmAct("The backup file replaces all data currently on this device.",{title:"Import this backup?",confirmText:"Import & replace"}))) return;
      if(d.settings)state.settings=d.settings; if(d.exercises)state.exercises=d.exercises;
      if(d.routines)state.routines=d.routines; if(d.workouts)state.workouts=d.workouts;
      if(d.plan)state.plan=d.plan; if(d.bodyweights)state.bodyweights=d.bodyweights;
      if(d.deleted)state.deleted=d.deleted;
      state.active=null; DB.set("active",null); stopTimer(); stopRest();
      migrateExerciseData(); seedData();
      ["settings","exercises","routines","workouts","plan","bodyweights","deleted"].forEach(save); render(); toast("Data imported");
    }catch(e){ toast("Invalid backup file"); } };
    r.readAsText(f); };
  inp.click();
}
