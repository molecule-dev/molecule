import type { VueTranslations } from './types.js'

/** Vue translations for Mongolian. */
export const mn: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Энд чиглүүлэгч байхгүй байна. Аппликейшнийг чиглүүлэлтийн холбоосоос (`@molecule/app-routing-vue-router`) `MoleculeRouterProvider` руу ороох эсвэл `router` `moleculePlugin` руу дамжуулна уу. Хэрэв аппликейшн үүнийг аль хэдийн хийсэн бол түүний чиглүүлэлтийн холбоос нь энэ холболтоос хуучин байна: үүнийг шинэчилнэ үү (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Энэ чиглүүлэлтийн холбоос нь энд үзүүлэх чиглүүлэлтийн харагдацгүй байна: хуудсыг хүүхдийн хэлбэрээр дамжуулна уу. Хэрэв апп нь `@molecule/app-routing-vue-router` ээр чиглүүлж байвал уг холбоос нь энэ холболтоос хуучин байна: үүнийг шинэчлэх (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider-г StateProvider дотор ашиглах ёстой',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider-г ThemeProvider дотор ашиглах ёстой',
  'vue.error.useAuthOutsideProvider': 'useAuthClient-г AuthProvider дотор ашиглах ёстой',
  'vue.error.useStorageOutsideProvider': 'useStorageProvider-г StorageProvider дотор ашиглах ёстой',
  'vue.error.useHttpOutsideProvider': 'useHttpClient-г HttpProvider дотор ашиглах ёстой',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider-г LoggerProvider дотор ашиглах ёстой',
  'vue.error.useToastOutsideProvider': 'useToast-г ToastProvider дотор ашиглах ёстой',
  'vue.error.unsupportedMethod': 'Дэмжигдэхгүй арга: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider-ийг ChatProvider дотор ашиглах ёстой',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider нь EditorProvider дотор ашиглагдах ёстой',
  'vue.error.oauthFailed': 'OAuth нэвтрэх ажиллагаа амжилтгүй боллоо',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider нь PreviewProvider дотор ашиглагдах ёстой',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider нь WorkspaceProvider дотор ашиглагдах ёстой',
}
