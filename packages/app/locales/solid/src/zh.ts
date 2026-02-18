import type { SolidTranslations } from './types.js'

/** Solid translations for Chinese. */
export const zh: SolidTranslations = {
  'solid.error.stateOutsideProvider': 'getStateProvider 必须在配置了状态的 MoleculeProvider 内使用',
  'solid.error.authOutsideProvider': 'getAuthClient 必须在配置了认证的 MoleculeProvider 内使用',
  'solid.error.themeOutsideProvider': 'getThemeProvider 必须在配置了主题的 MoleculeProvider 内使用',
  'solid.error.routerOutsideProvider': 'getRouter 必须在配置了路由器的 MoleculeProvider 内使用',
  'solid.error.i18nOutsideProvider': 'getI18nProvider 必须在配置了i18n的 MoleculeProvider 内使用',
  'solid.error.httpOutsideProvider': 'getHttpClient 必须在配置了HTTP的 MoleculeProvider 内使用',
  'solid.error.storageOutsideProvider':
    'getStorageProvider 必须在配置了存储的 MoleculeProvider 内使用',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider 必须在配置了日志的 MoleculeProvider 内使用',
  'solid.error.useAccordionOutsideProvider': 'Accordion 组件必须在 Accordion 内使用',
  'solid.error.useToastOutsideProvider': 'useToast 必须在 ToastProvider 内使用',
}
