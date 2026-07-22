/**
 * Framework-agnostic i18next provider implementation.
 *
 * Uses only i18next directly (no react-i18next), making it suitable
 * for Vue, Angular, Svelte, Solid, and any other framework.
 *
 * @module
 */

import i18next, { type i18n as I18nInstance, type InitOptions } from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import { error, getLogger } from '@molecule/app-logger'

import type {
  DateFormatOptions,
  I18nextProviderConfig,
  I18nProvider,
  InterpolationValues,
  LocaleConfig,
  NumberFormatOptions,
  Translations,
} from './types.js'
import { localeConfigToResources } from './utilities.js'

/**
 * Milliseconds per relative-time unit (calendar units are approximations:
 * 30-day month, 90-day quarter, 365-day year — matching the auto-select
 * thresholds in `formatRelativeTime`).
 */
const UNIT_MS: Record<string, number> = {
  second: 1000,
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
  month: 2_592_000_000,
  quarter: 7_776_000_000,
  year: 31_536_000_000,
}

/**
 * Creates a framework-agnostic i18n provider backed by i18next. Supports eager and lazy-loaded
 * locale translations, browser language detection, custom plugins, and Intl-based number/date/list formatting.
 * @param config - i18next provider configuration including `defaultLocale`, `locales` (with optional `loader` for lazy loading), `detection` flag, `debug`, `plugins`, and raw `i18nextOptions`.
 * @returns An `I18nProvider` with translation, formatting, locale management methods, plus the underlying `i18n` instance and `initialize()` function.
 */
