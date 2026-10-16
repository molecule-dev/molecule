/**
 * The served runtime script (../runtime.ts): both servers that hand the
 * `/__mol/e2e-runtime.js` bundle out — the Vite plugin and the static-site
 * template's dev script — serve these same bytes, and they open with the header
 * that says what the file is (X1 flash-m67 read the bundle for its app's browser
 * contract because nothing said otherwise).
 */
import { describe, expect, it } from 'vitest'

import { E2E_DRIVER_BANNER } from '../driver-banner.js'
import { E2E_PREVIEW_RUNTIME_SCRIPT } from '../runtime.js'

describe('E2E_PREVIEW_RUNTIME_SCRIPT', () => {
  it('opens with the driver banner, then installs the runtime', () => {
    expect(E2E_PREVIEW_RUNTIME_SCRIPT.startsWith(E2E_DRIVER_BANNER)).toBe(true)
    const body = E2E_PREVIEW_RUNTIME_SCRIPT.slice(E2E_DRIVER_BANNER.length)
    // A comment, then the call — the script still runs once the banner is stripped.
    expect(body.startsWith(';(')).toBe(true)
    expect(body.endsWith(')();')).toBe(true)
  })

  it('says what the file is and where the app contract lives, in the served bytes', () => {
    expect(E2E_PREVIEW_RUNTIME_SCRIPT).toContain('NOT part of your app')
    expect(E2E_PREVIEW_RUNTIME_SCRIPT).toContain('SELECTORS.md')
  })
})
