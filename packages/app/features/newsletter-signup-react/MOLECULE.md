# @molecule/app-newsletter-signup-react

Email subscribe form.

Exports `<NewsletterSignup>` with inline + stacked layouts.

## Quick Start

```tsx
import { NewsletterSignup } from '@molecule/app-newsletter-signup-react'

<NewsletterSignup
  title="Stay in the loop"
  description="Get weekly updates delivered to your inbox."
  onSubscribe={async (email) => { await api.subscribe(email) }}
  layout="inline"
  successContent={<p>Thanks for subscribing!</p>}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-newsletter-signup-react
```

## API

### Functions

#### `NewsletterSignup(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Email + subscribe button widget. Tracks its own submitting/error/success
state. Apps own the actual subscription side-effect via `onSubscribe`.

```typescript
function NewsletterSignup({
  onSubscribe,
  title,
  description,
  placeholder,
  buttonLabel,
  successContent,
  layout = 'inline',
  className,
}: NewsletterSignupProps): JSX.Element
```

- `root0` — *
- `root0` — .onSubscribe
- `root0` — .title
- `root0` — .description
- `root0` — .placeholder
- `root0` — .buttonLabel
- `root0` — .successContent
- `root0` — .layout
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
