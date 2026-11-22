import type { VueTranslations } from './types.js'

/** Vue translations for Burmese. */
export const my: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'ဤနေရာတွင် router မရှိပါ။ routing bond (`@molecule/app-routing-vue-router`) မှ `MoleculeRouterProvider` ဖြင့် app ကိုထုပ်ပိုးပါ သို့မဟုတ် `router` `moleculePlugin` သို့ပေးပို့ပါ။',
  'vue.error.noRoutedView':
    'ဤ routing bond တွင် ဤနေရာတွင် render လုပ်ရန် routed view မရှိပါ။ ယင်းအစား စာမျက်နှာကို children အဖြစ် pass လုပ်ပါ။',
  'vue.error.useStoreOutsideProvider': 'useStateProvider ကို StateProvider အတွင်းတွင် အသုံးပြုရမည်',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider ကို ThemeProvider အတွင်းတွင် အသုံးပြုရမည်',
  'vue.error.useAuthOutsideProvider': 'useAuthClient ကို AuthProvider အတွင်းတွင် အသုံးပြုရမည်',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider ကို StorageProvider အတွင်းတွင် အသုံးပြုရမည်',
  'vue.error.useHttpOutsideProvider': 'useHttpClient ကို HttpProvider အတွင်းတွင် အသုံးပြုရမည်',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider ကို LoggerProvider အတွင်းတွင် အသုံးပြုရမည်',
  'vue.error.useToastOutsideProvider': 'useToast ကို ToastProvider အတွင်းတွင် အသုံးပြုရမည်',
  'vue.error.unsupportedMethod': 'ပံ့ပိုးမထားသော နည်းလမ်း: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider ကို ChatProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider ကို EditorProvider အတွင်းတွင် အသုံးပြုရမည်',
  'vue.error.oauthFailed': 'OAuth အကောင့်ဝင်ခြင်း မအောင်မြင်ပါ',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider ကို PreviewProvider အတွင်းတွင် အသုံးပြုရမည်',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider ကို WorkspaceProvider အတွင်းတွင် အသုံးပြုရမည်',
}
