/**
 * Locale registration for the course resource.
 *
 * Importing this module wires the companion `@molecule/api-locales-resource-course`
 * translations into the active i18n provider so the access-helper error keys
 * (`resourceCourse.error.*`) resolve to the user's locale.
 *
 * @module
 */

import { registerLocaleModule } from '@molecule/api-i18n'
import * as locales from '@molecule/api-locales-resource-course'

registerLocaleModule(locales)

/**
 * Set to `true` once the locale module has been registered.
 */
export const i18nRegistered = true
