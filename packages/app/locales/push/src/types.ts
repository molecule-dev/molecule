/** Translation keys for the push locale package. */
export type PushTranslationKey = 'push.error.notSupported' | 'push.error.permissionNotGranted'

/** Translation record mapping push keys to translated strings. */
export type PushTranslations = Record<PushTranslationKey, string>
