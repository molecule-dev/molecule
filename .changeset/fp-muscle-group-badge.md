---
'@molecule/app-muscle-group-badge-react': patch
---

The muscle-group label is looked up through literal translation keys instead of a key assembled at runtime. The badge's surface and text colours come from the theme instead of fixed hex values, while the accent ring keeps each group's palette colour.
