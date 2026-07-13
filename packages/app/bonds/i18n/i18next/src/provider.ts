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
      listeners.forEach((listener) => listener(lng))
    })

    initialized = true

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

      // Update local config
      const existing = localeConfigs.get(locale)
      if (existing) {
        existing.translations = {
          ...existing.translations,
          ...translations,
        }
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
