/**
 * Drop-in parity with `@playwright/test`: the types every spec imports, and
 * the helpers a `playwright.config.ts` or an API-only spec reaches for.
 * `test` and `expect` come from `./test.js` and `./expect.js` instead.
 *
 * @module
 */

export type {
  APIRequestContext,
  APIResponse,
  Browser,
  BrowserContext,
  BrowserType,
  ConsoleMessage,
  Dialog,
  Download,
  ElementHandle,
  Expect,
  FileChooser,
  Fixtures,
  Frame,
  FrameLocator,
  FullConfig,
  FullProject,
  JSHandle,
  Keyboard,
  Locator,
  Mouse,
  Page,
  PlaywrightTestArgs,
  PlaywrightTestConfig,
  PlaywrightTestOptions,
  PlaywrightTestProject,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
  Request,
  Response,
  Route,
  TestFixture,
  TestInfo,
  TestType,
  Touchscreen,
  WorkerFixture,
} from '@playwright/test'
export { chromium, defineConfig, devices, firefox, request, webkit } from '@playwright/test'
