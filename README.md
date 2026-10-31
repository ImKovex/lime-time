# Lime Time – FOH Training Game (Local Lime Leawood)
Static app, no build. Serve the folder (`python3 -m http.server`) and open it; file:// won't work (uses fetch).
- Team code gate: `TEAM_CODE` at top of app.js (default LIME2026, case-insensitive, remembered per device). noindex meta + robots.txt disallow all. Not real security (code is visible in the JS).
- `questions.json` – 110 DRAFT questions in 5 rounds. 81 questions built from Expo's v2 (source-draft.json, 111): Menu 35, Steps of Service 13, Food Safety 26, Standards 7. Excluded 30: q086 (soft-open date) and any question about Fajitas, Mini 'Dillas, Black Beans, Jicama slaw, Apple Crisp Skillet or any item whose chart row is partly unreadable/unverified. q069, q071 flagged "Pending manager review".
- `orders.json` – 74 menu items with chart allergens + conditionals; `allergenStatus` verified on 28 items (clearly readable chart rows, excluding fajitas, unreadable rows, drinks and kids sides). 30 practice tickets, 15 with "guest has a ___ allergy". Allergy step graded only on verified items; draft note always shown.
- `style.css` + `assets/` – Artis's Lime Time kit (copied unchanged from /workspace/kaizen/quiz-game-kit).
- To swap in Chloe's master list: replace questions.json / orders.json in the same shape (no code changes).
- Leaderboard is per-device localStorage. A shared live leaderboard needs a backend later.
- FOH only. No Kaizen, PINs or staff data.
- Agave Stories round (29 DRAFT questions, from Expo's /workspace/quiz/agave_stories_DRAFT.json, not reviewed). Each question links one of Expo's 34 table stories, matched by the same source page and the most shared words. The story shows in a "Tell it at the table" card after the answer, followed by a Next button. Missed-question review links to the source.
- Agave look: `assets/agave.css` + `assets/agave-icon.svg` (copied from Artis's kit, plus aliases for the app's is-correct/is-wrong classes). The round screen gets class `round-agave`.
