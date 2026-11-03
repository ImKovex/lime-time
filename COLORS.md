# Lime Time colors (owner: Artis)
Always use these CSS variables from `style.css` `:root`. No new hex values anywhere, including inline styles in `app.js`.

| Use | Variable | Hex |
|---|---|---|
| Page background | `--page` | #0E2016 |
| Cards | `--card` / `--card-2` | #16301F / #1D3D28 |
| Primary button, correct, banners | `--lime` + text `--ink` | #B0E248 / #0E2016 |
| Outlines | `--outline` | #5CAA28 |
| Main text | `--cream` | #ECF8C8 |
| Secondary text | `--muted` | #9DB58A |
| Highlights, stars | `--gold` | #FFD25A |
| Wrong, errors | `--red` + text `--on-red` | #E5484D / #FFFFFF |
| Medal gradient | `--gold-hi` / `--gold-lo` | #FFE79A / #C99A1E |
| Button press shadow | `--shade` | rgba(0,0,0,.35) |
| Agave round | see `assets/agave.css` | #1A120C, #2A1A10, #D9822B, #F2B45A, #B8A48E |

Sizes: taps at least 44px (`--tap`), main buttons 56px (`--btn`), nothing clipped at 320px wide.
Fixed overlays (like the update banner) go at the top, never over the bottom buttons.
