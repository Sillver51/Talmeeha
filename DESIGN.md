# DESIGN.md — تلميحة (Talmeeha)

> Single source of truth for Talmeeha's visual design system. Drop-in readable by
> coding agents to generate a matching UI. Follows the Stitch `DESIGN.md` format.
> Brand narrative, mascot, logo lockups and voice live in [`docs/brand/BRAND.md`](docs/brand/BRAND.md).
> A live token catalog renders at [`docs/brand/preview.html`](docs/brand/preview.html).

**Product:** A real-time, Arabic, team word-deduction game (a Codenames-style game).
**Direction:** RTL-first (`dir="rtl"`, `lang="ar"`). All layouts mirror for Arabic.

---

## 0. Neon Night (Phase 1) — live system

The shipped UI runs the **Neon Night** evolution of this design system (spec:
[`docs/superpowers/specs/2026-05-23-talmeeha-redesign-design.md`](docs/superpowers/specs/2026-05-23-talmeeha-redesign-design.md)).
Where this differs from the values further down, **Neon Night is canonical**:

- **Glass tiles, not sand.** Unrevealed word cards are dark glass (`--glass
  rgba(255,255,255,.045)` / `--glass-brd rgba(255,255,255,.10)`), not the sand gradient.
- **Neon team colors:** `--red #FF4D8D` / `--red2 #FF8FB6`, `--blue #34A8FF` /
  `--blue2 #9AD2FF`. New accent `--cyan #34E0E0`.
- **Signature gradient:** `--grad-signature` = grape → gold → cyan (clue word, active toggles).
- **Color-independent team identity:** every team is also marked by a **glyph** — `▲` red,
  `⬣` blue (`<TeamGlyph/>`), shown on scores, counters, and (for key-holders) cards. Color
  is never the only signal.
- **Accessibility, via `<html>` `data-*` attributes** (set by `prefsStore`, persisted):
  - `[data-palette="colorblind"]` → Wong palette (`--red #E69F00`, `--blue #0072B2`).
    *Known gap:* some chrome accents still use literal rgba and don't recolor — the glyphs
    carry the guaranteed color-independent identity.
  - `[data-reduced-motion="on"]` kills animation/transition; the OS `prefers-reduced-motion`
    query is also honored for in-game motion.
  - `[data-digits="eastern"]` renders numbers as `٠–٩` (`formatNumber` / `formatDigits`).
- **Leaders see the FULL key** (red/blue/neutral/assassin), server-enforced via
  `projectStateFor` — guessers receive `t:"hidden"` for unrevealed cards (see spec §6).

---

## 1. Visual Theme & Atmosphere

**Theme name:** *ليل ولمحة — Night & Glimpse.*

A deep, starlit night canvas where hidden clues *glimmer* into reveal. The mood is
**mysterious but warm, premium but playful** — a late-night gathering of friends, not a
sterile dashboard. Density is **comfortable-compact**: the game screen packs a 25-card
board, scores, clue panel and log into one viewport without scrolling, while marketing
and lobby screens breathe.

Design philosophy:

- **Glassmorphism over a dark cosmos.** Frosted translucent surfaces (`backdrop-filter: blur`)
  float above an animated starfield + faint grid.
- **Color = information.** Red/blue are teams, gold is leadership, grape is the brand,
  purple is doubt, sand is an unrevealed word. Color is never decorative-only.
- **Motion is gentle and meaningful.** Floating mascot, shimmering gradients on key
  actions, spring-eased card hovers. Nothing strobes or distracts during play.
- **Tactile cards.** Word cards mimic physical Codenames tiles — warm sand stock with
  inner highlight and a soft drop shadow — so revealing one feels like flipping a tile.

---

## 2. Color Palette & Roles

All colors are exposed as CSS custom properties (the canonical token names below). In the
Next.js build these map 1:1 to Tailwind theme tokens.

### Canvas & surfaces (dark)
| Token | Hex | Role |
|---|---|---|
| `--bg` | `#0A0A0F` | App background (deepest) |
| `--bg2` | `#0F0F1A` | Background layer 2 |
| `--bg3` | `#14141F` | Background layer 3 |
| `--surface` | `#1A1A2E` | Card / panel base |
| `--surface2` | `#1F1F38` | Raised surface |
| `--surface3` | `#252545` | Highest surface / hover |
| `--border` | `rgba(255,255,255,.06)` | Hairline border |
| `--border2` | `rgba(255,255,255,.11)` | Emphasis border |

### Teams
| Token | Hex | Role |
|---|---|---|
| `--red` / `--red2` | `#F04060` / `#FF7090` | Red team (الفريق الأحمر) base / bright |
| `--red-bg` / `--red-glow` | `rgba(240,64,96,.12)` / `.06` | Red tint / glow |
| `--blue` / `--blue2` | `#2D6EFF` / `#6699FF` | Blue team (الفريق الأزرق) base / bright |
| `--blue-bg` / `--blue-glow` | `rgba(45,110,255,.12)` / `.06` | Blue tint / glow |

