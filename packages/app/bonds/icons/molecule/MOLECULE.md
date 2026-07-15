# @molecule/app-icons-molecule

Molecule default icon set for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-icons-molecule @molecule/app-icons
```

## API

### Constants

#### `arrowDown`

```typescript
const arrowDown: IconData
```

#### `arrowLeft`

```typescript
const arrowLeft: IconData
```

#### `arrowRight`

```typescript
const arrowRight: IconData
```

#### `arrowUp`

```typescript
const arrowUp: IconData
```

#### `bell`

```typescript
const bell: IconData
```

#### `bookmark`

```typescript
const bookmark: IconData
```

#### `browser`

Browser window — used by the IDE preview device-frame cycle to represent the
"responsive" (no fixed device frame, full-width) state.

```typescript
const browser: IconData
```

#### `bug`

Bug / report glyph — used for "report a bug" affordances (e.g. the IDE chat
header's report button). A real beetle silhouette, not a warning triangle.

```typescript
const bug: IconData
```

#### `calendar`

```typescript
const calendar: IconData
```

#### `chat`

Speech-bubble glyph (authentic GitHub Octicons 16px `comment`). The themed
channel icon for SMS/message activity in `@molecule/app-ide-react`'s Activity
card + panel — the SVG counterpart to the old `💬` emoji. Filled with
`currentColor` so it follows the surrounding theme token like the rest of the
set.

```typescript
const chat: IconData
```

#### `check`

```typescript
const check: IconData
```

#### `checkCircle`

```typescript
const checkCircle: IconData
```

#### `chevronDown`

```typescript
const chevronDown: IconData
```

#### `chevronLeft`

```typescript
const chevronLeft: IconData
```

#### `chevronRight`

```typescript
const chevronRight: IconData
```

#### `chevronsLeft`

SVG path data for the chevrons left icon.

```typescript
const chevronsLeft: IconData
```

#### `chevronsRight`

SVG path data for the chevrons right icon.

```typescript
const chevronsRight: IconData
```

#### `chevronsUpDown`

SVG path data for the chevrons up-down icon — the universal neutral "this
column is sortable but not currently sorted" glyph. Composed from the same
`chevron-up` and `chevron-down` shapes (translated into the top and bottom
halves) so it reads as one consistent family with the active asc/desc
indicators.

```typescript
const chevronsUpDown: IconData
```

#### `chevronUp`

```typescript
const chevronUp: IconData
```

#### `clock`

```typescript
const clock: IconData
```

#### `code`

```typescript
const code: IconData
```

#### `copy`

```typescript
const copy: IconData
```

#### `deviceDesktop`

Monitor / desktop display — used by the IDE preview device-frame cycle.

```typescript
const deviceDesktop: IconData
```

#### `deviceMobile`

Smartphone / mobile device — used by the IDE preview device-frame cycle.

```typescript
const deviceMobile: IconData
```

#### `deviceTablet`

Tablet device (landscape slab with a home indicator) — used by the IDE
preview device-frame cycle. Octicons has no tablet glyph, so this is drawn
in the same 16px filled style: an outer rounded body, an inset screen cut
out via the `evenodd` rule, and a home dot inside the screen.

```typescript
const deviceTablet: IconData
```

#### `download`

```typescript
const download: IconData
```

#### `ellipsisHorizontal`

```typescript
const ellipsisHorizontal: IconData
```

#### `exclamationTriangle`

```typescript
const exclamationTriangle: IconData
```

#### `eye`

```typescript
const eye: IconData
```

#### `eyeClosed`

```typescript
const eyeClosed: IconData
```

#### `file`

```typescript
const file: IconData
```

#### `filter`

```typescript
const filter: IconData
```

#### `folder`

```typescript
const folder: IconData
```

#### `gear`

```typescript
const gear: IconData
```

#### `github`

SVG path data for the github icon.

```typescript
const github: IconData
```

#### `gitlab`

SVG path data for the gitlab icon.

```typescript
const gitlab: IconData
```

#### `globe`

```typescript
const globe: IconData
```

#### `google`

SVG path data for the google icon.

```typescript
const google: IconData
```

#### `hash`

Hash/number-sign glyph (a hand-built `#` — four bars in the 16px box). The
themed channel icon for chat-channel activity in `@molecule/app-ide-react`'s
Activity card + panel — the SVG counterpart to the old literal `#` text glyph.
Filled with `currentColor` so it follows the surrounding theme token like the
rest of the set.

