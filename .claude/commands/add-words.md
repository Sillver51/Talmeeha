---
description: Add new Arabic words to the Talmeeha word bank with validation.
argument-hint: [word1 word2 …] (Arabic, single words)
allowed-tools: Read, Edit, Grep
---

Add the following Arabic words to the Talmeeha word bank: **$ARGUMENTS**

The word bank is the `WB` array in the legacy `server.js`, and (post-migration) the data
module under `src/lib/words/`. Update whichever currently exists; if both exist, update the
`src/lib/words/` module (it is the source of truth).

For each candidate word, enforce these rules before adding:
- **Single word only** — no spaces, no phrases.
- **Arabic script** — reject Latin/numeric tokens.
- **No duplicates** — skip any word already present (search the bank first).
- **Family-friendly and clue-able** — concrete, well-known nouns/concepts that work as
  guessable board words (people, places, animals, food, objects, ideas). Reject proper names
  of living individuals, slurs, or anything not broadly recognizable.
- **Balanced** — prefer words that don't trivially collide with existing ones.

Report which words were added, which were skipped (with the reason), and the new total count.
Keep the array formatting consistent with the existing style. Do not reorder existing entries.
