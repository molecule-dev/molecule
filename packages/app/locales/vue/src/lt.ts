import type { VueTranslations } from './types.js'

/** Vue translations for Lithuanian. */
export const lt: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Čia nėra maršrutizatoriaus. Apvyniokite programėlę `MoleculeRouterProvider` atributu iš maršrutizavimo jungties (`@molecule/app-routing-vue-router`) arba perduokite `router` atributą `moleculePlugin`. Jei programėlė jau tai daro, jos maršrutizavimo jungtis yra senesnė nei šis susiejimas: atnaujinkite jį (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Šis maršruto sujungimas neturi nukreipto rodinio, kurį būtų galima čia pateikti: verčiau perduokite puslapį kaip antrinį puslapį. Jei programa maršrutizuoja su `@molecule/app-routing-vue-router`, tas sujungimas yra senesnis nei šis sujungimas: atnaujinkite jį (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider':
    'useStateProvider turi b\u016bti naudojamas StateProvider viduje',
  'vue.error.useThemeOutsideProvider':
    'useThemeProvider turi b\u016bti naudojamas ThemeProvider viduje',
  'vue.error.useAuthOutsideProvider': 'useAuthClient turi b\u016bti naudojamas AuthProvider viduje',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider turi b\u016bti naudojamas StorageProvider viduje',
  'vue.error.useHttpOutsideProvider': 'useHttpClient turi b\u016bti naudojamas HttpProvider viduje',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider turi b\u016bti naudojamas LoggerProvider viduje',
  'vue.error.useToastOutsideProvider': 'useToast turi b\u016bti naudojamas ToastProvider viduje',
  'vue.error.unsupportedMethod': 'Nepalaikomas metodas: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider turi būti naudojamas ChatProvider viduje',
  'vue.error.useEditorOutsideProvider':
    '„EditorProvider“ parametras turi būti naudojamas „useEditorProvider“ parametro viduje.',
  'vue.error.oauthFailed': 'OAuth prisijungimas nepavyko',
  'vue.error.usePreviewOutsideProvider':
    '„usePreviewProvider“ turi būti naudojamas „PreviewProvider“ viduje.',
  'vue.error.useWorkspaceOutsideProvider':
    '„useWorkspaceProvider“ turi būti naudojamas „WorkspaceProvider“ viduje.',
}
