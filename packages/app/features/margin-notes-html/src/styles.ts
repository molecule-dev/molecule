/**
 * The layout's stylesheet. It selects only on the `data-mn-*` attributes the
 * renderer writes (no class names), and every size and colour is a custom
 * property you can override on `:root` or on the layout:
 *
 * | property | default | what |
 * |---|---|---|
 * | `--mn-measure` | `36rem` | prose column width |
 * | `--mn-gutter` | `18rem` | notes column width |
 * | `--mn-gap` | `2.5rem` | space between the columns |
 * | `--mn-prose-size` / `--mn-prose-size-phone` | `1.25rem` / `1.125rem` | prose font size |
 * | `--mn-line-height` | `1.6` | prose line height |
 * | `--mn-note-scale` | `0.75` | note size ÷ prose size (desktop) |
 * | `--mn-panel-scale` | `0.8` | note size ÷ prose size (phone panel) |
 * | `--mn-accent-1`, `--mn-accent-2`, … | blue, amber | each kind's colour, by position |
 * | `--mn-sticky-top` | `1rem` | how far below the viewport top a note sticks (your header's height) |
 * | `--mn-surface` | `Canvas` | the phone bar's background |
 * | `--mn-breakpoint` | — | fixed at 768px (media queries cannot read custom properties) |
 */
