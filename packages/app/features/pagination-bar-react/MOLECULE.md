# @molecule/app-pagination-bar-react

React PaginationBar — page-window + "Showing X of Y" text + optional page-size selector.

Built on top of `<Button>` and `<Select>` from `@molecule/app-ui-react`
so it inherits the wired ClassMap styling. Apps drive the i18n noun via
the `showingKey` prop ("Showing 1 to 10 of 123 tags" vs. "…orders").

## Type
`feature`

## Installation
```bash
npm install @molecule/app-pagination-bar-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
