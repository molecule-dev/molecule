---
'@molecule/app-class-schedule-react': patch
---

Weekday names follow the app's active locale unless an explicit `locale` is passed, and a locale switch updates the headers. The schedule's roles and labels now match its real structure, event titles are announced as each tile's accessible name, and slot and event buttons appear only when a click handler is supplied.
