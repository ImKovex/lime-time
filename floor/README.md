# LLL Floor Chart

Manager tool for Local Lime Leawood. Pick a day and AM/PM shift, choose who is working, and the app builds a floor chart: each server gets a connected run of tables, balanced by **table count**.

No accounts, no backend, no build step. It is a static site, same shape as the other Leawood pages, and it can sit on GitHub Pages.

## Run it

From this folder:

```bash
python3 -m http.server 8741
```

Open `http://127.0.0.1:8741`. Browsers block `fetch` on a `file://` page, so use a static server or GitHub Pages.

Unlock with the manager code, pick the shift, tap **Auto-pick 15** (or check names yourself), then **Build sections**. The last chart is stored in this browser’s `localStorage`. Locking the page only clears the session; it does not delete the chart.

## Manager code

The gate is a shared code, not a user account. It lives in `app.js`:

```js
const MANAGER_CODE = "MGR2026";
```

Change that string and refresh. The team quiz code (`LIME2026`) is a different app and will not unlock this one. The unlock flag is `sessionStorage` only (`lll.floor.unlocked`).

## Roster

`servers.json` is the read-only copy of the FOH availability sheet (40 people). Edit that file when the sheet changes. Each person has:

- `name`
- `role`: `S` (server) or `B-S` (bar-server). Both can hold a section. Auto-pick fills with `S` first, then `B-S`.
- `availability`: day → `["AM"]`, `["PM"]`, `["AM","PM"]`, `[]` (off), or `null` (not on the sheet).

`null` is allowed on the chart and flagged as unknown. An empty list, or a list that does not include the shift, is off. Auto-pick skips off people. A manager can still check them.

Tiers are not in `servers.json`. They are saved on the device (`A` / `B` / `C`, default `B`).

## Tables

`tables.json` is the schematic. `seats` is reserved and **ignored**. Nothing in the app balances or displays seats.

| Field | Meaning |
| --- | --- |
| `id` | Stable id. Bar seats are `B1`–`B21` so they don’t collide with dining 10–21. |
| `label` | Number drawn on the map. |
| `zone` | `patio`, `dining`, or `bar`. |
| `area` | Neighborhood used to keep a section local. |
| `kind` | Shape only: `table`, `booth`, `banquette`, `diamond`, `bar-seat`. |
| `x`, `y` | Position, percent from the top-left of the map. |
| `seq` | Walk order inside the zone. Consecutive numbers must be neighboring tables. |
| `seats` | Always `null`. Leave it. |

Counts: patio 13 (`100–104`, `110–115`, `120`, `121`), dining 38 (`10–18`, `20–24`, `30–32`, `40–43`, `50–53`, `60–63`, `70–74`, `80–83`), bar 21. Bar seats are drawn but left off the chart unless **Include bar seats** is on.

If you move a table, keep `seq` as a walk through neighbors. The builder cuts that walk into sections. `area` should only change between areas that share a border.

## How sections are balanced

With the bar off there are 51 tables. Fifteen servers means **3 or 4 tables each** (six sections of 4 and nine of 3). Every section has at least 2 tables as long as you don’t pick more people than half the tables.

The split is by table count, not seats and not covers.

1. Patio, dining, and the bar (if included) are separate. A section does not jump the patio wall or mix bar seats into a dining section.
2. Inside a zone, tables are walked in `seq` order: patio outside → patio inside, then the front of the dining room → middle → upper room → window → kitchen side. The bar walks the L from the top rail to the foot.
3. That walk is cut into runs that are as even as possible. A run stays inside one `area`, or crosses into the next area only. It does not hop across the room.
4. Tier **A** is matched to patio and the big middle booths (30–32). Tier **C** is matched to the kitchen side (70s and 80s); extra C servers get the sections nearest that side. Tier **B** gets the rest. Within a tier, names rotate by day and by AM/PM so the same person is not stuck on the patio all week.
5. **Re-run auto** rebuilds from the current names and tiers. Tap a table to move it, or drag it onto a section on a laptop or iPad with a mouse. Hand moves stay until you re-run. A section that no longer touches itself is marked **Split across the room**.

**Print** uses the browser print dialog (save as PDF from there). **Save image** downloads a PNG of the map and the section list.

## Files

- `index.html` — screens
- `style.css` — layout, including a 320px-wide phone and print
- `app.js` — gate, roster, section builder
- `servers.json` — roster copy
- `tables.json` — map
- `version.json` — `1.0.0`