export const marginNotesCss = `
:where(:root) {
  --mn-measure: 36rem;
  --mn-gutter: 18rem;
  --mn-gap: 2.5rem;
  --mn-prose-size: 1.25rem;
  --mn-prose-size-phone: 1.125rem;
  --mn-line-height: 1.6;
  --mn-note-scale: 0.75;
  --mn-panel-scale: 0.8;
  --mn-accent-1: #2563eb;
  --mn-accent-2: #b45309;
  --mn-accent-3: #047857;
  --mn-sticky-top: 1rem;
  --mn-surface: Canvas;
}
@media (prefers-color-scheme: dark) {
  :where(:root) { --mn-accent-1: #60a5fa; --mn-accent-2: #f59e0b; --mn-accent-3: #34d399; }
}
[data-mn-root] {
  box-sizing: border-box;
  max-width: var(--mn-measure);
  margin-inline: auto;
  font-size: var(--mn-prose-size);
  line-height: var(--mn-line-height);
}
[data-mn-root][data-mn-has-notes] { max-width: calc(var(--mn-measure) + var(--mn-gap) + var(--mn-gutter)); }
[data-mn-rows] > [data-mn-row]:first-child [data-mn-block]:first-child > :first-child { margin-top: 0; }
[data-mn-block] { position: relative; border-radius: 0.25rem; transition: background-color 0.15s; }
[data-mn-block][data-mn-notes] { cursor: pointer; }
[data-mn-block][data-mn-tint] {
  background: color-mix(in srgb, var(--mn-tint-color, var(--mn-accent-1)) 10%, transparent);
}
[data-mn-block][data-mn-notes]:focus-visible { outline: 2px solid var(--mn-accent-1); outline-offset: 2px; }
[data-mn-mark] {
  position: absolute; left: -0.9rem; top: 0.75em;
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--mn-accent-1); display: none;
}
[data-mn-gutter] { display: none; }
[data-mn-sticky] {
  position: sticky; top: var(--mn-sticky-top);
  display: flex; flex-direction: column; gap: 0.75rem;
  margin-top: var(--mn-offset, 0px);
}
[data-mn-note] {
  box-sizing: border-box;
  font-family: inherit;
  font-size: calc(var(--mn-prose-size) * var(--mn-note-scale));
  line-height: 1.5;
  padding: 0.625rem 0.75rem;
  border-left: 3px solid var(--mn-note-accent, var(--mn-accent-1));
  border-radius: 0.375rem;
  background: color-mix(in srgb, var(--mn-note-accent, var(--mn-accent-1)) 7%, transparent);
  transition: background-color 0.15s, box-shadow 0.15s;
}
[data-mn-note][hidden] { display: none !important; }
[data-mn-note][data-mn-emphasis] {
  background: color-mix(in srgb, var(--mn-note-accent, var(--mn-accent-1)) 16%, transparent);
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.14);
}
[data-mn-note]:focus-visible { outline: 2px solid var(--mn-note-accent, var(--mn-accent-1)); outline-offset: 2px; }
[data-mn-note-label] {
  margin: 0 0 0.25rem;
  font-size: 0.75em; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--mn-note-accent, var(--mn-accent-1));
}
[data-mn-note-body] > :first-child { margin-top: 0; }
[data-mn-note-body] > :last-child { margin-bottom: 0; }
[data-mn-switches] {
  display: flex; flex-wrap: nowrap; align-items: center; justify-content: center; gap: 1rem;
}
[data-mn-switches="side"] { display: none; }
[data-mn-switch] {
  position: relative;
  display: inline-flex; align-items: center; gap: 0.5rem;
  min-height: 44px; padding: 0 0.25rem;
  background: none; border: 0; color: inherit;
  font: inherit; font-size: 0.9rem; white-space: nowrap; cursor: pointer;
}
[data-mn-switch]:focus-visible { outline: 2px solid var(--mn-note-accent, var(--mn-accent-1)); outline-offset: 2px; border-radius: 0.375rem; }
[data-mn-track] {
  position: relative; flex-shrink: 0;
  width: 40px; height: 22px; border-radius: 999px;
  background: color-mix(in srgb, currentColor 22%, transparent);
  transition: background-color 0.15s;
}
[data-mn-switch][aria-checked="true"] [data-mn-track] { background: var(--mn-note-accent, var(--mn-accent-1)); }
[data-mn-knob] {
  position: absolute; top: 2px; left: 2px;
  width: 18px; height: 18px; border-radius: 50%;
  background: #fff; box-shadow: 0 1px 2px rgb(0 0 0 / 0.3);
  transition: transform 0.15s;
}
[data-mn-switch][aria-checked="true"] [data-mn-knob] { transform: translateX(18px); }
[data-mn-spacer] { height: var(--mn-bar-space, 9rem); }
[data-mn-bar] {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 20;
  box-sizing: border-box;
  padding: 0.25rem 0.75rem calc(0.25rem + env(safe-area-inset-bottom, 0px));
  background: var(--mn-surface);
  border-top: 1px solid color-mix(in srgb, currentColor 15%, transparent);
  box-shadow: 0 -2px 10px rgb(0 0 0 / 0.08);
  font-size: var(--mn-prose-size-phone);
}
[data-mn-panel] {
  max-height: 0; overflow: hidden;
  transition: max-height 0.2s ease;
}
[data-mn-panel][data-mn-open] { max-height: 45vh; overflow-y: auto; padding-top: 0.5rem; }
[data-mn-panel] [data-mn-note] {
  font-size: calc(var(--mn-prose-size-phone) * var(--mn-panel-scale));
  margin-bottom: 0.5rem;
}
[data-mn-dismiss] {
  min-height: 44px; padding: 0 0.25rem;
  background: none; border: 0; color: inherit;
  font: inherit; font-size: 0.85rem; text-decoration: underline; cursor: pointer;
}
[data-mn-dismiss][hidden] { display: none; }
@media (max-width: 767.98px) {
  [data-mn-root] { font-size: var(--mn-prose-size-phone); }
}
@media (min-width: 768px) {
  [data-mn-root][data-mn-has-notes] [data-mn-row] {
    display: grid;
    grid-template-columns: minmax(0, var(--mn-measure)) var(--mn-gutter);
    column-gap: var(--mn-gap);
  }
  [data-mn-gutter] { display: block; }
  [data-mn-mark] { display: block; }
  [data-mn-switches="side"] { display: flex; }
  [data-mn-bar], [data-mn-spacer] { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  [data-mn-panel], [data-mn-knob], [data-mn-track], [data-mn-note], [data-mn-block] { transition: none; }
}
`

/**
 * The stylesheet as a `<style>` element, for pages that inline it.
 *
 * @returns `<style>…</style>`.
 */
export function marginNotesStyleTag(): string {
  return `<style data-mn-style>${marginNotesCss}</style>`
}
