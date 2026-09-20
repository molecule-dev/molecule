# DESIGN.md — Molecule Design System

This file defines the visual design system for all molecule applications. AI tools (Claude Code, Synthase, Cursor, Stitch) should reference this file when generating or modifying any UI component. Use only the values defined here — never invent arbitrary colors, fonts, sizes, or spacing.

## Colors

### Brand

- Primary: `#4070e0`
- Primary Hover: `#6090f0`
- Primary Dark: `#3060c0`
- Secondary: `#808080`
- Secondary Hover: `#a0a0a0`
- Secondary Dark: `#606060`

### Semantic

- Success: `#309000`
- Success Light: `#dcfce7`
- Warning: `#e0e040`
- Warning Light: `#fef3c7`
- Error: `#d02000`
- Error Light: `#fee2e2`
- Info: `#17a2b8`
- Info Light: `#cffafe`

### Backgrounds

- Primary: `#f6f6f6`
- Secondary: `#eeeeee`
- Tertiary: `#e8e8e8`
- Surface: `#ffffff`
- Surface Secondary: `#f8f8f8`
- Input: `#ffffff`
- Overlay: `rgba(0, 0, 0, 0.5)`

### Text

- Primary: `#333333`
- Secondary: `#808080`
- Tertiary: `#555555`
- Inverse: `#ffffff`
- Link: `#4070e0`
- Link Hover: `#3060c0`

### Borders

- Primary: `#e0e0e0`
- Secondary: `#d0d0d0`
- Focus: `#4070e0`

### Dark Theme Overrides

- Primary: `#60a5fa`
- Background: `#0f172a`
- Surface: `#1e293b`
- Text Primary: `#f8fafc`
- Text Secondary: `#cbd5e1`
- Border Primary: `#334155`

## Typography

### Font Families

- Sans (default): `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Serif: `Georgia, "Times New Roman", Times, serif`
- Mono: `SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`

### Font Sizes

- xs: `0.75rem` (12px)
- sm: `0.875rem` (14px)
- base: `1rem` (16px)
- lg: `1.125rem` (18px)
- xl: `1.25rem` (20px)
- 2xl: `1.5rem` (24px)
- 3xl: `1.875rem` (30px)
- 4xl: `2.25rem` (36px)
- 5xl: `3rem` (48px)

### Font Weights

- Light: `300`
- Normal: `400`
- Medium: `500`
- Semibold: `600`
- Bold: `700`

### Line Heights

- Tight: `1.25`
- Normal: `1.5`
- Relaxed: `1.75`

## Spacing

All spacing follows an 8px base grid:

- xs: `4px`
- sm: `8px`
- md: `16px`
- lg: `24px`
- xl: `32px`
- 2xl: `48px`
- 3xl: `64px`

## Border Radius

- none: `0`
- sm: `4px`
- md: `8px` (default for inputs, cards)
- lg: `12px` (modals, larger cards)
- xl: `16px`
- full: `9999px` (pills, avatars)

## Shadows

- sm: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- md: `0 4px 6px -1px rgba(0, 0, 0, 0.1)` (default for cards)
- lg: `0 10px 15px -3px rgba(0, 0, 0, 0.1)` (dropdowns, modals)
- xl: `0 20px 25px -5px rgba(0, 0, 0, 0.15)` (popovers)

## Breakpoints

- Mobile S: `320px`
- Mobile M: `375px`
- Mobile L: `425px`
- Tablet: `768px`
- Laptop: `1024px`
- Laptop L: `1440px`
- Desktop: `2560px`

## Transitions

- Fast: `150ms ease` (hover states, toggles)
- Normal: `300ms ease` (most animations)
- Slow: `500ms ease` (page transitions, modals)

## Z-Index Scale

- Dropdown: `1000`
- Sticky: `1100`
- Fixed: `1200`
- Modal: `1300`
- Popover: `1400`
- Tooltip: `1500`
- Toast: `1600`

## Components

### Buttons

- Variants: `solid` (filled), `outline` (bordered), `ghost` (transparent), `link` (text only)
- Sizes: `xs`, `sm`, `md` (default), `lg`, `xl`, `icon`
- Colors: primary, secondary, success, warning, error, info

Radius, padding, height, font size and weight are **not** free parameters here —
they are resolved by the ClassMap bond from the `size` you pass, and the
resolved values are tabulated under "CTA button sizing, radius & typography"
below. (Corrected 2026-09-20: this block used to list `8px` radius, `8px 16px`
padding, `500` weight and a 28/32/40/48/56px height scale, none of which any
shipped bond produces — a stale spec that reads exactly like a licence to pick
your own px.)

#### CTA color semantics (one action = one color, everywhere)

Every rendering of the same call-to-action uses the same semantic `color`, on
every surface that shows it — auth pages, banners (the shared `Banner`
component), chat notice cards (`ChatEventCardAction.color`), modals, panels.
Sibling CTAs in one surface should differ (that contrast is what makes each
stand out), but a given action never changes color between surfaces:

| CTA                                                    | Color                              | Anchored by                |
| ------------------------------------------------------ | ---------------------------------- | -------------------------- |
| Sign up / Create account                               | `primary`                          | auth page's Sign up button |
| Log in                                                 | `success`                          | auth page's Log in submit  |
| Upgrade / View plans / Raise spend cap (billing)       | `primary`                          | Pricing page's Upgrade CTA |
| Informational links (View on GitHub, docs, View issue) | `secondary`                        | quiet next to the real CTA |
| Destructive (Delete, Stop)                             | `error` (`warning` for pause-like) | Dashboard project cards    |

Implementation rule: CTAs are ALWAYS real design-system buttons —
`cm.button({ color, size })` via `getClassMap()` or the framework `Button` —
never hand-rolled inline-styled pills/links. Hand-rolled button styling is how
surfaces drift apart; if a surface can't use the component, it uses the
`cm.button` classes directly. Touch floor (owner decision 2026-08-13): every
LABEL/TEXT button composes `cm.touchTargetCompact` (36px coarse-pointer floor)
— the full 44px `cm.touchTarget` visibly bloats buttons that carry their own
visible box, and is reserved for icon-only hit targets whose visible glyph is
small and whose enlarged hit area is invisible (workspace toolbar icons, ×
dismiss buttons).

#### CTA button sizing, radius & typography (never inline style)

Color is only half the contract. A button's **size, corner radius, typography,
padding, fill, border and state transitions all come from `cm.button()`** — the
same one call — and from nowhere else. Never from an inline `style`, never from
a hand-picked px value, never from a literal hex or rgba.

The size tier is the only knob, and it resolves (in `@molecule/app-ui-tailwind`)
to fixed values every surface shares:

| `cm.button({ size })` | Height | Padding | Font size | Radius | Use for                                       |
| --------------------- | ------ | ------- | --------- | ------ | --------------------------------------------- |
| `'xs'` / `'sm'`       | 26px   | 10px    | 13px      | 3px    | inline strip / bar / card / chat-card actions |
| `'md'` (default)      | 30px   | 10px    | 15px      | 3px    | panel and page CTAs, form submits             |
| `'lg'` / `'xl'`       | 40px   | 10px    | 18px      | 3px    | hero / full-width page CTAs                   |
| `'icon'`              | 30×30  | —       | —         | 3px    | icon-only square buttons                      |

Note the radius is **3px at every tier** — it is a system constant, not a
per-button decision. Pick the tier that matches the surrounding surface and stop
there; do not "adjust" a tier with inline px.

The canonical recipe for every labelled action button:

```tsx
<button
  type="button"
  data-mol-id="<stable-id>"
  className={cm.cn(
    cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
    cm.touchTargetCompact,
  )}
  onClick={onCommit}