### Accents & semantics
| Token | Hex | Role |
|---|---|---|
| `--gold` / `--gold2` | `#E8A020` / `#FFD060` | **Leadership** (القائد), primary CTAs, win state |
| `--grape` / `--grape2` | `#8B5CF6` / `#A78BFA` | **Brand primary** (mascot, focus rings, links) |
| `--doubt` / `--doubt2` | `#A855F7` / `#C084FC` | **Doubt** marking (علامة الشك) |
| `--sand` | `#F0E4C8` | Unrevealed word card stock |
| `--neutral-rv` / `--neutral-rv2` | `#2E3550` / `#394068` | Neutral revealed |
| `--text` / `--text2` / `--muted` | `#EEEEFF` / `#9999BB` / `#555577` | Text primary / secondary / muted |

### Word-card states (functional, do not recolor)
| State | Treatment |
|---|---|
| Unrevealed | Sand gradient `#F5E8C4→#EDD99A`, dark ink `#1A0E04`, inner top highlight |
| Revealed red | `#D01830→#F04060`, light text, red glow |
| Revealed blue | `#0C30B0→#2D6EFF`, light text, blue glow |
| Revealed neutral | Warm brown `#3A2E1A→#4A3C22`, tan text |
| Revealed assassin | Near-black crimson `#0D0505→#1A0808`, dim red text, `☠` |
| Leader hint (own/assassin) | Tinted translucent fill + colored 2px border (red/blue/assassin) |

---

## 3. Typography Rules

**Family:** `Tajawal` (Google Fonts), weights 300/400/500/700/800/900. Fallback `sans-serif`.
Tajawal is chosen for crisp Arabic letterforms and a wide weight range. RTL throughout.

| Element | Size | Weight | Notes |
|---|---|---|---|
| Logo wordmark | `4.2rem` | 900 | Gradient fill, `letter-spacing:-2px` |
| Logo (compact, in-game) | `2.2rem` | 900 | Gradient fill |
| Logo tagline | `.75rem` | 400 | `letter-spacing:5px`, uppercase, muted |
| Modal / win title | `2rem` | 900 | Team-colored |
| Score number | `2.2rem` | 900 | `text-shadow` glow in team color |
| Clue word (big) | `1.5rem` | 900 | Shimmer gradient |
| Card title | `.9rem` | 800 | Gold |
| Body / inputs | `1rem` | 600 | |
| Word card | `.82rem` | 900 | Tightens to fit RTL words |
| Labels / pills | `.6–.72rem` | 700–800 | Letter-spaced |

Rule: **headings and interactive labels are heavy (800–900)**; body is 600. Never go below
300. Numbers (scores, clue counts) are always 900 for legibility at a glance.

---

## 4. Component Stylings

**Buttons** (`--r-sm` = 9px radius, `.78rem 1.4rem` padding, weight 800):
- `btn-gold` — primary CTA. Grape→gold→grape animated shimmer gradient, dark ink. Full width.
- `btn-outline` — secondary. Transparent, `--border2`, hover → grape border + brighter text.
- `btn-red` / `btn-blue` — team actions, solid team color, white text.
- `btn-ghost` — tertiary, `--surface2` fill, muted text.
- `btn-danger` — red tinted fill + border, used for destructive/end-turn.
- `btn-doubt` / `btn-doubt-active` — purple tinted; active state brightens + white text.
- `btn-sm` — compact variant. All buttons: `:active { scale(.97) }`, hover white-veil overlay.
- Disabled: `opacity:.3`, no transform.

**Cards / panels:** translucent `rgba(26,26,46,.85)`, `blur(16px)`, `--border2`, radius
`--r-lg` (22px) for major cards / `--r` (14px) for panels, shadow `0 8px 32px rgba(0,0,0,.5)`.

**Mode cards / team cards:** 2px border, hover lifts `translateY(-3px)` + grape border +
glow; `.selected` shows a grape ring. A gradient wash fades in on hover via `::before`.

**Inputs:** dark fill `rgba(10,10,15,.7)`, `--border2`, radius `--r-sm`, RTL right-aligned,
weight 600. Focus → grape border + `0 0 0 3px var(--grape-dim)` ring. Number inputs are 68px.

**Word board:** 5-col grid (responsive → 4 → 3), 7px gap, on a recessed translucent panel.

**Pills / badges:** fully rounded (20px), tinted by role (team / doubt / wins), `blur(8px)`.

**Win modal:** full-screen `blur(16px)` scrim, centered translucent modal, trophy 🏆,
team-colored title, two-card persistent scoreboard (winner card gold-tinted).

**Toast:** bottom-center, slides up, grape border + glow, auto-dismiss 2.6s.

---

## 5. Layout Principles

