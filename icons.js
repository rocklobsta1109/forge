"use strict";
/* ============================================================
   Forge icon set — SF Symbols–inspired glyphs drawn on a 24pt grid.
   Line icons use a 1.8pt stroke with round caps and joins; a few
   carry their own fill (play, sparkles, ellipsis). Tab icons get a
   heavier stroke when selected via CSS rather than a second glyph.
   ============================================================ */
const ICONS = {
  /* brand */
  anvil:       '<path fill="currentColor" stroke="none" d="M2 9.2 6 6.5h14V9.6l-3.6 1.1-1 4.3 3.1 2.2v1.3H5.5v-1.3l3.1-2.2-1-4.3L5 9.6z"/>',

  /* tabs */
  rings:       '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.6"/><circle cx="12" cy="12" r="2.2"/>',
  calendar:    '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 9.5h17M8 3v3.5M16 3v3.5"/>',
  trends:      '<path d="M3.5 4.5v15h17"/><path d="M6.5 15.5 10.5 11l3 2.5 6-6.5"/><path d="M15.5 7h4v4"/>',
  library:     '<rect x="3" y="4" width="4.5" height="16" rx="1.2"/><rect x="9.75" y="4" width="4.5" height="16" rx="1.2"/><path d="m16 5 3.8-1 3.7 14.5-3.8 1z"/>',

  /* navigation and actions */
  gear:        '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
  person:      '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  chevronLeft: '<path d="m14.5 6-6 6 6 6"/>',
  chevronRight:'<path d="m9.5 6 6 6-6 6"/>',
  chevronDown: '<path d="m6 9.5 6 6 6-6"/>',
  chevronUp:   '<path d="m6 14.5 6-6 6 6"/>',
  arrowRight:  '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowLeft:   '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  ellipsis:    '<circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
  xmark:       '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  close:       '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  check:       '<path d="m5 12.5 4.5 4.5L19 7"/>',
  checkCircle: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
  checkFill:   '<circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/><path d="m8.3 12.4 2.6 2.6 4.8-5.2" stroke="var(--on-fill,#fff)" stroke-width="2"/>',
  plus:        '<path d="M12 5v14M5 12h14"/>',
  minus:       '<path d="M5 12h14"/>',
  plusCircle:  '<circle cx="12" cy="12" r="8.5"/><path d="M12 8.5v7M8.5 12h7"/>',
  search:      '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/>',
  filter:      '<path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="var(--bg-elev,#fff)"/><circle cx="15" cy="12" r="2" fill="var(--bg-elev,#fff)"/><circle cx="8" cy="17" r="2" fill="var(--bg-elev,#fff)"/>',
  list:        '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.5" cy="6.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="4.5" cy="17.5" r="1.3" fill="currentColor" stroke="none"/>',

  /* media / time */
  play:        '<path fill="currentColor" stroke="none" d="M8 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 8 5.5z"/>',
  pause:       '<rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/>',
  stop:        '<rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none"/>',
  skip:        '<path fill="currentColor" stroke="none" d="M5 6.5a1 1 0 0 1 1.55-.84l8 5.5a1 1 0 0 1 0 1.68l-8 5.5A1 1 0 0 1 5 17.5z"/><path d="M17.5 6.5v11" stroke-width="2.2"/>',
  timer:       '<circle cx="12" cy="13.5" r="7"/><path d="M12 10v3.5l2.3 1.4M10 3.5h4M12 3.5v3"/>',
  clock:       '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  hourglass:   '<path d="M6.5 3.5h11M6.5 20.5h11M7.5 3.5v3a4.5 4.5 0 0 0 9 0v-3M7.5 20.5v-3a4.5 4.5 0 0 1 9 0v3"/>',
  repeat:      '<path d="M4.5 11V9.5a3 3 0 0 1 3-3h10M15 4l2.5 2.5L15 9M19.5 13v1.5a3 3 0 0 1-3 3h-10M9 20l-2.5-2.5L9 15"/>',
  sync:        '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 3.5v4h-4"/>',
  defer:       '<rect x="3" y="5" width="14.5" height="14" rx="3"/><path d="M3 9.5h14.5M7 3v3M13.5 3v3"/><circle cx="18" cy="17" r="4" fill="var(--bg-elev,#fff)"/><path d="M18 15.3V17l1.2.8"/>',

  /* training */
  dumbbell:    '<rect x="2.5" y="9" width="2" height="6" rx=".7"/><rect x="5.5" y="7" width="3" height="10" rx="1"/><rect x="15.5" y="7" width="3" height="10" rx="1"/><rect x="19.5" y="9" width="2" height="6" rx=".7"/><path d="M8.5 12h7"/>',
  barbell:     '<path d="M2 12h3M19 12h3M5 9v6M8 7.5v9M16 7.5v9M19 9v6M8 12h8"/>',
  plate:       '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.3"/><path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5" opacity=".45"/>',
  figure:      '<circle cx="12" cy="4.5" r="1.9"/><path d="M6.5 10.5 12 8l5.5 2.5M12 8v6.5M8.5 21 12 14.5 15.5 21"/>',
  pullup:      '<path d="M3.5 5h17M7 5v3M17 5v3"/><circle cx="12" cy="9.5" r="1.6"/><path d="M9.5 13.5 12 11.5l2.5 2M12 11.5v5M9.5 21l2.5-4.5L14.5 21"/>',
  gauge:       '<path d="M4 15.5a8 8 0 1 1 16 0"/><path d="M12 15.5 15.5 9"/><circle cx="12" cy="15.5" r="1.3" fill="currentColor" stroke="none"/>',
  layers:      '<path d="m12 4 8 4.5-8 4.5-8-4.5zM4 12.5l8 4.5 8-4.5M4 16.5l8 4.5 8-4.5"/>',
  number:      '<path d="M9.5 4 7.5 20M17 4l-2 16M4.5 9.5h15M4 14.5h15"/>',
  scaleMass:   '<rect x="4.5" y="5.5" width="15" height="15" rx="3"/><path d="M8.5 12a3.5 3.5 0 0 1 7 0M12 12l1.6-2.2"/>',
  heart:       '<path d="M12 20s-7.5-4.6-7.5-10A4 4 0 0 1 12 7.5 4 4 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  target:      '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  flame:       '<path d="M12 21c4 0 6.5-2.6 6.5-6.2 0-3.2-1.9-5.2-3.4-7.4-.5 1.6-1.4 2.5-2.4 3-.2-2.8-1.4-5.2-3.7-6.9.3 2.4-.6 3.9-2 5.4C5.7 10.3 5 12.3 5 14.8 5 18.4 8 21 12 21z"/>',
  bolt:        '<path fill="currentColor" stroke="none" d="M13.4 2.2a.8.8 0 0 1 1.4.6l-.9 7.2h5a.8.8 0 0 1 .6 1.3l-9.3 10.5a.8.8 0 0 1-1.4-.6l.9-7.2h-5a.8.8 0 0 1-.6-1.3z"/>',
  trophy:      '<path d="M8 4h8v5.5a4 4 0 0 1-8 0zM8 6H4.5v1.5a3.5 3.5 0 0 0 3.5 3.5M16 6h3.5v1.5a3.5 3.5 0 0 1-3.5 3.5M12 13.5V17M8.5 20.5h7M9.5 17h5"/>',
  medal:       '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5 7 21l5-2.5 5 2.5-1.5-7.5"/>',
  star:        '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z"/>',
  starFill:    '<path fill="currentColor" stroke="none" d="m12 2.8 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.6l-5.8 3.1 1.1-6.5L2.6 9.6l6.5-.9z"/>',
  sparkles:    '<path fill="currentColor" stroke="none" d="M12 3.5 13.7 8.3 18.5 10l-4.8 1.7L12 16.5l-1.7-4.8L5.5 10l4.8-1.7zM5 15.5l.9 2.6 2.6.9-2.6.9L5 22.5l-.9-2.6-2.6-.9 2.6-.9zM18.5 2l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  leaf:        '<path d="M5.5 19.5c0-8 5.5-13.5 13.5-14-.5 8-6 13.5-13.5 14zM5.5 19.5c2.5-5 5.5-8 9-10.5"/>',
  moon:        '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  zzz:         '<path d="M4.5 8h5l-5 6h5M13 4h4l-4 5h4M14 15h5l-5 5h5"/>',
  sun:         '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  halfCircle:  '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17A8.5 8.5 0 0 0 12 3.5z" fill="currentColor" stroke="none"/>',
  swap:        '<path d="M7.5 4.5 4.5 7.5l3 3M4.5 7.5h11a4 4 0 0 1 4 4v.5M16.5 19.5l3-3-3-3M19.5 16.5h-11a4 4 0 0 1-4-4V12"/>',
  shuffle:     '<path d="M4 7h2.5c2 0 3.2.9 4.2 2.4M4 17h2.5c2 0 3.2-.9 4.2-2.4M13.3 9.4C14.3 7.9 15.5 7 17.5 7H20M13.3 14.6c1 1.5 2.2 2.4 4.2 2.4H20M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5"/>',
  arrowUpRight:'<path d="M7 17 17 7M9 7h8v8"/>',
  arrowDownRight:'<path d="M7 7l10 10M17 9v8H9"/>',
  equal:       '<path d="M6 9.5h12M6 14.5h12"/>',
  chartBar:    '<path d="M5 19.5v-6M10 19.5V9M15 19.5v-8M20 19.5V5" stroke-width="2.4"/>',

  /* content and system */
  info:        '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  book:        '<path d="M5 4.5h13.5v13H6.5a1.5 1.5 0 0 0-1.5 1.5zM5 4.5V19M6.5 17.5h12V21h-12"/>',
  doc:         '<path d="M6.5 3.5h7l4.5 4.5v11a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5zM13.5 3.5V8H18M8.5 12h7M8.5 16h7"/>',
  notes:       '<path d="M6.5 3.5h7l4.5 4.5v11a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5zM13.5 3.5V8H18M8.5 12h7M8.5 16h7"/>',
  pencil:      '<path d="m14.5 5.5 4 4M4.5 19.5l.9-4.2L16.6 4.1a2 2 0 0 1 2.8 0l.5.5a2 2 0 0 1 0 2.8L8.7 18.6z"/>',
  trash:       '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12M10 11v6M14 11v6"/>',
  share:       '<path d="M12 3.5v11M8.5 7 12 3.5 15.5 7M5.5 11v7.5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V11"/>',
  import:      '<path d="M12 3.5v11M8.5 11l3.5 3.5 3.5-3.5M5.5 11v7.5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V11"/>',
  archive:     '<rect x="3.5" y="4.5" width="17" height="4" rx="1.2"/><path d="M5 8.5v9.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V8.5M10 12.5h4"/>',
  cloud:       '<path d="M7.5 18.5h9.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 12.1 3.25 3.25 0 0 0 7.5 18.5z"/>',
  seal:        '<path d="M12 3l2 1.6 2.5-.5 1 2.4 2.4 1-.5 2.5L21 12l-1.6 2 .5 2.5-2.4 1-1 2.4-2.5-.5L12 21l-2-1.6-2.5.5-1-2.4-2.4-1 .5-2.5L3 12l1.6-2-.5-2.5 2.4-1 1-2.4 2.5.5z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  warning:     '<path d="M12 4 2.8 19.5h18.4zM12 10v4M12 17h.01"/>',
  bell:        '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5H4.5zM10 20a2 2 0 0 0 4 0"/>',
  speaker:     '<path d="M4.5 9.5h3l4-3.5v12l-4-3.5h-3zM15 9.5a3.5 3.5 0 0 1 0 5M17.5 7a7 7 0 0 1 0 10"/>',
  lock:        '<rect x="5.5" y="10.5" width="13" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  ruler:       '<path d="M3.5 15.5 15.5 3.5l5 5-12 12zM7.5 11.5l2 2M10.5 8.5l2 2M13.5 5.5l2 2"/>',
  circle:      '<circle cx="12" cy="12" r="8.5"/>',
  dot:         '<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>',
  history:     '<path d="M3.5 12a8.5 8.5 0 1 0 2.8-6.3M3.5 4.5v5h5M12 8v4l3 2"/>',
  progress:    '<path d="M3.5 4.5v15h17"/><path d="M6.5 15.5 10.5 11l3 2.5 6-6.5"/>',
  routines:    '<rect x="3" y="4" width="4.5" height="16" rx="1.2"/><rect x="9.75" y="4" width="4.5" height="16" rx="1.2"/><path d="m16 5 3.8-1 3.7 14.5-3.8 1z"/>',
  body:        '<circle cx="12" cy="4.5" r="1.9"/><path d="M6.5 10.5 12 8l5.5 2.5M12 8v6.5M8.5 21 12 14.5 15.5 21"/>',
  equipment:   '<path d="M2 12h3M19 12h3M5 9v6M8 7.5v9M16 7.5v9M19 9v6M8 12h8"/>',
  settings:    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
  edit:        '<path d="m14.5 5.5 4 4M4.5 19.5l.9-4.2L16.6 4.1a2 2 0 0 1 2.8 0l.5.5a2 2 0 0 1 0 2.8L8.7 18.6z"/>',
  more:        '<circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
  download:    '<path d="M12 3.5v11M8.5 11l3.5 3.5 3.5-3.5M5.5 11v7.5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V11"/>',
  upload:      '<path d="M12 3.5v11M8.5 7 12 3.5 15.5 7M5.5 11v7.5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V11"/>',
  scale:       '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.3"/><path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5" opacity=".45"/>',
};

