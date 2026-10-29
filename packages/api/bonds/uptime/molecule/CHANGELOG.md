# @molecule/api-uptime-molecule

## 1.2.0

### Minor Changes

- f7f17ec: Add scheduled-monitor methods to the hosted uptime provider: `scheduleMonitor`, `listMonitors`, `monitorHistory` and `removeMonitor`, so an app can hand its uptime checks to molecule.dev on an interval (60 s–24 h, at most 10 monitors per project) with optional web-push down/recovery alerts, and read the stored 30-day check history back.

## 1.1.0

### Minor Changes

- a570535: First release of the molecule.dev hosted uptime provider: probe a URL from molecule's vantage point — behind the render machine's egress guard (public addresses only, DNS verified per dial) — billed to your project, no vendor account. Reads `MOLECULE_API_KEY`; swap for `@molecule/api-uptime-fetch` without code changes.
