import type { VueTranslations } from './types.js'

/** Vue translations for Latvian. */
export const lv: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Šeit nav maršrutētāja. Ietiniet lietotni `MoleculeRouterProvider` elementā no maršrutēšanas saites (`@molecule/app-routing-vue-router`) vai nododiet `router` elementu `moleculePlugin` elementam. Ja lietotne to jau dara, tās maršrutēšanas saite ir vecāka par šo saistījumu: atjauniniet to (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Šai maršrutēšanas saitei nav maršrutēta skata, ko šeit renderēt: tā vietā nododiet lapu kā bērnlapas. Ja lietotne maršrutē ar `@molecule/app-routing-vue-router`, šī saite ir vecāka par šo saistīšanu: atjauniniet to (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider j\u0101izmanto StateProvider ietvaros',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider j\u0101izmanto ThemeProvider ietvaros',
  'vue.error.useAuthOutsideProvider': 'useAuthClient j\u0101izmanto AuthProvider ietvaros',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider j\u0101izmanto StorageProvider ietvaros',
  'vue.error.useHttpOutsideProvider': 'useHttpClient j\u0101izmanto HttpProvider ietvaros',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider j\u0101izmanto LoggerProvider ietvaros',
  'vue.error.useToastOutsideProvider': 'useToast j\u0101izmanto ToastProvider ietvaros',
  'vue.error.unsupportedMethod': 'Neatbalst\u012bta metode: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider jāizmanto ChatProvider ietvaros',
  'vue.error.useEditorOutsideProvider': 'useEditorProvider ir jāizmanto EditorProvider ietvaros.',
  'vue.error.oauthFailed': 'OAuth pieteikšanās neizdevās.',
  'vue.error.usePreviewOutsideProvider': 'PreviewProvider ietvaros jāizmanto usePreviewProvider.',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider ir jāizmanto WorkspaceProvider ietvaros.',
}
