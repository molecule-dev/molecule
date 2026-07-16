# @molecule/app-muscle-group-badge-react

Anatomical muscle-group badge — small body-silhouette glyph with the
targeted muscle highlighted, plus a label. Used by workout-tracker
exercise-detail pages.

## Quick Start

```tsx
import { MuscleGroupBadge } from '@molecule/app-muscle-group-badge-react'

<MuscleGroupBadge group="chest" />
<MuscleGroupBadge group="quads" variant="compact" size="sm" />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-muscle-group-badge-react @molecule/app-i18n @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `MuscleGroupBadgeProps`

Props for {@link MuscleGroupBadge}.

```typescript
interface MuscleGroupBadgeProps {
  /** The muscle group represented by this badge. */
  group: MuscleGroup
  /** Override the auto-derived translated label. */
  label?: string
  /** Visual variant. */
  variant?: MuscleGroupBadgeVariant
  /** Display size. */
  size?: 'sm' | 'md' | 'lg'
  /** Optional accent color override (CSS color). */
  accentColor?: string
  /** `data-mol-id` attribute for AI-agent selectors. */
  dataMolId?: string
  /** Extra classes appended via the ClassMap `cn()` helper. */
  className?: string
}
```

### Types

#### `MuscleGroup`

Standard anatomical muscle groups recognized by the badge.

```typescript
type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'fullBody'
```

#### `MuscleGroupBadgeVariant`

Display variant.

```typescript
type MuscleGroupBadgeVariant = 'default' | 'compact'
```

### Functions

#### `defaultLabelFor(group)`

Default English label for a muscle group, used when no `label` is given
and the i18n bond doesn't have a translation. Returns the same string
the `t()` `defaultValue` would surface — exposed for tests and downstream
consumers that need to label buttons / menus / search filters by group.

```typescript
function defaultLabelFor(group: MuscleGroup): string
```

- `group` — The muscle group.

**Returns:** A short, capitalized English label.

#### `MuscleGroupBadge(props)`

Anatomical muscle-group badge — a small body-silhouette glyph with the
targeted muscle highlighted, plus a translated label. Used by
workout-tracker exercise-detail pages.

Two variants:
- `default` — glyph + label side-by-side.
- `compact` — glyph + label inline, smaller padding (good for chips).

```typescript
function MuscleGroupBadge({
  group,
  label,
  variant = 'default',
  size = 'md',
  accentColor,
  dataMolId,
  className,
}: MuscleGroupBadgeProps): JSX.Element
```

- `props` — Component props.

**Returns:** The rendered badge element.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

Requires a wired ClassMap bond and a React `I18nProvider` ancestor —
`getClassMap()` and `useTranslation()` both throw before wiring.

Labels resolve through `t('muscleGroupBadge.group.<group>')` but no
companion locale bond ships these keys yet — without app-registered
translations the built-in English labels render. Pass `label` to
override per-instance.

The pill background / text colors read the optional
`--mol-color-surface-variant` / `--mol-color-on-surface` CSS custom
properties and fall back to LIGHT-THEME values (near-white tint,
near-black text). Standard molecule themes do not define these vars —
define them (both themes) or the badge text stays dark on dark
surfaces. `accentColor` overrides the per-group border/glyph accent.
