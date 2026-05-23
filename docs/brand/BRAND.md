# BRAND.md — تلميحة (Talmeeha)

> The creative brand kit: story, name, mascot, logo, voice, and usage rules.
> For the technical design system (tokens, components, layout) see [`../../DESIGN.md`](../../DESIGN.md).
> For a visual catalog of tokens see [`preview.html`](preview.html).

---

## 1. The Name

**تلميحة** — romanized *talmeeḥa* (also written *Talmeeha*).

- **Meaning:** "a hint," "a clue," "a subtle allusion / a glimpse."
- **Root:** ل-م-ح *(l-m-ḥ)* — to glance, to glimpse, to allude. Same root as
  *لمحة* (a glance), *ملامح* (features/traits), *لمح البصر* (the blink of an eye).
- **Why it's the perfect name:** the entire game is one mechanic — a leader gives a single
  **hint** (تلميحة) and a number, and their team reads between the lines. The product name
  *is* the verb the player performs. It's short, native, evocative, and unmistakably Arabic.

**Usage:** Always Arabic-first (تلميحة). Latin transliteration "Talmeeha" is acceptable for
code, URLs, and non-Arabic contexts. Never "Talmeha"/"Talmeha7a" — use **Talmeeha**.

---

## 2. Brand Story & Personality

Talmeeha is a **late-night gathering of friends** turned into a game: dim the lights, split
into two teams, and trade clever hints until someone cracks the board — or trips the
assassin. It should feel like a premium card game you'd find on a glowing table, not a
corporate web app.

**Personality (5 traits):**
1. **Clever** — rewards wit and lateral thinking; the UI never patronizes.
2. **Warm** — friendly, inclusive Arabic; everyone at the table belongs.
3. **Playful** — emoji-forward, light teasing in copy, celebratory wins.
4. **Mysterious** — the dark, starlit canvas; hidden colors; the thrill of the unknown.
5. **Polished** — glassmorphism, gentle motion, considered typography. It feels *made*.

**Brand promise:** *"تلميحة واحدة تكفي"* — "one hint is enough." Trust your team to read it.

---

## 3. Mascot — عنقود (ʿAnqūd)

The grape cluster 🍇 is the face of Talmeeha. Name: **عنقود** *(ʿAnqūd, "the cluster")*.

**Rationale:** a *cluster* of grapes mirrors a *cluster* of words on the board and a
*cluster* of friends on a team — many small things that only make sense together. Purple
also ties the mascot to the brand-primary grape color and the doubt accent. It's friendly,
already beloved in the current UI, and instantly readable at favicon size.

**Behavior:** ʿAnqūd **floats and glows** on entry screens (gentle bob + purple drop-shadow
pulse). He punctuates key moments in copy and the game log (🍇 on game start, wins, copied
codes). He is calm during play — he does not bounce or distract while people are guessing.

**Do:** let him float on idle screens; use him in empty states and celebrations.
**Don't:** animate him during active guessing; don't restyle his color; don't pair him with
a competing mascot.

---

## 4. Logo

**Primary lockup (locked direction):** the **gradient wordmark** — تلميحة set in Tajawal 900,
filled with the signature `grape → gold → red` diagonal gradient (`135deg, #A78BFA → #FFD060
→ #FF7090`), with the floating grape mascot 🍇 centered above and a spaced, muted tagline
below.

```
            🍇            ← mascot, floating + glow
         تلميحة           ← wordmark, gradient fill, weight 900, letter-spacing -2px
   لعبة الفرق والكلمات      ← tagline, .75rem, letter-spacing 5px, --muted
```

**Lockups & variants to maintain:**
- **Full lockup** — mascot + wordmark + tagline (home screen, marketing).
- **Compact lockup** — small mascot + wordmark, no tagline (in-game, lobby headers, ~2.2rem).
- **Wordmark only** — تلميحة gradient, for tight spaces.
- **Mono variants** — solid `--text` (`#EEEEFF`) on dark; solid `#1A0E04` on light/sand —
  for cases where the gradient can't render (favicons, single-color print, embossing).

**Tagline options (Arabic):** *لعبة الفرق والكلمات* (current — "the teams & words game") ·
*تلميحة واحدة تكفي* ("one hint is enough") · *خمّن من تلميحة* ("guess from a hint").

