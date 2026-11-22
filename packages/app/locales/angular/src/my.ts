import type { AngularTranslations } from './types.js'

/** Angular translations for Burmese. */
export const my: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'useChatProvider ကို ChatProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'angular.error.useAuthOutsideProvider': 'useAuthClient ကို AuthProvider အတွင်းတွင် အသုံးပြုရမည်',
  'angular.error.oauthFailed': 'OAuth အကောင့်ဝင်ခြင်း မအောင်မြင်ပါ',
  'angular.error.unsupportedMethod': 'ပံ့ပိုးမထားသော နည်းလမ်း- {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider ကို StateProvider အတွင်းတွင် အသုံးပြုရမည်',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider ကို EditorProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'angular.error.useHttpOutsideProvider':
    'useHttpClient ကို HttpProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider ကို LoggerProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider ကို PreviewProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'angular.error.useRouterOutsideProvider':
    "ဤနေရာတွင် router မရှိပါ။ Angular's `provideRouter(routes)` ပြီးနောက် routing bond (`@molecule/app-routing-angular-router`) မှ `provideMoleculeRouter()` app's provider များထဲသို့ ပေါင်းထည့်ပါ သို့မဟုတ် `router` ကို `provideMolecule` သို့ ပေးပို့ပါ။",
  'angular.error.noRoutedView':
    'ဤ routing bond တွင် ဤနေရာတွင် render လုပ်ရန် routed view မရှိပါ။ ယင်းအစား စာမျက်နှာကို children အဖြစ် pass လုပ်ပါ။',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider ကို StorageProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider ကို ThemeProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider ကို WorkspaceProvider အတွင်းတွင် အသုံးပြုရပါမည်',
}
