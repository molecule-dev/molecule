/**
 * Locale registration for the project resource.
 *
 * @module
 */

import { registerLocaleModule } from '@molecule/api-i18n'
import * as locales from '@molecule/api-locales-project'

registerLocaleModule(locales)

/**
 * The i18n registered.
 */
export const i18nRegistered = true
