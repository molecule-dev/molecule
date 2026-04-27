/**
 * Top app-shell header — branded logo + appName on the left, slotted actions on the right.
 *
 * Reproduces the byte-identical Header pattern that appears across 9 flagship apps as a
 * single composable primitive. Pair with `@molecule/app-shell-layout-react`'s
 * `<AppShellLayout>` to assemble a full chrome.
 *
 * @example
 * import { AppHeader } from '@molecule/app-header-react'
 * import { UserMenu } from '@molecule/app-ui-react'
 *
 * <AppHeader appName="Bearing" userMenu={<UserMenu renderPanel={...} />} />
 */
export * from './AppHeader.js'
