/**
 * Locale registration for the tag resource.
 *
 * @module
 */

import { registerLocaleModule } from '@molecule/api-i18n'
import * as locales from '@molecule/api-locales-tag'

registerLocaleModule(locales)

/** Whether i18n registration has completed. */
export const i18nRegistered = true
