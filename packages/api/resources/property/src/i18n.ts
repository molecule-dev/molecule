/**
 * Locale registration for the property resource.
 *
 * @module
 */

import { registerLocaleModule } from '@molecule/api-i18n'
import * as locales from '@molecule/api-locales-property'

registerLocaleModule(locales)

/** Whether i18n registration has completed. */
export const i18nRegistered = true
