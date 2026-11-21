---
'@molecule/app-transactions-table-react': patch
---

Column headers and the retry button label are translated, and the default amount and date formats follow the app's active locale, with a new `currency` prop for the amount (default `USD`). Category icons are hidden from screen readers because the chip already names the category.
