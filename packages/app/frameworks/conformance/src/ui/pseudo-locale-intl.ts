/**
 * Makes Intl's worded output visible in the pseudo-locale, as `t()` already is.
 *
 * After a case's switch to the pseudo-locale, the kit's i18n provider renders every
 * translated string as `⟦text⟧`. A date such as "March 2026" or a relative time such as
 * "5 minutes ago" is worded by Intl, not by `t()`, and Intl reads the pseudo-locale as
 * plain English. So a component that formats in the app's active locale and one that
 * formats in a fixed `'en-US'` (or the browser's language) rendered the same snapshot,
 * and the conformance kit could not tell a port that ignores the locale switch from one
 * that follows it.
 *
 * Once installed, a date, relative-time or list formatter created for the pseudo-locale
 * (`new Intl.DateTimeFormat('en-XA')`, `date.toLocaleDateString('en-XA')`) brackets its
 * output the same way. Every other locale formats exactly as before. Numbers are left
 * alone: they carry no words.
 *
 * @module
 */

/** The constructors whose `format` this wraps. */
const FORMATTERS = ['DateTimeFormat', 'RelativeTimeFormat', 'ListFormat'] as const

/** The `Date` methods that format through `Intl.DateTimeFormat`. */
const DATE_METHODS = ['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'] as const

let installed = false

/**
 * Brackets the output of Intl's date, relative-time and list formatters made for one
 * locale. Installs once per test process; later calls do nothing.
 *
 * @param pseudoLocale - The locale whose output is bracketed (the kit's `en-XA`).
 */
export function installPseudoLocaleIntl(pseudoLocale: string): void {
  if (installed) return
  installed = true
  const isPseudo = (locales: unknown): boolean => {
    const first: unknown = Array.isArray(locales) ? locales[0] : locales
    return typeof first === 'string' && first.toLowerCase() === pseudoLocale.toLowerCase()
  }
  const bracket = (text: string): string => `⟦${text}⟧`

  for (const name of FORMATTERS) {
    const base = Intl[name]
    /**
     * The formatter Intl made, with `format` bracketed when it was made for the pseudo-locale.
     *
     * @param formatter - What the real constructor returned.
     * @param locales - The locales it was asked for.
     * @returns The formatter to hand back.
     */
    const wrapped = (formatter: object, locales: unknown): object =>
      isPseudo(locales)
        ? new Proxy(formatter, {
            get(target, property) {
              const value: unknown = Reflect.get(target, property, target)
              if (property === 'format' && typeof value === 'function')
                return (...args: unknown[]) => bracket(String(Reflect.apply(value, target, args)))
              return typeof value === 'function' ? value.bind(target) : value
            },
          })
        : formatter
    Object.defineProperty(Intl, name, {
      configurable: true,
      writable: true,
      value: new Proxy(base, {
        construct: (target, args) => wrapped(Reflect.construct(target, args), args[0]),
        // `Intl.DateTimeFormat(…)` without `new` constructs too.
        apply: (target, _this, args) => wrapped(Reflect.construct(target, args), args[0]),
      }),
    })
  }

  for (const method of DATE_METHODS) {
    const original = Date.prototype[method]
    Object.defineProperty(Date.prototype, method, {
      configurable: true,
      writable: true,
      value: function (this: Date, ...args: unknown[]): string {
        const text = String(Reflect.apply(original, this, args))
        return isPseudo(args[0]) ? bracket(text) : text
      },
    })
  }
}