/* `icon(name, cls)` → inline SVG. Unknown names fall back to a circle so a typo never blanks a button. */
function icon(name, cls="", attrs=""){
  const body = ICONS[name] || ICONS.circle;
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${attrs}>${body}</svg>`;
}

/* Equipment → icon name, used by routine cards, chips and the picker. */
function equipmentIconName(eq){
  return eq==="dumbbell"?"dumbbell":eq==="barbell"?"barbell":eq==="bodyweight"?"figure":eq==="pullup"?"pullup":"gauge";
}

/* Award medallion: a gradient disc with a glyph, rendered as one SVG so it scales crisply. */
let _medalSeq=0;
function medallion(glyph, colorA, colorB, earned=true, size=76){
  const id="mg"+(++_medalSeq);
  const inner = ICONS[glyph] || ICONS.star;
  return `<svg class="medal-svg" width="${size}" height="${size}" viewBox="0 0 76 76" aria-hidden="true">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${colorA}"/><stop offset="1" stop-color="${colorB}"/></linearGradient>
      <radialGradient id="${id}h" cx=".3" cy=".25" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient>
    </defs>
    <circle cx="38" cy="38" r="35" fill="url(#${id})"/>
    <circle cx="38" cy="38" r="35" fill="url(#${id}h)"/>
    <circle cx="38" cy="38" r="29.5" fill="none" stroke="#fff" stroke-opacity="${earned?".55":".25"}" stroke-width="1.5"/>
    <g transform="translate(23 23) scale(1.25)"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="color:#fff">${inner}</svg></g>
  </svg>`;
}
