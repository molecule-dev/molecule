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
    "ဤနေရာတွင် router မရှိပါ။ Angular's `provideRouter(routes)` ပြီးနောက် routing bond (`@molecule/app-routing-angular-router`) မှ `provideMoleculeRouter()` app's providers များထဲသို့ ပေါင်းထည့်ပါ သို့မဟုတ် `router` ကို `provideMolecule` သို့ ပေးပို့ပါ။ app သည် ဤသို့လုပ်ဆောင်ပြီးပါက ၎င်း၏ routing bond သည် ဤ binding ထက် ပိုဟောင်းသည်- ၎င်းကို update လုပ်ပါ (`npm install @molecule/app-routing-angular-router@latest`)။",
  'angular.error.noRoutedView':
    'ဒီ routing bond မှာ render လုပ်ဖို့အတွက် routed view မရှိပါဘူး- စာမျက်နှာကို children အနေနဲ့ pass လုပ်ပါ။ app က `@molecule/app-routing-angular-router` နဲ့ route လုပ်ရင်၊ အဲဒီ bond က ဒီ binding ထက် ပိုဟောင်းနေရင်- update လုပ်ပါ။ (`npm install @molecule/app-routing-angular-router@latest`)။',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider ကို StorageProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider ကို ThemeProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider ကို WorkspaceProvider အတွင်းတွင် အသုံးပြုရပါမည်',
}