```typescript
const hash: IconData
```

#### `heart`

```typescript
const heart: IconData
```

#### `history`

```typescript
const history: IconData
```

#### `home`

```typescript
const home: IconData
```

#### `icons`

Molecule default icon set — all icons keyed by kebab-case name.

Built from individual icon modules in `./icons/`.

```typescript
const icons: IconSet
```

#### `iconSet`

Molecule default icon set provider. Wire at app startup:
```typescript
import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
setIconSet(iconSet)
```

```typescript
const iconSet: IconSet
```

#### `image`

```typescript
const image: IconData
```

#### `infoCircle`

```typescript
const infoCircle: IconData
```

#### `lightbulb`

```typescript
const lightbulb: IconData
```

#### `link`

```typescript
const link: IconData
```

#### `linkExternal`

```typescript
const linkExternal: IconData
```

#### `lock`

```typescript
const lock: IconData
```

#### `logoDot`

SVG path data for the logo dot icon.

```typescript
const logoDot: IconData
```

#### `logoMark`

SVG path data for the logo mark icon.

```typescript
const logoMark: IconData
```

#### `mail`

```typescript
const mail: IconData
```

#### `maximize`

```typescript
const maximize: IconData
```

#### `mention`

```typescript
const mention: IconData
```

#### `menu`

```typescript
const menu: IconData
```

#### `microphone`

```typescript
const microphone: IconData
```

#### `minimize`

```typescript
const minimize: IconData
```

#### `minus`

```typescript
const minus: IconData
```

#### `moon`

```typescript
const moon: IconData
```

#### `paperclip`

```typescript
const paperclip: IconData
```

#### `pencil`

```typescript
const pencil: IconData
```

#### `people`

```typescript
const people: IconData
```

#### `pin`

```typescript
const pin: IconData
```

#### `plus`

```typescript
const plus: IconData
```

#### `question`

```typescript
const question: IconData
```

#### `reply`

```typescript
const reply: IconData
```

#### `rotate`

Screen / device rotation (portrait ⇄ landscape) — used by the IDE preview
panel's "Rotate" control to swap a fixed-frame device (tablet / mobile)
between portrait and landscape.

Octicons has no screen-rotation glyph, so this is the canonical Material
Design `screen_rotation` mark (a tilted device with the two curved
re-orientation arrows) — instantly recognizable as "rotate the screen" and
clearly distinct from the neighbouring two-arrow `sync`/refresh glyph. It is
drawn on Material's native 24×24 grid; the renderer scales it to the
requested pixel size like any other glyph.

```typescript
const rotate: IconData
```

#### `search`

```typescript
const search: IconData
```

#### `share`

```typescript
const share: IconData
```

#### `signIn`

```typescript
const signIn: IconData
```

#### `signOut`

```typescript
const signOut: IconData
```

#### `sortAsc`

```typescript
const sortAsc: IconData
```

#### `sortDesc`

```typescript
const sortDesc: IconData
```

#### `sparkle`

A four-point sparkle (✦) — the "smart tip / suggestion" glyph used for the
proactive relevant-skill hint and the onboarding tip card. Reads as a tip far
better than the generic lightbulb it replaces (P3-01). Each of the four edges is
a quadratic curve that bows toward the centre, forming the concave points.

```typescript
const sparkle: IconData
```

#### `star`

```typescript
const star: IconData
```

#### `starOutline`

```typescript
const starOutline: IconData
```

#### `sun`

```typescript
const sun: IconData
```

#### `sync`

```typescript
const sync: IconData
```

#### `table`

```typescript
const table: IconData
```

#### `tag`

```typescript
const tag: IconData
```

#### `thumbsdown`

```typescript
const thumbsdown: IconData
```

#### `thumbsup`

```typescript
const thumbsup: IconData
```

#### `trash`

```typescript
const trash: IconData
```

#### `twitter`

SVG path data for the twitter icon.

```typescript
const twitter: IconData
```

#### `unlock`

```typescript
const unlock: IconData
```

#### `upload`

```typescript
const upload: IconData
```

#### `user`

```typescript
const user: IconData
```

#### `xCircle`

```typescript
const xCircle: IconData
```

#### `xMark`

```typescript
const xMark: IconData
```

## Core Interface
Implements `@molecule/app-icons` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-icons` ^1.0.0

### Runtime Dependencies

- `@molecule/app-icons`