**Clear space:** keep padding ≥ the height of the grape mascot around the full lockup.
**Don'ts:** don't recolor the gradient stops; don't outline or add a second drop-shadow to
the wordmark; don't stretch/condense; don't place the gradient wordmark on a light
background without switching to the mono dark variant.

---

## 5. Color (brand-level)

The full token set lives in DESIGN.md §2. At the brand level, remember the **meaning**:

| Color | Hex | Brand meaning |
|---|---|---|
| Grape | `#8B5CF6` | The brand itself — ʿAnqūd, identity, focus |
| Gold | `#E8A020` | Leadership, victory, the "premium" shimmer |
| Red | `#F04060` | Team energy (الأحمر) |
| Blue | `#2D6EFF` | Team energy (الأزرق) |
| Sand | `#F0E4C8` | The unknown — an unrevealed word, full of potential |
| Night | `#0A0A0F` | The stage; mystery; focus on the cards |

Signature gradient (logo, primary CTA, clue word): **grape → gold → red**, animated as a
slow horizontal shimmer on interactive elements.

---

## 6. Typography (brand-level)

**Tajawal** is the brand voice in type — one family, full weight range. Headlines and
anything the player acts on are **heavy (800–900)**; explanatory copy is 600. This single-
family, weight-driven hierarchy keeps the brand calm and unmistakably consistent. Never
introduce a second display font.

---

## 7. Voice & Tone (Arabic)

Talmeeha speaks **warm, modern, lightly playful Arabic** with a Gulf-friendly, conversational
register (e.g., *الشباب حواليك*). Short sentences. Encouraging. Emoji used as punctuation,
never clutter.

**Principles**
- **Speak to friends, not users.** "اسمك في اللعبة" not "اسم المستخدم".
- **Celebrate, don't lecture.** Wins get 🏆🍇; mistakes are light, never scolding.
- **One idea per line.** Buttons and hints are terse and scannable.
- **Emoji vocabulary:** 🍇 brand/celebration · 🎯 leader/aim · 🏆 win · 🤔 doubt ·
  ☠️ assassin · 🔴🔵 teams · 🚀 start · ⭐ leader badge.

**Copy examples (keep this register)**
| Context | Copy |
|---|---|
| Tagline | لعبة الفرق والكلمات |
| Primary CTA | ✦ إعداد اللعبة · 🚀 ابدأ اللعبة |
| Leader prompt | 🎯 القائد — أدخل التلميح |
| Doubt toggle | 🤔 علامة شك |
| Win | فاز {الفريق}! 🍇 |
| Assassin | ☠️ {اللاعب} كشف القاتل! |
| Toast (copy code) | تم نسخ الرمز 🍇 |

**Avoid:** stiff MSA officialese, ALL-CAPS Arabic shouting, sarcasm aimed at the player,
walls of text. Keep it the voice of a fun host, not a manual.

---

## 8. Glossary (canonical Arabic terms)

Keep these consistent across UI, code comments, and docs.

| Concept | Arabic | Notes |
|---|---|---|
| Hint / clue | تلميحة / تلميح | The core action; also the product name |
| Leader (spymaster) | القائد | Gives the hint; gold accent |
| Guesser | المخمّن / اللاعب | Reads the hint |
| Team | الفريق | الأحمر / الأزرق |
| Board / card | اللوحة / الكلمة | 25 words, 5×5 |
| Assassin | القاتل | Instant loss; ☠️ |
| Neutral | محايد | Ends turn, no score |
| Doubt mark | علامة الشك | Player uncertainty marker |
| Host mode | وضع المضيف | One device, pass-and-play |
| Online mode | وضع أونلاين | Room code, many devices |
| Room code | رمز الغرفة | 4 digits |
| Round / win | جولة / انتصار | Persistent scoreboard |

---

## 9. Asset Checklist (to produce during build)

- [ ] Favicon / app icon from mono grape mascot (multiple sizes, maskable)
- [ ] Open Graph / social share image (full lockup on night canvas)
- [ ] PWA manifest icons + theme color `#0A0A0F`
- [ ] Animated mascot component (`<Anqood />`) with reduced-motion fallback
- [ ] Logo component with all four lockups + mono variants
- [ ] `preview.html` kept in sync with DESIGN.md tokens
