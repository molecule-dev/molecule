/**
 * Class map reads for the package's module-level constants: the class strings (`alertDismissClass`,
 * `inputWrapperClass`, …) and the class records (`cardPaddingMap`, `toastPositionClasses`, …).
 *
 * An app may import this package before its startup code calls `setClassMap()` (ES imports run
 * before the importing module's body), so creating a constant must not throw when no class map is
 * bonded yet. Not part of the package's exports.
 *
 * @module
 */

import { getClassMap, type UIClassMap } from '@molecule/app-ui'

/**
 * One class map entry read now, or an empty string when no class map is bonded yet.
 *
 * @param read - Reads the entry from the class map (`(cm: UIClassMap) => cm.alertDismiss`).
 * @returns Its class string, or `''` before `setClassMap()`.
 */
export function classAtLoad(read: (cm: UIClassMap) => string): string {
  let cm: UIClassMap
  try {
    cm = getClassMap()
  } catch (_error) {
    // getClassMap throws only when no class map is bonded: the package was imported before the
    // app's setClassMap() call, which is allowed. The getter functions read the live class map.
    return ''
  }
  return read(cm)
}

/**
 * A record whose entries are read from the class map each time one is read (`create` runs on every
 * access), so it can be created while the module loads and follows a class map bonded later.
 *
 * @param create - Builds the record from the current class map.
 * @returns The live record.
 */
export function liveClassRecord<K extends string>(
  create: () => Record<K, string>,
): Record<K, string> {
  return new Proxy({} as Record<K, string>, {
    get: (_target, key) => Reflect.get(create(), key),
    has: (_target, key) => Reflect.has(create(), key),
    ownKeys: () => Reflect.ownKeys(create()),
    getOwnPropertyDescriptor: (_target, key) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(create(), key)
      // The target is an empty, extensible object, so each entry must be reported as configurable.
      return descriptor && { ...descriptor, configurable: true }
    },
  })
}
