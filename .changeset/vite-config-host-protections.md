---
'@molecule/app-vite-config-default': minor
---

Dev-server host protections are now environment-detected. Inside molecule preview containers (`/etc/mol` present, or `VITE_HOST` set) the config keeps the wide-open posture (`0.0.0.0`, `allowedHosts: true`, `fs.strict: false`) the IDE preview depends on. Everywhere else — a developer machine running `npm run dev` — it now defaults to `host: 'localhost'`, Vite's Host allowlist (localhost variants; extend via `VITE_ALLOWED_HOSTS=a,b`, disable with `*`), and Vite's strict `fs` confinement, closing the LAN-exposure / DNS-rebinding / `/@fs/` read triad the old defaults shipped.
