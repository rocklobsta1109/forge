# Forge — working notes for Claude

Self-hosted workout tracker PWA. Brandon and Chelsey use it several times a week
on their phones as installed home-screen apps. Repo:
`https://github.com/rocklobsta1109/forge` (private).

## This directory is production

The live server runs from **this directory** on port **8080** and is already
running — check with `lsof -nP -iTCP:8080 -sTCP:LISTEN` before starting
anything. Never start a second one.

**Saving a file deploys it.** There is no build and no release step: the moment
you edit `index.html`, that is what their phones load on next open. Consequences:

- Don't leave the app in a broken intermediate state; finish an edit before
  walking away from it.
- For a large refactor, consider building against a scratch copy and swapping
  the finished files in.
- Don't switch git branches while the app is in use — it rewrites the served
  files.
- `git push` is backup and history, not deployment.

Bump `CACHE` in `sw.js` (`forge-vN` → `forge-vN+1`) when installed PWAs need to
pick up new assets. The auto-reload is deliberately suppressed during an
in-progress workout so a deploy can't interrupt a session.

LAN URL for phones: `http://192.168.1.84:8080`.

## Their real data lives here

`data/Brandon.json` and `data/Chelsey.json` are live training history, with
timestamped snapshots in `data/history/` (the server keeps the last 20 per
name). It is gitignored — keep it that way, and never commit or overwrite it.

**Testing rule:** when driving the app in a browser, you may seed localStorage
from a `GET /api/data/<name>` of real data, but **always strip
`settings.syncName`** first, or use a throwaway name like `test-merge` and
delete its files afterwards. A test browser left connected as `Brandon` or
`Chelsey` will push its state over their real history. Run `localStorage.clear()`
when finished.

Sync is merge-based (workouts union by id, bodyweights by date, deletions via
tombstones in `deleted`), so a stale client can't silently clobber history —
but don't rely on that as a substitute for the rule above.

## Code layout

- `index.html` — the entire app: markup, styles, and logic in one file
- `exercises.js` — `EXERCISE_INFO`, the how-to text keyed by exercise name
- `server.py` — static server plus the `/api/data/<name>` GET/PUT backup API
- `sw.js` — service worker; its `ASSETS` list must include any new file served

When adding an exercise, keep these in sync: the library/`MOVEMENT_POOLS`
entry in `index.html`, its equipment tag, and an `EXERCISE_INFO` entry in
`exercises.js`. A movement with no how-to text shows an empty info sheet.

## Program model

Two-week rotation on Mon/Wed/Fri — week 1 is A/B/C, week 2 is D/E/F — anchored
by `plan.cycleAnchor`. Standalone barbell days, specialty days (G/H/I), and a
bodyweight session sit outside the rotation. Every session has a His · Mass and
a Hers · Tone prescription.

A Dumbbell/Combo/Barbell toggle (`settings.equipMode`) re-points routines at
different implements at start time by resolving each exercise through its
movement pattern. Equipment: adjustable dumbbells, bench, and a Rogue RML-3WC
wall rack with safety arms, a 20 kg/44 lb Ohio Bar, 260 lb of bumpers, 2.5/5 lb
change plates, and a pull-up bar. Barbell progression suggestions floor at 5 lb
jumps because the change plates load in pairs.

## Verifying changes

The app is browser-driven, so verify in the browser rather than asking Brandon
to check: load `http://localhost:8080`, exercise the flow you changed, and read
the console for errors. Screenshot anything visual.
