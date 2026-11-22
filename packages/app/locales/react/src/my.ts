import type { ReactTranslations } from './types.js'

/** React translations for Burmese. */
export const my: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Accordion အစိတ်အပိုင်းများကို Accordion အတွင်းတွင် အသုံးပြုရပါမည်',
  'react.error.useAuthOutsideProvider': 'useAuthClient ကို AuthProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'react.error.useChatOutsideProvider':
    'useChatProvider ကို ChatProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider ကို EditorProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'react.error.useHttpOutsideProvider': 'useHttpClient ကို HttpProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider ကို LoggerProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider ကို PreviewProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'react.error.useRouterOutsideProvider':
    "ဤနေရာတွင် router မရှိပါ။ app's routing bond (`BrowserRouter` from `@molecule/app-routing-react-router`) မှ router component တစ်ခုကို mount လုပ်ပါ။ သို့မဟုတ် `router` `MoleculeProvider` သို့ ပေးပို့ပါ။ app သည် ဤသို့လုပ်ဆောင်ပြီးပါက ၎င်း၏ routing bond သည် ဤ binding ထက် ပိုဟောင်းနေပါက ၎င်းကို update လုပ်ပါ။ (`npm install @molecule/app-routing-react-router@latest`)။",
  'react.error.noRoutedView':
    'ဒီ routing bond မှာ render လုပ်ဖို့အတွက် routed view မရှိပါဘူး- စာမျက်နှာကို children အနေနဲ့ pass လုပ်ပါ။ app က `@molecule/app-routing-react-router` နဲ့ route လုပ်ရင်၊ အဲဒီ bond က ဒီ binding ထက် ပိုဟောင်းနေရင် update လုပ်ပါ။ (`npm install @molecule/app-routing-react-router@latest`)။',
  'react.error.useStoreOutsideProvider':
    'useStateProvider ကို StateProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider ကို StorageProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'react.error.useThemeOutsideProvider':
    'useThemeProvider ကို ThemeProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'react.error.useToastOutsideProvider': 'useToast ကို ToastProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider ကို WorkspaceProvider အတွင်းတွင် အသုံးပြုရပါမည်',
  'react.error.unsupportedMethod': 'ပံ့ပိုးမထားသော နည်းလမ်း: {{method}}',
  'react.error.oauthFailed': 'OAuth ဖြင့် အကောင့်ဝင်ခြင်း မအောင်မြင်ပါ',
}
