/**
 * App-shell footer — About link, Privacy/Terms modals (i18n-loaded HTML),
 * language picker, version display.
 *
 * Reproduces the Footer pattern that appears in 9 flagship apps with one line
 * of variation (external WEBSITE_URL vs internal /about — handled here by
 * detecting `http`/`https` schemes in `aboutHref`).
 *
 * @example
 * import { AppFooter } from '@molecule/app-footer-react'
 * import { APP_NAME, WEBSITE_URL } from '../branding.js'
 * import { loadContent } from '../config.js'
 *
 * <AppFooter appName={APP_NAME} aboutHref={WEBSITE_URL} loadContent={loadContent} />
 */
export * from './AppFooter.js'
