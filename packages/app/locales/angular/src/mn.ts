import type { AngularTranslations } from './types.js'

/** Angular translations for Mongolian. */
export const mn: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider-ийг ChatProvider дотор ашиглах ёстой',
  'angular.error.useAuthOutsideProvider': 'useAuthClient нь AuthProvider дотор ашиглагдах ёстой',
  'angular.error.oauthFailed': 'OAuth нэвтрэх ажиллагаа амжилтгүй боллоо',
  'angular.error.unsupportedMethod': 'Дэмжигдээгүй арга: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider нь StateProvider дотор ашиглагдах ёстой',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider-ийг EditorProvider дотор ашиглах ёстой',
  'angular.error.useHttpOutsideProvider': 'useHttpClient-ийг HttpProvider дотор ашиглах ёстой',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider-ийг LoggerProvider дотор ашиглах ёстой',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider-ийг PreviewProvider дотор ашиглах ёстой',
  'angular.error.useRouterOutsideProvider':
    'Энд чиглүүлэгч байхгүй байна. Angular-ийн `provideRouter(routes)` дараа чиглүүлэлтийн холбоосоос (`@molecule/app-routing-angular-router`) `provideMoleculeRouter()` апп-ын үйлчилгээ үзүүлэгчдэд нэмнэ үү эсвэл `router` `provideMolecule`-т дамжуулна уу. Хэрэв апп үүнийг аль хэдийн хийсэн бол түүний чиглүүлэлтийн холбоос нь энэ холболтоос хуучин байна: үүнийг шинэчилнэ үү (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Энэ чиглүүлэлтийн холбоос нь энд үзүүлэх чиглүүлэлтийн харагдацгүй байна: хуудсыг хүүхдийн хэлбэрээр дамжуулна уу. Хэрэв апп нь `@molecule/app-routing-angular-router` ээр чиглүүлж байвал уг холбоос нь энэ холболтоос хуучин байна: үүнийг шинэчлэх (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider-ийг StorageProvider дотор ашиглах ёстой',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider-ийг ThemeProvider дотор ашиглах ёстой',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider-ийг WorkspaceProvider дотор ашиглах ёстой',
}
