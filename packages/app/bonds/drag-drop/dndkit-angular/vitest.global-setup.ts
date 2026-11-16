import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Compiles the package with Angular's compiler before the suite runs.
 *
 * Signal inputs (`input()`) exist only in the compiled directive definition;
 * Angular's JIT compiler cannot discover them, so the tests import the compiled
 * package (`dist`) rather than the TypeScript source.
 */
export default function setup(): void {
  const here = dirname(fileURLToPath(import.meta.url))
  const resolveFromPackage = createRequire(import.meta.url)
  const compilerCli = dirname(resolveFromPackage.resolve('@angular/compiler-cli/package.json'))
  execFileSync(process.execPath, [join(compilerCli, 'bundles/src/bin/ngc.js')], {
    cwd: here,
    stdio: 'inherit',
  })
}
