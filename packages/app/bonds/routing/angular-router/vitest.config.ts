import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

// This bond's node_modules ancestor chain reaches `molecule/node_modules` (which has
// @angular/core, @angular/common and @angular/platform-browser) five directories up.
const moleculeNodeModules = fileURLToPath(new URL('../../../../../node_modules', import.meta.url))

export default defineConfig({
  // The tests run a real Angular Router: oxc must compile their legacy decorators,
  // matching tsconfig.json's `experimentalDecorators`.
  oxc: {
    decorator: { legacy: true },
  },
  resolve: {
    alias: [
      // @angular/router is installed only at the workspace root, while @angular/core,
      // @angular/common and @angular/platform-browser exist as separate physical
      // copies in molecule/node_modules AND the workspace root. The router's own
      // imports of those resolve to the workspace-root copies, so one test process
      // would load two @angular/core copies and Angular DI breaks with NG0203.
      // These exact-match aliases pin every import (the router's internals included)
      // to the one copy molecule/node_modules resolves to; subpaths such as
      // @angular/common/testing stay natural and land in that same tree.
      {
        find: /^@angular\/core$/,
        replacement: `${moleculeNodeModules}/@angular/core/fesm2022/core.mjs`,
      },
      {
        find: /^@angular\/common$/,
        replacement: `${moleculeNodeModules}/@angular/common/fesm2022/common.mjs`,
      },
      {
        find: /^@angular\/platform-browser$/,
        replacement: `${moleculeNodeModules}/@angular/platform-browser/fesm2022/platform-browser.mjs`,
      },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: false,
    pool: 'forks',
    // Aliases only apply to modules vite transforms, but vitest loads node_modules
    // externally (native import) by default — which is exactly how the router ends
    // up with its own workspace-root copy of @angular/core. Inline the Angular
    // packages so they go through the resolver above and share one registry.
    server: {
      deps: {
        inline: [/node_modules\/@angular\//],
      },
    },
  },
})
