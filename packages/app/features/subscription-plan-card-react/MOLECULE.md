# @molecule/app-subscription-plan-card-react

Pricing / subscription plan card.

Exports `<SubscriptionPlanCard>` — header (badge + name +
description), price + interval, feature checklist, and a primary CTA
(button or link).

## Quick Start

```tsx
import { SubscriptionPlanCard } from '@molecule/app-subscription-plan-card-react'

declare function navigate(to: string): void

<SubscriptionPlanCard
  name="Pro"
  price="$19"
  interval="/month"
  features={['Unlimited projects', '10 GB storage', 'Priority support']}
  ctaLabel="Get started"
  onCta={() => navigate('/checkout/pro')}
  recommended
  badge="Most popular"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-subscription-plan-card-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `SubscriptionPlanCardProps`

Props for the {@link SubscriptionPlanCard} component.

```typescript
interface SubscriptionPlanCardProps {
  /** Plan name (e.g. "Pro", "Team", "Enterprise"). */
  name: ReactNode
  /** Optional tagline / one-liner. */
  description?: ReactNode
  /** Price string ("$19", "Free", "Custom") — apps own currency formatting. */
  price: ReactNode
  /** Billing interval label ("/month", "/yr", "per seat"). */
  interval?: ReactNode
  /** Bullet feature list. */
  features: ReactNode[]
  /** Primary CTA button label. */
  ctaLabel?: ReactNode
  /** Click / nav handler. */
  onCta?: () => void
  ctaHref?: string
  /** Visually highlight as the recommended / popular plan. */
  recommended?: boolean
  /** Optional badge content (e.g. "Most popular"). */
  badge?: ReactNode
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `SubscriptionPlanCard(props)`

Pricing / subscription plan card. Renders header (badge + name +
description), price + interval, feature checklist, and a primary
CTA (button or link).

```typescript
function SubscriptionPlanCard({
  name,
  description,
  price,
  interval,
  features,
  ctaLabel,
  onCta,
  ctaHref,
  recommended,
  badge,
  className,
}: SubscriptionPlanCardProps): JSX.Element
```

- `props` — Component props (see {@link SubscriptionPlanCardProps}).

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

- Must render inside the app's i18n provider and with a ClassMap bond
  wired (`useTranslation()` / `getClassMap()` throw otherwise).
- Prefer `onCta` with your router's navigate function for SPA
  navigation; `ctaHref` renders a plain anchor and causes a full page
  load.
- `recommended` highlights the card (outline + primary CTA color) and,
  when `badge` is omitted, shows a "Recommended" badge via the
  `plan.recommended` i18n key.
- `price`/`interval` are opaque display nodes — the app owns currency
  formatting and localization.

## Translations

Translation strings are provided by `@molecule/app-locales-subscription-plan-card`.
