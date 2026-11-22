import type { SolidTranslations } from './types.js'

/** Solid translations for ha. */
export const ha: Partial<SolidTranslations> = {
  'solid.error.stateOutsideProvider':
    'getStateProvider dole ne a yi amfani da shi a cikin MoleculeProvider tare da yanayin da aka saita',
  'solid.error.authOutsideProvider':
    'getAuthClient dole ne a yi amfani da shi a cikin MoleculeProvider tare da tantancewar da aka saita',
  'solid.error.themeOutsideProvider':
    'getThemeProvider dole ne a yi amfani da shi a cikin MoleculeProvider tare da jigon da aka saita',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider dole ne a yi amfani da shi a cikin MoleculeProvider tare da i18n da aka saita',
  'solid.error.httpOutsideProvider':
    'getHttpClient dole ne a yi amfani da shi a cikin MoleculeProvider tare da HTTP da aka saita',
  'solid.error.storageOutsideProvider':
    'getStorageProvider dole ne a yi amfani da shi a cikin MoleculeProvider tare da ajiyar da aka saita',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider dole ne a yi amfani da shi a cikin MoleculeProvider tare da rajistar da aka saita',
  'solid.error.useAccordionOutsideProvider':
    'Abubuwan Accordion dole ne a yi amfani da su a cikin Accordion',
  'solid.error.useToastOutsideProvider':
    'useToast dole ne a yi amfani da shi a cikin ToastProvider',
  'solid.error.routerOutsideProvider':
    "Dole ne a yi amfani da getRouter a cikin MoleculeProvider tare da na'urar sadarwa da aka saita",
  'solid.error.useChatOutsideProvider':
    'Dole ne a yi amfani da useChatProvider a cikin ChatProvider',
  'solid.error.useWorkspaceOutsideProvider':
    'Dole ne a yi amfani da mai samar da amfani da wurin aiki a cikin mai samar da wurin aiki',
  'solid.error.useEditorOutsideProvider':
    'Dole ne a yi amfani da useEditorProvider a cikin Mai Ba da Edita',
  'solid.error.usePreviewOutsideProvider':
    'Dole ne a yi amfani da usePreviewProvider a cikin PreviewProvider',
  'solid.error.useAuthOutsideProvider':
    'Dole ne a yi amfani da useAuthClient a cikin Mai Ba da Izini',
  'solid.error.useHttpOutsideProvider':
    'Dole ne a yi amfani da userHttpClient a cikin HttpProvider',
  'solid.error.unsupportedMethod': 'Hanyar da ba ta da tallafi: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'Dole ne a yi amfani da useLoggerProvider a cikin Mai Ba da Lambobin Sadarwa',
  'solid.error.oauthFailed': 'Shiga OAuth ya gaza',
  'solid.error.useRouterOutsideProvider':
    "Babu na'urar sadarwa a nan. Yi amfani da `MoleculeRouterProvider` daga haɗin hanyar sadarwa (`@molecule/app-routing-solid-router`) a matsayin `root` ' na na'urar sadarwa, ko kuma wuce `router` zuwa `MoleculeProvider`. Idan manhajar ta riga ta yi haka, haɗin hanyar sadarwa ta girmi wannan haɗin: sabunta shi (`npm install @molecule/app-routing-solid-router@latest`).",
  'solid.error.noRoutedView':
    "Babu wani ra'ayi da aka yi amfani da shi a nan. Solid Router yana ba wa ɓangaren hanyar hanyar hanyar da aka haɗa a matsayin `props.children`: yi amfani da wannan a matsayin `component` na hanya, ko kuma wuce shafin a matsayin yara.",
  'solid.error.useStoreOutsideProvider':
    'Dole ne a yi amfani da useStateProvider a cikin Mai Ba da Lamuni na Jiha',
  'solid.error.useStorageOutsideProvider':
    'Dole ne a yi amfani da useStorageProvider a cikin StorageProvider',
  'solid.error.useThemeOutsideProvider':
    'Dole ne a yi amfani da useThemeProvider a cikin ThemeProvider',
}
