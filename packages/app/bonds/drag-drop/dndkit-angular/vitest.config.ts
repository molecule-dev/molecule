import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Tests render real Angular components: oxc (vitest 4's transformer) must compile their
  // legacy decorators, matching tsconfig.json's `experimentalDecorators` (oxc does not discover
  // the tsconfig on its own, and a decorator left in the output is a syntax error to the runner).
  oxc: {
    decorator: { legacy: true },
  },
  // In this workspace the package resolves its framework from molecule/node_modules while
  // @dnd-kit/*, installed at the workspace root, resolves the root copy: two runtimes load, and
  // the list breaks. A published install has one copy. Inlining the @dnd-kit packages lets Vite
  // resolve their imports, and dedupe gives them and the tests that same single Angular.
  resolve: { dedupe: ['@angular/core', '@angular/common', '@angular/platform-browser', 'rxjs'] },
  test: {
    globals: true,
    environment: 'node',
    // Signal inputs exist only in the compiled directive definition, so the
    // suite imports the built package; this compiles it with Angular's compiler
    // first (see vitest.global-setup.ts).
    globalSetup: ['./vitest.global-setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    fileParallelism: false,
    pool: 'forks',
    server: {
      deps: {
        inline: [
          /@dnd-kit\/abstract/,
          /@dnd-kit\/collision/,
          /@dnd-kit\/dom/,
          /@dnd-kit\/geometry/,
          /@dnd-kit\/helpers/,
          /@dnd-kit\/state/,
        ],
      },
    },
  },
})
