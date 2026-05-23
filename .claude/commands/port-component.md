---
description: Port a section of the legacy index.html into a typed React component per DESIGN.md.
argument-hint: <component name or legacy section, e.g. "WordCard" or "lobby screen">
allowed-tools: Read, Write, Edit, Grep, Glob
---

Port this part of the legacy UI into the Next.js app: **$ARGUMENTS**

Workflow:
1. **Locate the legacy source** in `public/index.html` (markup + the relevant CSS in `<style>`
   + the render logic in `renderGame`/`renderLobby`/etc.). Read it fully so the port is faithful.
2. **Map to the design system.** Use tokens, component specs, layout, and RTL rules from
   `DESIGN.md`. Match the brand voice/glossary from `docs/brand/BRAND.md`. Do NOT invent new
   colors or restyle word-card state classes.
3. **Build the component** under `src/components/` per the architecture spec
   (`docs/superpowers/specs/2026-05-23-talmeeha-nextjs-design.md`):
   - TypeScript, props typed via a named interface, no `any`.
   - Read game state from the Zustand store via selectors; don't recompute game truth.
   - RTL-correct, Tajawal, weight-driven hierarchy, spring easing where the original animates.
   - Keep it small and focused (one clear responsibility); extract subcomponents if it grows.
4. **Preserve behavior exactly** — this is a parity port, not a redesign. Same interactions,
   same conditional visibility (roles: host/leader/guesser/spectator), same edge cases.
5. **Add/extend tests** where there is logic (Vitest), and note any E2E journey it touches.

After porting, summarize what changed and recommend running the `arabic-rtl-reviewer` agent.
