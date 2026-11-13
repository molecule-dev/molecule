/**
 * Side-effect module: bonds the reference ClassMap, icons and i18n before any
 * UI package is imported (some read the ClassMap while their module loads).
 * Import it FIRST in a conformance test, or list it in vitest `setupFiles`.
 *
 * @module
 */

import { installSharedBonds } from './environment.js'

installSharedBonds()
