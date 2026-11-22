import type { VueTranslations } from './types.js'

/** Vue translations for Tamil. */
export const ta: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'இங்கே ரௌட்டர் இல்லை. ரௌட்டிங் பாண்டிலிருந்து (`@molecule/app-routing-vue-router`) வரும் `MoleculeRouterProvider` இல் செயலியை இணைக்கவும், அல்லது `moleculePlugin` க்கு `router` அனுப்பவும். செயலி ஏற்கனவே இதைச் செய்தால், அதன் ரௌட்டிங் பாண்ட் இந்த பைண்டிங்கை விடப் பழமையானது: அதை அப்டேட் செய்யவும் (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'இந்த ரூட்டிங் பாண்டில் இங்கே ரெண்டர் செய்வதற்கு ரூட் செய்யப்பட்ட வியூ எதுவும் இல்லை: அதற்குப் பதிலாக, பக்கத்தை சில்ட்ரன்களாக அனுப்பவும். செயலியானது `@molecule/app-routing-vue-router` மூலம் ரூட் செய்தால், அந்த பாண்ட் இந்த பைண்டிங்கை விடப் பழமையானது: அதை அப்டேட் செய்யவும் (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider':
    'useStateProvider ஒரு StateProvider க்குள் பயன்படுத்தப்பட வேண்டும்',
  'vue.error.useThemeOutsideProvider':
    'useThemeProvider ஒரு ThemeProvider க்குள் பயன்படுத்தப்பட வேண்டும்',
  'vue.error.useAuthOutsideProvider':
    'useAuthClient ஒரு AuthProvider க்குள் பயன்படுத்தப்பட வேண்டும்',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider ஒரு StorageProvider க்குள் பயன்படுத்தப்பட வேண்டும்',
  'vue.error.useHttpOutsideProvider':
    'useHttpClient ஒரு HttpProvider க்குள் பயன்படுத்தப்பட வேண்டும்',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider ஒரு LoggerProvider க்குள் பயன்படுத்தப்பட வேண்டும்',
  'vue.error.useToastOutsideProvider': 'useToast ஒரு ToastProvider க்குள் பயன்படுத்தப்பட வேண்டும்',
  'vue.error.unsupportedMethod': 'ஆதரிக்கப்படாத முறை: {{method}}',
  'vue.error.useChatOutsideProvider':
    'useChatProvider ஒரு ChatProvider க்குள் பயன்படுத்தப்பட வேண்டும்',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider ஆனது ஒரு EditorProvider-க்குள் பயன்படுத்தப்பட வேண்டும்.',
  'vue.error.oauthFailed': 'OAuth உள்நுழைவு தோல்வியடைந்தது',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider ஆனது ஒரு PreviewProvider-க்குள் பயன்படுத்தப்பட வேண்டும்.',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider ஆனது ஒரு WorkspaceProvider-க்குள் பயன்படுத்தப்பட வேண்டும்.',
}
