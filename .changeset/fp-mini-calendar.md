---
'@molecule/app-mini-calendar-angular': patch
'@molecule/app-mini-calendar-react': patch
'@molecule/app-mini-calendar-solid': patch
'@molecule/app-mini-calendar-svelte': patch
'@molecule/app-mini-calendar-vue': patch
---

Weekday and month names follow the app's active locale when the `locale` prop is omitted, and an explicit locale still wins. The previous- and next-month buttons' labels are translated through `@molecule/app-locales-mini-calendar`, with English defaults.
