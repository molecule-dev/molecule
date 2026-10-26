# @molecule/api-uptime-molecule

## 1.1.0

### Minor Changes

- a570535: First release of the molecule.dev hosted uptime provider: probe a URL from molecule's vantage point — behind the render machine's egress guard (public addresses only, DNS verified per dial) — billed to your project, no vendor account. Reads `MOLECULE_API_KEY`; swap for `@molecule/api-uptime-fetch` without code changes.