export const createI18nextProvider = (
  config: I18nextProviderConfig = {},
): I18nProvider & { i18n: I18nInstance; initialize: () => Promise<void> } => {
  const {
    defaultLocale = 'en',
    fallbackLocale,
    locales = [],
    detection = true,
    detectionOptions,
    debug = false,
    i18nextOptions = {},
    plugins = [],
  } = config

  // Store locale configs for metadata
  const localeConfigs = new Map<string, LocaleConfig>()
  for (const locale of locales) {
    localeConfigs.set(locale.code, locale)
  }

  const logger = getLogger('i18n')

  // Create i18next instance
  const i18n = i18next.createInstance()

  // Track which lazy locales have been loaded
  const loadedLocales = new Set<string>()

  // Registry of lazily-loaded content modules for auto-reload on locale change
  const contentLoaders = new Map<string, (locale: string) => Promise<void>>()

  // Initialize flag
  let initialized = false

  // The provider-owned `supportedLngs` list — null when the initial `locales`
  // config is empty (no anchor) or the caller manages `supportedLngs` via
  // `i18nextOptions`. Passed BY REFERENCE into `init()` and mutated by
  // `addLocale`/`removeLocale`/`addTranslations` so late-registered locales
  // stay changeable: i18next consults `supportedLngs` on every
  // `changeLanguage()`, and an unlisted code silently resolves to
  // `fallbackLng` (a late `addLocale('de')` would render English while
  // claiming to be German).
  const supportedLngsList: string[] | null =
    localeConfigs.size > 0 ? Array.from(localeConfigs.keys()) : null

  /**
   * Adds a locale to `supportedLngs` (see the `supportedLngsList` note). Covers
   * both the pre-init window (mutates the list `init()` will read) and post-init
   * (i18next may have cloned the array into `i18n.options`).
   * @param code - The locale code to register.
   */
  const registerSupportedLng = (code: string): void => {
    if (supportedLngsList && !supportedLngsList.includes(code)) supportedLngsList.push(code)
    const live = i18n.options?.supportedLngs
    if (Array.isArray(live) && live !== supportedLngsList && !live.includes(code)) live.push(code)
  }

  /**
   * Removes a locale from `supportedLngs` (see {@link registerSupportedLng}).
   * @param code - The locale code to unregister.
   */
  const unregisterSupportedLng = (code: string): void => {
    if (supportedLngsList) {
      const i = supportedLngsList.indexOf(code)
      if (i !== -1) supportedLngsList.splice(i, 1)
    }
    const live = i18n.options?.supportedLngs
    if (Array.isArray(live) && live !== supportedLngsList) {
      const i = live.indexOf(code)
      if (i !== -1) live.splice(i, 1)
    }
  }

  /**
   * Mirrors the active locale onto `<html lang>` + `<html dir>` so browsers,
   * assistive tech, and CSS (`:dir(rtl)`, logical properties) see the real
   * locale. Without this, screen readers kept the boot-time `lang` (wrong
   * pronunciation rules — WCAG 3.1.1) and RTL locales (Arabic, Hebrew, Farsi,
   * Urdu) rendered left-to-right. Guarded for non-DOM runtimes (SSR, native,
   * vitest node).
   * @param lng - The resolved locale code (post-detection/fallback).
   */
  const applyDocumentLocale = (lng: string): void => {
    if (typeof document === 'undefined') return
    document.documentElement.lang = lng
    document.documentElement.dir = localeConfigs.get(lng)?.direction || i18n.dir(lng)
  }
  // Memoized so concurrent callers (the auto-init at create time + a consumer's
  // own `await provider.initialize()` / `setLocale()`) share ONE `i18n.init()`
  // instead of racing a second init against the first.
  let initPromise: Promise<void> | null = null

  // Bundles registered before i18next finished initializing. i18next's deferred
  // init REPLACES the resource store with the `resources` passed to `init()`,
  // silently WIPING any bundle added in the create → init window — which is
  // exactly the standard startup sequence (`setProvider(provider)` followed
  // synchronously by `registerLocaleModule(...)` / `addTranslations(...)`).
  // Queue those bundles and replay them once init settles so startup-registered
  // translations survive.
  const pendingBundles: Array<{ lng: string; ns: string; translations: Translations }> = []

  // Locale change listeners
  const listeners = new Set<(locale: string) => void>()

  const doInitialize = async (): Promise<void> => {
    const initOptions: InitOptions = {
      // When detection is enabled, `lng` MUST stay unset: i18next only consults
      // the language detector when no explicit `lng` is configured
      // (`changeLanguage(lng)` skips `detect()` for a defined lng). Passing
      // `lng: defaultLocale` unconditionally made `detection: true` (the
      // default) silently dead — every browser started in `defaultLocale`
      // regardless of `?lng=` or `navigator.language`. `fallbackLng` still
      // anchors rendering to the default locale when nothing is detected or a
      // key is missing. Callers can force a fixed startup locale with
      // `detection: false` (or an explicit `i18nextOptions.lng`).
      ...(detection ? {} : { lng: defaultLocale }),
      fallbackLng: fallbackLocale || defaultLocale,
      debug,
      resources: localeConfigToResources(locales),
      // Anchor detection to the registered locale set: i18next's
      // `getBestMatchFromCodes` resolves a detected regional variant (`en-US`,
      // `pt-BR`) to its registered base (`en`, `pt`) — but ONLY when the exact
      // code isn't claimed supported. Without `supportedLngs`, detection
      // reported the raw code as `i18n.language`, no locale config matched it,
      // and language pickers rendered a BLANK current-language label. Exact
      // registered codes still win (`zh-TW` detects as `zh-TW`, not `zh`).
      // NOTE: `nonExplicitSupportedLngs: true` would DEFEAT this — it makes
      // `isSupportedCode('en-US')` true via the base, so the raw `en-US` is
      // accepted on the first pass instead of normalized to `en`. Callers can
      // still override via `i18nextOptions.supportedLngs`. The list is the
      // provider-owned `supportedLngsList` (mutated by addLocale/removeLocale
      // — see above).
      ...(supportedLngsList ? { supportedLngs: supportedLngsList } : {}),
      interpolation: {
        escapeValue: false, // Frameworks handle escaping
      },
      ...i18nextOptions,
    }

    // Add language detector if enabled
    if (detection) {
      i18n.use(LanguageDetector)
      // Default: detect from querystring and navigator only, no caching.
      // Users can explicitly enable localStorage caching via detectionOptions.
      initOptions.detection = detectionOptions || {
        order: ['querystring', 'navigator'],
        caches: [], // No default caching - storage must be explicitly configured
      }
    }

    // Apply custom plugins (e.g. react-i18next's initReactI18next)
    for (const plugin of plugins) {
      i18n.use(plugin as Parameters<typeof i18n.use>[0])
    }

    await i18n.init(initOptions)

    // If detection landed on a locale whose translations are lazy-loaded,
    // load them now — loaders otherwise only run inside setLocale(), so the
    // provider would REPORT the detected locale while rendering fallbackLng
    // text (language picker says "Français", every string is English).
    // `i18n.languages` is the resolution chain (detected code, its base
    // language, fallbacks), so a detected `fr-FR` also loads a `fr` config.
    for (const lng of i18n.languages ?? []) {
      const config = localeConfigs.get(lng)
      if (config?.loader && !loadedLocales.has(lng)) {
        const translations = await config.loader()
        i18n.addResourceBundle(lng, 'translation', translations, true, true)
        loadedLocales.add(lng)
      }
    }

    // Listen for language changes
    i18n.on('languageChanged', (lng: string) => {
      applyDocumentLocale(lng)
      listeners.forEach((listener) => listener(lng))
    })

    initialized = true

    // Apply the initial (detected or default) locale to the document — the
    // languageChanged listener only fires on *changes* after this point.
    applyDocumentLocale(i18n.language || defaultLocale)

    // Replay bundles that were registered while init was still settling —
    // init just reset the store to `initOptions.resources`, dropping them.
    for (const bundle of pendingBundles) {
      i18n.addResourceBundle(bundle.lng, bundle.ns, bundle.translations, true, true)
    }
    pendingBundles.length = 0
  }

  const initialize = (): Promise<void> => {
    if (!initPromise) {
      initPromise = doInitialize()
    }
    return initPromise
  }

  // Auto-initialize
  initialize().catch((err) => error('i18next provider initialization failed', err))

  // Named (rather than `return { ... }`) so methods can reference each other
  // without `this` — `formatDate({ relative: true })` crashed with an opaque
  // "Cannot read properties of undefined" when callers destructured methods
  // off the provider (`const { formatDate } = getProvider()`).
  const provider: I18nProvider & { i18n: I18nInstance; initialize: () => Promise<void> } = {
    i18n,
    initialize,

    getLocale: (): string => i18n.language || defaultLocale,

    async setLocale(locale: string): Promise<void> {
      if (!initialized) await initialize()

      // Fleet contract (documented on `I18nProvider.setLocale` in
      // @molecule/app-i18n): reject an unregistered locale instead of
      // silently degrading to `fallbackLng` text. Real i18next's own
      // `changeLanguage()` never throws for an unknown code — it just
      // renders fallback translations while `getLocale()` reports the
      // unregistered code — which let this bond diverge from the core
      // simple provider (which throws). "Registered" means added via the
      // `locales` config, `addLocale()`, or `addTranslations()` (all three
      // populate `localeConfigs`).
      if (!localeConfigs.has(locale)) {
        throw new Error(`Locale "${locale}" not found`)
      }

      // Load lazy translations if this locale has a loader and hasn't been loaded yet
      const localeConfig = localeConfigs.get(locale)
      if (localeConfig?.loader && !loadedLocales.has(locale)) {
        const translations = await localeConfig.loader()
        i18n.addResourceBundle(locale, 'translation', translations, true, true)
        loadedLocales.add(locale)
      }

      // Reload all registered content modules for the new locale.
      // This happens BEFORE changeLanguage so content keys are available
      // when the languageChanged event fires and UI components re-render.
      if (contentLoaders.size > 0) {
        logger.debug('Reloading content modules', contentLoaders.size, locale)
        await Promise.all(Array.from(contentLoaders.values()).map((loader) => loader(locale)))
      }

      await i18n.changeLanguage(locale)
    },

    getLocales: (): LocaleConfig[] => {
      return Array.from(localeConfigs.values())
    },

    addLocale(config: LocaleConfig): void {
      localeConfigs.set(config.code, config)
      registerSupportedLng(config.code)
      if (!initialized) {
        pendingBundles.push({
          lng: config.code,
          ns: 'translation',
          translations: config.translations ?? {},
        })
      }
      i18n.addResourceBundle(config.code, 'translation', config.translations ?? {}, true, true)
      listeners.forEach((listener) => listener(i18n.language))
    },

    removeLocale(code: string): boolean {
      const removed = localeConfigs.delete(code)
      if (removed) {
        unregisterSupportedLng(code)
        // Also drop any not-yet-replayed startup bundle so the deferred init
        // replay can't resurrect a locale that was explicitly removed.
        for (let i = pendingBundles.length - 1; i >= 0; i--) {
          if (pendingBundles[i].lng === code) pendingBundles.splice(i, 1)
        }
        i18n.removeResourceBundle(code, 'translation')
        listeners.forEach((listener) => listener(i18n.language))
      }
      return removed
    },

    addTranslations(locale: string, translations: Translations, namespace = 'translation'): void {
      if (!initialized) {
        pendingBundles.push({ lng: locale, ns: namespace, translations })
      }
      i18n.addResourceBundle(locale, namespace, translations, true, true)

      // Auto-register the locale's metadata entry if it doesn't exist yet —
      // mirrors the api-i18n-simple bond and the app-i18n core provider,
      // whose addTranslations() auto-creates an unknown locale rather than
      // leaving it unregistered. Without this, a locale populated ONLY via
      // addTranslations() (no `locales` config entry, no addLocale() call)
      // never satisfies setLocale()'s "is this locale registered?" check,
      // and getLocales() silently omits it too.
      let existing = localeConfigs.get(locale)
      if (!existing) {
        existing = { code: locale, name: locale, translations: {} }
        localeConfigs.set(locale, existing)
        registerSupportedLng(locale)
      }
      existing.translations = {
        ...existing.translations,
        ...translations,
      }

      // Notify listeners when translations are added for the active locale
      // so that UI components re-render with the new content.
      if (locale === i18n.language) {
        listeners.forEach((listener) => listener(locale))
      }
    },

    t(
      key: string,
      values?: InterpolationValues,
      options?: { defaultValue?: string; count?: number },
    ): string {
      const opts: Record<string, unknown> = { ...values }
      if (options?.defaultValue !== undefined) opts.defaultValue = options.defaultValue
      if (options?.count !== undefined) opts.count = options.count
      return i18n.t(key, opts)
    },

    exists(key: string): boolean {
      return i18n.exists(key)
    },

    formatNumber(value: number, options?: NumberFormatOptions): string {
      const locale = i18n.language
      return new Intl.NumberFormat(locale, options as Intl.NumberFormatOptions).format(value)
    },

    formatDate(value: Date | number | string, options?: DateFormatOptions): string {
      const locale = i18n.language
      const date = value instanceof Date ? value : new Date(value)

      // Handle invalid dates gracefully
      if (isNaN(date.getTime())) {
        return i18n.t('i18n.date.invalidDate', { defaultValue: 'Invalid Date' })
      }

      if (options?.relative) {
        return provider.formatRelativeTime(date)
      }

      return new Intl.DateTimeFormat(locale, {
        dateStyle: options?.dateStyle,
        timeStyle: options?.timeStyle,
      } as Intl.DateTimeFormatOptions).format(date)
    },

    formatRelativeTime(
      value: Date | number,
      options?: { unit?: Intl.RelativeTimeFormatUnit },
    ): string {
      const locale = i18n.language
      const date = value instanceof Date ? value : new Date(value)
      const now = Date.now()
      const diff = date.getTime() - now

      // An explicit unit means "express the difference IN that unit" — convert
      // the millisecond diff before formatting. Previously the raw seconds
      // count was labeled with the unit ("7,200 hours ago" for 2 hours).
      if (options?.unit) {
        const unitMs = UNIT_MS[options.unit.replace(/s$/, '')] ?? 1000
        return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
          Math.round(diff / unitMs),
          options.unit,
        )
      }

      const absDiff = Math.abs(diff)
      // Declared without initializers: the if/else chain below is exhaustive (its final
      // `else` always assigns), so any seed value here is dead code.
      let unit: Intl.RelativeTimeFormatUnit
      let unitValue: number

      if (absDiff < 60000) {
        unit = 'second'
        unitValue = Math.round(diff / 1000)
      } else if (absDiff < 3600000) {
        unit = 'minute'
        unitValue = Math.round(diff / 60000)
      } else if (absDiff < 86400000) {
        unit = 'hour'
        unitValue = Math.round(diff / 3600000)
      } else if (absDiff < 2592000000) {
        unit = 'day'
        unitValue = Math.round(diff / 86400000)
      } else if (absDiff < 31536000000) {
        unit = 'month'
        unitValue = Math.round(diff / 2592000000)
      } else {
        unit = 'year'
        unitValue = Math.round(diff / 31536000000)
      }

      return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
        Math.round(unitValue),
        unit,
      )
    },

    formatList(
      values: string[],
      options?: { type?: 'conjunction' | 'disjunction' | 'unit' },
    ): string {
      const locale = i18n.language
      return new Intl.ListFormat(locale, { type: options?.type || 'conjunction' }).format(values)
    },

    onLocaleChange(listener: (locale: string) => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    getDirection(): 'ltr' | 'rtl' {
      const locale = i18n.language
      const config = localeConfigs.get(locale)
      // An explicit LocaleConfig.direction wins; otherwise ask i18next, which
      // knows the RTL language set — a hardcoded 'ltr' fallback rendered Arabic/
      // Hebrew/Farsi/Urdu left-to-right whenever `direction` wasn't declared.
      return config?.direction || i18n.dir(locale)
    },

    registerContent(module: string, loader: (locale: string) => Promise<void>): void {
      if (contentLoaders.has(module)) return
      contentLoaders.set(module, loader)
      logger.debug('Registered content module', module)
    },
  }

  return provider
}

/**
 * Default provider instance.
 */
export const provider = createI18nextProvider()
