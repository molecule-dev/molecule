import type { SolidTranslations } from './types.js'

/** Solid translations for Chinese (Traditional). */
export const zhTW: SolidTranslations = {
  'solid.error.stateOutsideProvider': 'getStateProvider 必須在配置了狀態的 MoleculeProvider 內使用',
  'solid.error.authOutsideProvider': 'getAuthClient 必須在配置了驗證的 MoleculeProvider 內使用',
  'solid.error.themeOutsideProvider': 'getThemeProvider 必須在配置了主題的 MoleculeProvider 內使用',
  'solid.error.routerOutsideProvider': 'getRouter 必須在配置了路由器的 MoleculeProvider 內使用',
  'solid.error.i18nOutsideProvider': 'getI18nProvider 必須在配置了i18n的 MoleculeProvider 內使用',
  'solid.error.httpOutsideProvider': 'getHttpClient 必須在配置了HTTP的 MoleculeProvider 內使用',
  'solid.error.storageOutsideProvider':
    'getStorageProvider 必須在配置了儲存的 MoleculeProvider 內使用',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider 必須在配置了日誌的 MoleculeProvider 內使用',
  'solid.error.useAccordionOutsideProvider': 'Accordion 元件必須在 Accordion 內使用',
  'solid.error.useToastOutsideProvider': 'useToast 必須在 ToastProvider 內使用',
}
