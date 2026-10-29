---
'@molecule/api-uptime-molecule': minor
---

Add scheduled-monitor methods to the hosted uptime provider: `scheduleMonitor`, `listMonitors`, `monitorHistory` and `removeMonitor`, so an app can hand its uptime checks to molecule.dev on an interval (60 s–24 h, at most 10 monitors per project) with optional web-push down/recovery alerts, and read the stored 30-day check history back.
