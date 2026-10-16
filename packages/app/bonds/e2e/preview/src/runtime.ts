/**
 * The in-page locator runtime, as the classic script the dev server serves.
 *
 * Two servers hand this file out — the Vite plugin ({@link molE2EPreviewPlugin})
 * and the static-site template's own dev server — so the bytes live here once:
 * the runtime, and the header that says what it is.
 *
 * @module
 */

import { installE2ERuntime } from '@molecule/app-e2e-fixtures-default/runtime'

import { E2E_DRIVER_BANNER } from './driver-banner.js'

/**
 * The runtime as a classic script, ready to serve as `text/javascript`:
 * installing it with the document saves the driver a ~60 KB `evaluate` on the
 * first call after every navigation.
 *
 * It opens with {@link E2E_DRIVER_BANNER} — the served file says what it is and
 * where the app's real browser contract lives, because a reader who finds it in
 * the preview HTML (or fetches the page and follows the tags) has nothing else
 * to go on.
 */
export const E2E_PREVIEW_RUNTIME_SCRIPT = `${E2E_DRIVER_BANNER};(${String(installE2ERuntime)})();`
