---
'@molecule/app-ide-angular': patch
---

The preview panel ignores the iframe's initial about:blank `load`, so a preview that never loads gets the same retry as in React; quick-picker rows, skill names, author names and activity-card borders render with React's background, weight and hover border.
