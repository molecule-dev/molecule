import type { ReactTranslations } from './types.js'

/** React translations for Amharic. */
export const am: ReactTranslations = {
  'react.error.useAccordionOutsideProvider': 'የAccordion አካላት በAccordion ውስጥ መጠቀም አለባቸው',
  'react.error.useAuthOutsideProvider': 'useAuthClient በAuthProvider ውስጥ መጠቀም አለበት',
  'react.error.useChatOutsideProvider': 'useChatProvider በChatProvider ውስጥ መጠቀም አለበት',
  'react.error.useEditorOutsideProvider': 'useEditorProvider በEditorProvider ውስጥ መጠቀም አለበት',
  'react.error.useHttpOutsideProvider': 'useHttpClient በHttpProvider ውስጥ መጠቀም አለበት',
  'react.error.useLoggerOutsideProvider': 'useLoggerProvider በLoggerProvider ውስጥ መጠቀም አለበት',
  'react.error.usePreviewOutsideProvider': 'usePreviewProvider በPreviewProvider ውስጥ መጠቀም አለበት',
  'react.error.useRouterOutsideProvider':
    'እዚህ ራውተር የለም። የራውተር አካልን ከመተግበሪያው የማዞሪያ ቦንድ (`BrowserRouter` ከ `@molecule/app-routing-react-router`) ይጫኑ ወይም `router` እስከ `MoleculeProvider` ያልፉ። መተግበሪያው ይህን ካደረገ፣ የማዞሪያ ቦንዱ ከዚህ ማሰሪያ የቆየ ነው፡ ያዘምኑት (`npm install @molecule/app-routing-react-router@latest`)።',
  'react.error.noRoutedView':
    'ይህ የማዞሪያ ቦንድ እዚህ ለማሳየት ምንም የተዘዋወረ እይታ የለውም፡ ገጹን እንደ ልጆች ይለፉ። መተግበሪያው `@molecule/app-routing-react-router` የሚያገናኝ ከሆነ፣ ያ ቦንድ ከዚህ ማሰሪያ የቆየ ነው፡ ያዘምኑት (`npm install @molecule/app-routing-react-router@latest`)።',
  'react.error.useStoreOutsideProvider': 'useStateProvider በStateProvider ውስጥ መጠቀም አለበት',
  'react.error.useStorageOutsideProvider': 'useStorageProvider በStorageProvider ውስጥ መጠቀም አለበት',
  'react.error.useThemeOutsideProvider': 'useThemeProvider በThemeProvider ውስጥ መጠቀም አለበት',
  'react.error.useToastOutsideProvider': 'useToast በToastProvider ውስጥ መጠቀም አለበት',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider በWorkspaceProvider ውስጥ መጠቀም አለበት',
  'react.error.unsupportedMethod': 'ያልተደገፈ ዘዴ: {{method}}',
  'react.error.oauthFailed': 'የOAuth መግቢያ አልተሳካም',
}
