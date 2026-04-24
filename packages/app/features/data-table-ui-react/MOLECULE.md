# @molecule/app-data-table-ui-react

React row-level primitives for `<Table>` from `@molecule/app-ui-react`.

Exports:
- `<TableToolbar>` — top chrome with left/right slots + optional filter row.
- `<TableEmpty>` — single full-width "no rows" cell.
- `<TableFooter>` — bottom bar (left summary + right pagination).
- `<RowWithActions>` — `<tr>` wrapper with trailing actions cell and click handler.

Use these to compose standard CRUD table screens without re-implementing
the surrounding chrome on every page.

## Type
`feature`

## Installation
```bash
npm install @molecule/app-data-table-ui-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
