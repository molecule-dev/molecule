/**
 * Font interfaces and provider system for molecule.dev.
 *
 * Registers a font per role (`sans`, `serif`, `mono`) and applies it app-wide:
 * `setFont()` bonds the definition, sets the `--mol-font-{role}` CSS variable,
 * and injects the loading CSS (`<link>` for CDN sources, `@font-face` for
 * local files) into the document head. Font bond packages (e.g.
 * `@molecule/app-fonts-inter`, `@molecule/app-fonts-jetbrains-mono`) export a
 * ready-made `FontDefinition` named `font`.
 *
 * @example
 * ```typescript
 * import { setFont } from '@molecule/app-fonts'
 * import { font as sans } from '@molecule/app-fonts-inter'
 * import { font as mono } from '@molecule/app-fonts-jetbrains-mono'
 *
 * setFont(sans)   // once, at app startup — before first paint
 * setFont(mono)
 * ```
 *
 * @remarks
 * - **ALL fonts are local — NEVER load one from a CDN.** Every provider bond here
 *   (`@molecule/app-fonts-inter`, `-jetbrains-mono`, `-material-symbols`, and the
 *   display/serif faces) is `source: 'local'` and self-hosts from `/fonts/`. Do
 *   NOT add a Google Fonts `<link href="https://fonts.googleapis.com…">`, an
 *   `@import url(https://fonts.gstatic…)`, or a `next/font/google` import: external
 *   fonts fail in the sandbox (egress is blocked), leak the visitor's IP, and add
 *   render-blocking round-trips (cross-site CDN caching died with browser cache
 *   partitioning ~2020). If an imported app loads fonts from a CDN, localize them —
 *   swap to one of these packages, or bundle the file + a local `@font-face`.
 * - **Consume fonts through the CSS variable (`var(--mol-font-sans)` etc.), never a
 *   hardcoded `font-family`** — the variable is the swap point; hardcoding defeats
 *   the bond. The app's theme/ClassMap layer normally references it already.
 * - **Local-source fonts load from `/fonts/<file>`.** Each `faces[].file` must be
 *   served at that public path or every face silently 404s and the fallback stack
 *   renders instead. CDN sources inject `<link>` tags (with preconnect origins).
 * - Call `setFont()` at startup, before first paint, to avoid a font flash; calling
 *   again for the same role replaces the font (idempotent per role).
 * - `getFontConfig()` always returns a complete config — roles never explicitly set
 *   fall back to system stacks (`systemSans`/`systemSerif`/`systemMono`).
 * - **Icon fonts (role `icon`, e.g. `@molecule/app-fonts-material-symbols`) are
 *   local like any other font** — never load them from a CDN. They carry a
 *   `utilityCss` string (the `.material-symbols-outlined` class) that `setFont()`
 *   injects with the `@font-face`, so the icon glyphs work fully offline. NEVER
 *   add a `<link href="https://fonts.googleapis.com/...Material+Symbols...">` —
 *   it fails in the sandbox (blocked egress) and leaks the visitor's IP.
 * - DOM injection is skipped outside the browser, so `setFont()` is SSR-safe.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
