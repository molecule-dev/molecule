/**
 * Ionicons 2.0.1 icon font for molecule.dev — self-hosted, no external CDN.
 *
 * **Bond this provider when the app's markup renders icons through Ionicons
 * 2.x `i.ion-*` classes** (`<i class="ion-heart">`, `ion-plus-round`,
 * `ion-edit`, `ion-trash-a`, `ion-gear-a`, `ion-compose`, … — the class-name
 * set the RealWorld "Conduit" spec's markup is written against). Without it
 * the icon webfont is never loaded: every `<i class="ion-*">` renders 0×0,
 * glyphs disappear and e2e click targets on icon buttons fail.
 *
 * @example
 * ```typescript
 * import { setFont } from '@molecule/app-fonts'
 * import { font as icons } from '@molecule/app-fonts-ionicons'
 *
 * setFont(icons)   // once, at app startup — before first paint
 * ```
 *
 * `setFont()` injects the `@font-face` (served from the app's `/fonts/`)
 * plus the full `.ion-*` glyph stylesheet, so plain markup like
 *
 * ```html
 * <i class="ion-heart"></i>
 * ```
 *
 * renders its glyph with nothing else to wire. To bond it:
 *
 * ```bash
 * mlcl add @molecule/app-fonts-ionicons
 * ```
 *
 * @remarks
 * - **Wire with `setFont()` from `@molecule/app-fonts`, never a raw
 *   `bond('font', …)`** — `setFont()` injects the `@font-face` and the glyph
 *   CSS; a raw bond renders nothing.
 * - **Serve this package's `fonts/` directory at `/fonts/`** (`mlcl add`
 *   wires this) or every glyph renders as an empty box.
 * - This is the Ionicons **2.0.x** class-name set (`ion-heart`, not the
 *   version 4+ `ion-md-heart` names). Current Ionicons (4/5/6/7) use
 *   different class names and different packages; this provider exists so
 *   markup written against the 2.x names (RealWorld Conduit and its
 *   ecosystem) works self-hosted.
 *
 * @module
 */

export * from './provider.js'
