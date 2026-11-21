---
'@molecule/app-search-autocomplete-react': minor
---

Adds `ariaLabel` (defaults to the translated `search.aria.label`, so the input always has an accessible name), resets the keyboard highlight in the same render as a new query, and never points `aria-activedescendant` at an option the list no longer has.
