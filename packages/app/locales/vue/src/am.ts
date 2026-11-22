import type { VueTranslations } from './types.js'

/** Vue translations for Amharic. */
export const am: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'እዚህ ራውተር የለም። መተግበሪያውን ከራውቲንግ ቦንድ (`@molecule/app-routing-vue-router`) በ `MoleculeRouterProvider` ይጠቅልሉት ወይም `router` እስከ `moleculePlugin` ያልፉ። መተግበሪያው ይህን ካደረገ፣ የማዞሪያ ቦንዱ ከዚህ ማሰሪያ የቆየ ነው፡ ያዘምኑት (`npm install @molecule/app-routing-vue-router@latest`)።',
  'vue.error.noRoutedView':
    'ይህ የማዞሪያ ቦንድ እዚህ ለማሳየት ምንም የተዘዋወረ እይታ የለውም፡ ገጹን እንደ ልጆች ይለፉ። መተግበሪያው `@molecule/app-routing-vue-router` ን የሚያገናኝ ከሆነ፣ ያ ቦንድ ከዚህ ማሰሪያ የቆየ ነው፡ ያዘምኑት (`npm install @molecule/app-routing-vue-router@latest`)።',
  'vue.error.useStoreOutsideProvider': 'useStateProvider በ StateProvider ውስጥ ጥቅም ላይ መዋል አለበት',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider በ ThemeProvider ውስጥ ጥቅም ላይ መዋል አለበት',
  'vue.error.useAuthOutsideProvider': 'useAuthClient በ AuthProvider ውስጥ ጥቅም ላይ መዋል አለበት',
  'vue.error.useStorageOutsideProvider': 'useStorageProvider በ StorageProvider ውስጥ ጥቅም ላይ መዋል አለበት',
  'vue.error.useHttpOutsideProvider': 'useHttpClient በ HttpProvider ውስጥ ጥቅም ላይ መዋል አለበት',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider በ LoggerProvider ውስጥ ጥቅም ላይ መዋል አለበት',
  'vue.error.useToastOutsideProvider': 'useToast በ ToastProvider ውስጥ ጥቅም ላይ መዋል አለበት',
  'vue.error.unsupportedMethod': 'ያልተደገፈ ዘዴ: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider በChatProvider ውስጥ መጠቀም አለበት',
  'vue.error.useEditorOutsideProvider': 'useEditorProvider በEditorProvider ውስጥ ጥቅም ላይ መዋል አለበት',
  'vue.error.oauthFailed': 'የOAuth መግቢያ አልተሳካም',
  'vue.error.usePreviewOutsideProvider': 'usePreviewProvider በ PreviewProvider ውስጥ ጥቅም ላይ መዋል አለበት',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider በWorkspaceProvider ውስጥ ጥቅም ላይ መዋል አለበት',
}
