# @molecule/app-data-table-ui-react

React table primitives for `<Table>` from `@molecule/app-ui-react`.

Exports:
- `<DataTableCard>` — full polished-pattern data table (card wrapper +
  title + uppercase-th headers + divide-y body + skeleton + empty
  state). Drop-in for the most common dashboard CRUD use case.
- `<TableToolbar>` — top chrome with left/right slots + optional filter row.
- `<TableEmpty>` — single full-width "no rows" cell.
- `<TableFooter>` — bottom bar (left summary + right pagination).
- `<RowWithActions>` — `<tr>` wrapper with trailing actions cell and click handler.

Use `DataTableCard` for new screens; use the row-level primitives to
compose richer custom tables (group-by, expandable rows, etc.).

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
