# @molecule/app-vite-config-default

Drop-in createDefaultViteConfig() factory used by every flagship app vite.config.ts. Captures react + tailwindcss + VitePWA plugin setup, molecule package pre-bundle exclusion, dev server proxy, env conventions.

## Type
`feature`

## Injection Notes

### Requirements
- None

### Post-Injection Steps
- Run `npm install` to install dependencies
- Run `npm run build` to compile

### Known Limitations
- None yet