- **Spacing scale (rem):** `.2, .34, .4, .55, .65, .8, 1, 1.2, 1.4, 1.8` — tight in-game,
  generous on entry screens. Game screen padding `.55rem .75rem`; entry screens `1.5rem`.
- **Radii:** `--r-sm` 9px, `--r` 14px, `--r-lg` 22px, pills 20px, word cards 12px.
- **Containers:** entry card `max-width:500px`; setup `700px`; lobby card `520px`; modal `400px`.
- **Game grid:** header is `auto 1fr auto` (score · turn · score). Board is the hero,
  everything else (counters, clue, actions, log) stacks compactly above/below it.
- **RTL:** the entire app is `direction:rtl`. Use logical properties; `margin-right:auto`
  is the RTL "push to far edge." Mirror all directional icons/arrows (← means "forward").
- **Whitespace philosophy:** breathing room on entry/lobby to feel premium; ruthless
  compactness in-game so the board never scrolls on a phone.

---

## 6. Depth & Elevation

A four-step elevation model, expressed through **blur + translucency + shadow**, not just shadow:

| Level | Use | Treatment |
|---|---|---|
| 0 — Cosmos | Page background | Starfield radial gradients + 48px faint grid, `z-index:0`, no shadow |
| 1 — Surface | Panels, counters, log | `rgba(*,.7–.85)` + `blur(8–12px)`, `--border`, soft shadow |
| 2 — Card | Major cards, header, clue | `blur(16px)`, `--border2`, `0 4–8px 20–32px rgba(0,0,0,.5)` |
| 3 — Tile | Word cards | Opaque sand, `0 4px 12px rgba(0,0,0,.45)` + inner top highlight; hover → `translateY(-4px) scale(1.04)` deeper shadow |
| 4 — Overlay | Win modal, toast | Full scrim `blur(16px)`, modal `0 20px 60px rgba(0,0,0,.6)` |

Glow is reserved for **live/important state**: active turn box, score numbers, focused
input, the floating mascot. Don't add glow to static chrome.

---

## 7. Do's and Don'ts

**Do**
- Keep color meaning consistent: gold = leadership, grape = brand, purple = doubt.
- Preserve the tactile sand word-card — it's the signature object of the game.
- Animate reveals and hovers with spring easing (`cubic-bezier(.34,1.56,.64,1)`).
- Keep the in-game screen to one viewport on mobile.
- Write all UI copy in Arabic, RTL, warm and playful (see BRAND.md voice).

**Don't**
- Don't mix gold and grape as if interchangeable — they mean different things.
- Don't use pure white (`#FFF`) for body text; use `--text` (`#EEEEFF`).
- Don't put glow on every element — it kills the signal of "this is live."
- Don't introduce a second font family; weight changes carry hierarchy.
- Don't recolor word-card *state* classes — they encode game truth.
- Don't strobe or rapidly flash; motion must stay calm during play.

---

## 8. Responsive Behavior

| Breakpoint | Change |
|---|---|
| Default (desktop/tablet) | Board 5 columns; two-column setup/lobby grids |
| `≤ 560px` | Setup teams stack to 1 column |
| `≤ 520px` | Board → 4 columns, gap 5px, padding 6px |
| `≤ 360px` | Board → 3 columns, gap 4px |

- **Touch targets:** word cards `min-height:54px`; buttons ≥ 36px tall. Hover effects are
  enhancements only — all actions work on tap.
- **Collapsing strategy:** the board always wins screen space; chrome (host bar, counters,
  log) shrinks first. Log is capped (`max-height:60px`, scroll).
- Mobile is the primary target (friends passing one phone in **host mode**, or each on
  their own phone in **online mode**).

---

## 9. Agent Prompt Guide

**Quick color reference**
`bg #0A0A0F · surface #1A1A2E · red #F04060 · blue #2D6EFF · gold #E8A020 · grape #8B5CF6 · doubt #A855F7 · sand #F0E4C8 · text #EEEEFF`

**Ready-to-use prompts**
- *Component:* "Build an RTL Arabic `<TeamCard>` for Talmeeha using DESIGN.md tokens:
  translucent `--surface` with `blur(16px)`, a 2px team-color border (red/blue), `--r` radius,
  weight-800 Arabic heading, hover lift `translateY(-3px)` + grape glow. Tajawal font."
- *Screen:* "Compose the in-game screen per DESIGN.md §5: header `auto 1fr auto`
  (score·turn·score), compact counters, clue panel, then the 25-card board as the hero,
  log capped below. One viewport on mobile, RTL."
- *Token usage:* "Style this button as `btn-gold`: full-width primary CTA with the
  grape→gold→grape animated shimmer gradient, dark ink `#120A00`, weight 800, radius 9px,
  `:active` scale .97."

**Invariants the agent must never break:** RTL direction; word-card state colors;
color semantics (gold/grape/doubt); single font; one-viewport in-game on mobile.
