import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { UserConfig } from 'vite'

import { createFrameworkViteConfig, type DefaultViteConfigBranding } from './framework-config.js'

/**
 * Returns the canonical Vite config for a React app styled with Tailwind:
 * {@link createFrameworkViteConfig} with `react()` and `tailwindcss()`. Every
 * flagship app uses it. A per-app vite.config.ts is:
 *
 * ```ts
 * import { defineConfig } from 'vite'
 * import { createDefaultViteConfig } from '@molecule/app-vite-config-default'
 * import { APP_DESCRIPTION, APP_NAME, BRAND_COLOR } from './src/branding.js'
 *
 * export default defineConfig(createDefaultViteConfig({ APP_NAME, APP_DESCRIPTION, BRAND_COLOR }))
 * ```
 *
 * Any other framework imports {@link createFrameworkViteConfig} from
 * `@molecule/app-vite-config-default/framework`, which loads neither plugin.
 *
 * @param branding - The PWA manifest's name, description and theme color.
 * @returns The config.
 */
export function createDefaultViteConfig(branding: DefaultViteConfigBranding): UserConfig {
  return createFrameworkViteConfig(branding, { plugins: [react(), tailwindcss()] })
}
