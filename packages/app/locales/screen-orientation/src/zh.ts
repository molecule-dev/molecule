import type { ScreenOrientationTranslations } from './types.js'

/** Screen Orientation translations for Chinese. */
export const zh: ScreenOrientationTranslations = {
  'screenOrientation.error.noProvider':
    '`@molecule/app-screen-orientation`：未设置提供程序。请调用`setProvider()`并传入`ScreenOrientationProvider`实现——Molecule 没有提供该提供程序；请在您的原生运行时环境中实现该接口并将其绑定。',
}
