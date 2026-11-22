import type { ReactTranslations } from './types.js'

/** React translations for Swahili. */
export const sw: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Vipengele vya Accordion lazima vitumike ndani ya Accordion',
  'react.error.useAuthOutsideProvider': 'useAuthClient lazima utumike ndani ya AuthProvider',
  'react.error.useChatOutsideProvider': 'useChatProvider lazima utumike ndani ya ChatProvider',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider lazima utumike ndani ya EditorProvider',
  'react.error.useHttpOutsideProvider': 'useHttpClient lazima utumike ndani ya HttpProvider',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider lazima utumike ndani ya LoggerProvider',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider lazima utumike ndani ya PreviewProvider',
  'react.error.useRouterOutsideProvider':
    'Hakuna kipanga njia hapa. Pachika sehemu ya kipanga njia kutoka kwa kifungo cha uelekezaji cha programu (`BrowserRouter` kutoka `@molecule/app-routing-react-router`), au pitisha `router` hadi `MoleculeProvider`. Ikiwa programu tayari inafanya hivi, kifungo chake cha uelekezaji ni cha zamani kuliko kifungo hiki: kisasishe (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    'Kifungo hiki cha uelekezaji hakina mwonekano wa kuelekeza hapa: pitisha ukurasa kama watoto badala yake. Ikiwa programu itaelekeza na `@molecule/app-routing-react-router`, kifungo hicho ni cha zamani kuliko kiunganisho hiki: kisasishe (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.useStoreOutsideProvider': 'useStateProvider lazima utumike ndani ya StateProvider',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider lazima utumike ndani ya StorageProvider',
  'react.error.useThemeOutsideProvider': 'useThemeProvider lazima utumike ndani ya ThemeProvider',
  'react.error.useToastOutsideProvider': 'useToast lazima utumike ndani ya ToastProvider',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider lazima utumike ndani ya WorkspaceProvider',
  'react.error.unsupportedMethod': 'Njia isiyoungwa mkono: {{method}}',
  'react.error.oauthFailed': 'Kuingia kwa OAuth kumeshindwa',
}
