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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
