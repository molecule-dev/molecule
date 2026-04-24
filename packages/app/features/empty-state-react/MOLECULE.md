# @molecule/app-empty-state-react

React empty-state and CTA-card primitives.

Exports:
- `<EmptyState>` — centred icon + title + description + action for lists,
  feeds, boards, or tables that have no rows to render yet.
- `<CtaCard>` — horizontal or vertical promotional card for "next-step"
  actions inside a page body.

Both components accept a `className` prop so apps can layer per-brand
accent chrome (dashed borders, gradient CTAs, tinted backgrounds) on
top of the structural layout.

## Type
`feature`

## Installation
```bash
npm install @molecule/app-empty-state-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
