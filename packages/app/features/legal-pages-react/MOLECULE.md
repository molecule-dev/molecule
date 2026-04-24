# @molecule/app-legal-pages-react

React page scaffolds for Terms, Privacy, and PlanUpdated.

Exports both high-level "drop-in" page components (`TermsPage`,
`PrivacyPage`, `PlanUpdatedPage`) and composable primitives
(`LegalPageLayout`, `LegalPageSection`) for apps that need custom
chrome or structured multi-section content.

All text routes through `useTranslation()` so apps stay i18n-driven
while reusing the canonical layout and typography.

## Type
`feature`

## Installation
```bash
npm install @molecule/app-legal-pages-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0
