import type { SolidTranslations } from './types.js'

/** Solid translations for Gujarati. */
export const gu: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider એ કોન્ફિગર કરેલ MoleculeProvider ની અંદર વાપરવું આવશ્યક છે સ્ટેટ',
  'solid.error.authOutsideProvider':
    'getAuthClient એ કોન્ફિગર કરેલ MoleculeProvider ની અંદર વાપરવું આવશ્યક છે ઓથ',
  'solid.error.themeOutsideProvider':
    'getThemeProvider એ કોન્ફિગર કરેલ MoleculeProvider ની અંદર વાપરવું આવશ્યક છે થીમ',
  'solid.error.routerOutsideProvider':
    'getRouter એ કોન્ફિગર કરેલ MoleculeProvider ની અંદર વાપરવું આવશ્યક છે રાઉટર',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider એ કોન્ફિગર કરેલ MoleculeProvider ની અંદર વાપરવું આવશ્યક છે i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient એ કોન્ફિગર કરેલ MoleculeProvider ની અંદર વાપરવું આવશ્યક છે HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider એ કોન્ફિગર કરેલ MoleculeProvider ની અંદર વાપરવું આવશ્યક છે સ્ટોરેજ',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider એ કોન્ફિગર કરેલ MoleculeProvider ની અંદર વાપરવું આવશ્યક છે લોગર',
  'solid.error.useAccordionOutsideProvider': 'Accordion ઘટકો Accordion ની અંદર વાપરવા આવશ્યક છે',
  'solid.error.useToastOutsideProvider': 'useToast ToastProvider ની અંદર વાપરવું આવશ્યક છે',
  'solid.error.useChatOutsideProvider': 'useChatProvider એ ChatProvider ની અંદર વાપરવું આવશ્યક છે',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider નો ઉપયોગ WorkspaceProvider ની અંદર થવો જોઈએ.',
  'solid.error.useEditorOutsideProvider': 'useEditorProvider નો ઉપયોગ EditorProvider માં થવો જોઈએ.',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider નો ઉપયોગ PreviewProvider ની અંદર જ થવો જોઈએ.',
  'solid.error.useAuthOutsideProvider': 'useAuthClient નો ઉપયોગ AuthProvider માં થવો જોઈએ.',
  'solid.error.useHttpOutsideProvider': 'useHttpClient નો ઉપયોગ HttpProvider માં થવો જોઈએ.',
  'solid.error.unsupportedMethod': 'અસમર્થિત પદ્ધતિ: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'useLoggerProvider નો ઉપયોગ LoggerProvider ની અંદર જ થવો જોઈએ.',
  'solid.error.oauthFailed': 'OAuth લૉગિન નિષ્ફળ થયું',
  'solid.error.useRouterOutsideProvider':
    'અહીં કોઈ રાઉટર નથી. રાઉટરના `root` તરીકે રૂટીંગ બોન્ડ (`@molecule/app-routing-solid-router`) માંથી `MoleculeRouterProvider` ઉપયોગ કરો, અથવા `router` ને `MoleculeProvider` માં પાસ કરો. જો એપ્લિકેશન પહેલાથી જ આ કરે છે, તો તેનું રૂટીંગ બોન્ડ આ બાઈન્ડિંગ કરતા જૂનું છે: તેને અપડેટ કરો (`npm install @molecule/app-routing-solid-router@latest`).',
  'solid.error.noRoutedView':
    'અહીં કોઈ રૂટેડ વ્યૂ નથી. સોલિડ રાઉટર રૂટના ઘટકને તેનો નેસ્ટેડ રૂટ `props.children` તરીકે આપે છે: આનો ઉપયોગ રૂટના `component` તરીકે કરો, અથવા પેજને બાળકો તરીકે પાસ કરો.',
  'solid.error.useStoreOutsideProvider':
    'useStateProvider નો ઉપયોગ StateProvider ની અંદર જ થવો જોઈએ.',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider નો ઉપયોગ StorageProvider ની અંદર જ થવો જોઈએ.',
  'solid.error.useThemeOutsideProvider':
    'useThemeProvider નો ઉપયોગ ThemeProvider ની અંદર જ થવો જોઈએ.',
}
