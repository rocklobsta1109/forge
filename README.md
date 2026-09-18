# Forge

A self-hosted workout tracker for a home gym. Vanilla-JS PWA — no build step, no
framework, no dependencies, no accounts. It runs from a single Python file on a
machine you own and installs to your phone's home screen.

Built for two people training together on an at-home dumbbell + barbell setup,
so most things exist in a "his" and a "hers" prescription and the whole program
can be re-pointed at whatever equipment is actually available that day.

## Running it

```bash
python3 server.py        # defaults to port 8080
```

Open `http://localhost:8080`, or `http://<your-lan-ip>:8080` from a phone on the
same network, then use "Add to Home Screen" to install it. Python 3 is the only
requirement.

`server.py` serves the static app and adds a small JSON backup API:

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/data/<name>` | `GET` | Fetch the stored snapshot for `<name>` |
| `/api/data/<name>` | `PUT` | Store a snapshot (atomic write + timestamped history) |

`<name>` is restricted to `[A-Za-z0-9_-]{1,40}` to prevent path traversal, and
the last 20 snapshots per name are retained under `data/history/`.

## Training features

### Logging

Set-by-set weight and reps with tap-to-complete, per-set hints from last time,
and automatic PR detection against both top weight and estimated 1RM. After a
workout you rate it easy / about right / hard, which feeds back into future
suggestions. A screen wake lock keeps the phone awake mid-set, and the rest
timer can fire a notification through the service worker when the app is
backgrounded.

The **rest timer is adaptive** by default — it reads the exercise's equipment
and target rep range rather than using one global number. Heavy barbell work
(≤6 reps) gets 3 minutes; mid-rep compounds get 90–150s; arm, shoulder, and
core isolation at 15+ reps gets 45s. A fixed duration can be set instead.

### Programming

A two-week rotation runs Mon/Wed/Fri and alternates between two sets of
full-body sessions — **A/B/C** (Foundation & Push, Pull & Posterior, Power &
Stability) in week one and **D/E/F** (Strength & Drive, Pump & Squeeze,
Posterior & Arms) in week two. Every session exists in a His · Mass and a
Hers · Tone prescription.

Outside the rotation there are standalone **Barbell Lower / Barbell Upper**
strength days, a no-equipment **bodyweight** session for travel, and three
**specialty days** targeting gaps — G (Pull & Carry), H (Deadlift & Bench
Strength), and I (Upper Back & Shoulder Quality).

Missing a scheduled day can be deferred once, at the cost of a penalty
bodyweight set; deferring again skips it. A **deload week** can be toggled on,
which cuts every working set count to two-thirds for that calendar week.

### Equipment modes

A Dumbbell / Combo / Barbell toggle re-points a routine at different implements
**at start time**. Each exercise resolves through its movement pattern — 29
pools covering squat, hinge, lunge, horizontal and vertical press and pull,
carry, and core variants — to the anchor movement for the selected mode. The
same authored session becomes goblet squats or back squats depending on what's
set up.

Every exercise carries an equipment tag, and both the exercise picker and the
mid-workout swap sheet filter on it. Swapping also surfaces curated
substitutions ahead of the full pool, so the first suggestions are sensible
rather than merely same-pattern.

### Barbell support

Configure your bar weight and how many matched plate pairs you own, and Forge
handles the arithmetic:

- **Plate calculator** — given a target weight, it solves for the loadout using
  the fewest plates from your actual inventory, and tells you when a number
  can't be made.
- **Warm-up ramp** — generates a ladder from the empty bar up to your working
  weight (roughly bar → 55% → 72% → 86%, with reps descending 8 → 5 → 3 → 1).

### Progression

When you hit the top of an exercise's target rep range across every set, the app
suggests adding weight; otherwise it suggests chasing reps at the same load.
Increments are equipment-aware — barbell lifts floor at 5 lb jumps to match
paired change plates, while dumbbell isolation work can move in smaller steps.

### Volume accounting

Volume math accounts for how a movement is actually loaded. A pair of dumbbells
counts both; a per-side exercise counts both sides. Each exercise states what
to enter — the weight on one dumbbell, the total loaded bar, or added load only
for weighted pull-ups — so totals stay comparable across implements.

### Workout generator

For days off-plan, pick target muscle groups, available equipment, and a
workout size, and Forge assembles a session. It avoids movements you've trained
recently, balances picks across the muscles you chose, and writes prescriptions
that scale to the His/Hers setting and to whether a movement is a compound,
isolation, carry, or hold. Individual picks can be re-rolled, and the result can
be started immediately or saved as a permanent routine.

### Progress

- Weekly hard sets per muscle group, measured against the current week's plan
- Volume per session and estimated 1RM trends per exercise
- **Strength records** for featured lifts, including a best-weight-per-rep
  breakdown, heaviest load, and when the lift was last trained
- Body-weight logging alongside training data

### Exercise library

164 documented movements. Each has a written setup, numbered motion steps, and
cues with common mistakes, reachable from a `?` button anywhere an exercise
appears — mid-workout, in a routine, in the picker, or in history. Custom
exercises can carry their own notes.

### Sync

Point two devices at the same sync name and they merge rather than overwrite:
workouts union by ID, body-weight entries union by date, and deletions
propagate as tombstones, so a device that has been offline can't clobber
history recorded elsewhere. Everything works offline through the service
worker and reconciles when the server is reachable again. Backups can also be
exported and imported as JSON, with the import validated before it is applied.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The entire app — markup, styles, and logic |
| `exercises.js` | Exercise how-to descriptions |
| `server.py` | Static server + JSON backup API |
| `sw.js` | Service worker (offline cache, notification handling) |
| `manifest.webmanifest`, `icon*.svg` | PWA install metadata |

Personal workout data lives in `data/` and is gitignored.

## Deploying an update

Bump `CACHE` in `sw.js` (e.g. `forge-v19` → `forge-v20`). Installed clients pick
up the new version on next open; the auto-reload is suppressed during an
in-progress workout so a deploy can't interrupt a session.

Note that if you are serving the app from your working copy, saving a file
publishes it immediately — editing is deploying, and the git push is backup and
history rather than release.

## Notes

App state lives in the browser's `localStorage` and is mirrored to the server as
JSON. There is no authentication; it is built for a trusted home network. Don't
expose it directly to the internet — use a VPN or tunnel if you want access
from outside.