>
  {t('commit', undefined, { defaultValue: 'Commit' })}
</button>
```

And what NOT to write beside it: `fontSize`, `fontWeight`, `borderRadius`,
`padding`, `background`, `color`, `border`, `boxShadow`, `transition` — plus
`onMouseEnter`/`onMouseLeave` hover handlers, which the CVA already carries
(`hover:` / `active:` / `focus-visible:` / `disabled:`), and
`cursor: 'not-allowed'` + `opacity`, which the real `disabled` attribute
replaces (`disabled:opacity-50 disabled:pointer-events-none`). An inline style
**outranks** the ClassMap class it sits on, so writing one does not tweak the
design system — it silently switches the button off it (anti-pattern 12).

An inline `style` on a button is for what the ClassMap genuinely cannot express:
a specific width, a grid placement, an SVG attribute, a dynamic user-chosen
color. Those are layout and data, not design tokens.

Why this is written down: the IDE shipped a "Tests" button at 13px/3px radius
(through `cm.button({ size: 'xs' })`) stacked directly above a "Commit" button
at 12px/6px (hand-rolled, with a hardcoded `#4070e0` and hand-written hover).
Two buttons an inch apart, visibly different, because one of them opted out of
the system.

**Enforced at the moment of writing, not in review.** The ESLint rule
`molecule-local/no-hand-styled-button` (in both `molecule` and
`molecule-dev/app`, run on every staged `.tsx` by each repo's pre-commit hook)
errors on a `<button>` — or any `role="button"` element — whose inline `style`
sets a design-token property without going through `cm.button()`. Layout-only
properties (`display`, `flex`, `gap`, `width`, `position`, `zIndex`,
`transform`, `opacity`, `overflow`, `whiteSpace`, `marginLeft: 'auto'`, …) never
trip it.

Genuine icon-only chrome — a tab `×`, a chevron toggle, a carousel arrow, a
color swatch whose fill IS the data — opts out with an explicit, reasoned
directive comment on the element:

```tsx
{
  /* mol-bespoke-button: icon-only tab close, 20px hit target, no label */
}
```

The reason is mandatory (a bare `mol-bespoke-button` is itself an error), and
every opt-out in the fleet is one `grep -rn 'mol-bespoke-button'` away. Bespoke
chrome still takes color from theme tokens (`var(--mol-color-*)`) or `cm.*`,
never a raw hex, and still carries `cm.touchTarget` (44px, icon-only) or
`cm.touchTargetCompact` (36px, dense).

#### Actions look like buttons (owner decision 2026-09-15)

An action the user is meant to click — Run, Fix, Save, Apply, Stop, Create,
Retry — is always rendered as a VISIBLE button: `variant: 'solid'` for the
surface's one primary action, `variant: 'outline'` for every secondary action
beside it. `ghost` and `link` are for dismiss/close controls and for
show/hide toggles only — a ghost button reads as plain text, and a row of
plain-text "Run" links is how the first Tests card shipped and got rejected.
Sibling actions in one row share one size (`xs` inside chat cards, `sm`/`md` in
panels and pages). This holds for Synthase-built apps too (the scaffolded
styling skill says the same): an action that does not look like a button is a
defect, not a style choice.

### Command cards (chat) — `/scripts`, `/skills`, `/settings`, `/help`, `/test`

The slash-command views share ONE chrome so a new command never has to be
designed from scratch. `ScriptsCard` in `@molecule/app-ide-react` is the
reference implementation; a new command card copies it rather than its own
idea of a card:

- Container, header (title left, primary action right; title suppressed when
  embedded in the timeline) and search-field inset from `chatCardStyle()`; the
  same `cm.borderT` row rhythm; the same `<pre>` output block; the same
  `embedded` flag so the card renders identically as an overlay and as a
  timeline system-card.
- Buttons per the rule above, with one refinement for these dark, dense cards:
  EVERY action is `solid primary xs` — the header's Run all, each group's Run,
  each row's Run, each failure's Fix — exactly as ScriptsCard renders its Run
  buttons. `outline` reads as plain text at `xs` on the card surface (its
  border is a 60% border color), so it is not used inside chat cards; Stop is
  `solid error xs`; `ghost xs` only for close and show/hide.
- Status is a pill (`cm.textSuccess` / `cm.textError` / `cm.textMuted`), never
  a bare word.
- Long output (a runner's log, a script's captured stdout) is COLLAPSED by
  default behind a Show/Hide output toggle; a failed row keeps its output
  behind the same toggle.
- A failure the assistant can act on carries a "Fix with Synthase" action that
  sends ONE ordinary chat message with the file and the output — the same
  hand-off the editor's "fix with AI" uses.
- Every `button`/`input` carries a `data-mol-id` in the card's namespace
  (`<card>-run-<id>`, `<card>-fix-<id>`, …); all text through `t()`.
- Enforced by the `command-cards.design` test in `@molecule/app-ide-react`,
  which renders each card and rejects an action button that is not
  solid/outline.

### Cards

- Border radius: `12px` (lg)
- Shadow: `md` by default
- Padding: `16px` (md)
- Border: `1px solid` border-primary
- Variants: `default`, `elevated` (stronger shadow), `outline` (no shadow), `ghost` (no border/shadow)

### Inputs

- Border radius: `8px` (md)
- Border: `1px solid` border-primary
- Height: `40px` (md)
- Padding: `8px 12px`
- Focus: `2px solid` focus color with `2px` offset
- Error: border-error color, error-light background

### Badges

- Border radius: `9999px` (pill)
- Padding: `2px 8px`
- Font size: `xs` (12px)
- Font weight: `500`

### Alerts

- Border radius: `8px` (md)
- Padding: `12px 16px`
- Border-left: `4px solid` (accent variant)
- Variants: info (blue), success (green), warning (yellow), error (red)

### Modals

- Border radius: `12px` (lg)
- Shadow: `xl`
- Overlay: `rgba(0, 0, 0, 0.5)`
- Sizes: `sm` (400px), `md` (500px), `lg` (640px), `xl` (800px), `full` (100%)
- Padding: `24px` (lg)

### Tables

- Header background: surface-secondary
- Row hover: surface-secondary
- Border: `1px solid` border-primary
- Cell padding: `12px 16px`
- Striped: alternating surface/surface-secondary

### Navigation

- Sidebar width: `240px` (collapsed: `64px`)
- Top bar height: `56px`
- Active item: primary-light background, primary text

## Design Principles

1. **Consistency over creativity** — use the tokens above, don't invent new values
2. **8px grid** — all spacing should be multiples of 8px (with 4px for tight spaces)
3. **Semantic colors** — use success/warning/error/info for status, not arbitrary colors
4. **Hierarchy through weight** — use font weight and size for emphasis, not color alone
5. **Accessible contrast** — text on backgrounds must meet WCAG AA (4.5:1 for body, 3:1 for large text)
6. **Responsive first** — design for mobile, enhance for desktop
7. **Dark mode parity** — every screen must work in both light and dark themes

## CSS Variable Naming

All tokens are available as CSS custom properties with the `--mol-` prefix:

```css
var(--mol-color-primary)
var(--mol-color-bg-primary)
var(--mol-color-text-primary)
var(--mol-spacing-md)
var(--mol-radius-lg)
var(--mol-shadow-md)
var(--mol-font-sans)
var(--mol-text-lg)
var(--mol-transition-normal)
```

## Automation

All interactive elements should include `data-mol-id` attributes for AI agent interaction and E2E testing. See `@molecule/app-ui` automation module for helpers.
