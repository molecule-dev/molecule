/**
 * React multi-slot join-code input.
 *
 * Exports:
 * - `<JoinCode>` — N-slot single-character input with auto-advance, paste-to-fill,
 *   alphabet validation, and `onComplete` notification.
 * - `JoinCodeProps`, `JoinCodeAlphabet` — public types.
 *
 * Companion locale bond: `@molecule/app-locales-join-code`.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { post } from '@molecule/app-http'
 * import { JoinCode } from '@molecule/app-join-code-react'
 *
 * export function JoinRoomPage() {
 *   const [code, setCode] = useState('')
 *   async function joinRoom(complete: string): Promise<void> {
 *     await post('/rooms/join', { code: complete })
 *   }
 *   return (
 *     <JoinCode
 *       length={6}
 *       alphabet="alphanumeric"
 *       value={code}
 *       onChange={setCode}
 *       onComplete={(complete) => void joinRoom(complete)}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - It only COLLECTS the code — it never submits, verifies or joins anything. Do the API call in
 *   `onComplete`, which fires once when all `length` slots hold valid characters (again only
 *   after the code is cleared and re-completed). `autoSubmit={false}` suppresses it entirely.
 * - Input is sanitized: characters outside `alphabet` are dropped, and `'letters'` /
 *   `'alphanumeric'` codes are upper-cased — `onChange`/`onComplete` receive `"AB12CD"` even if
 *   the user typed `"ab12cd"`. Compare codes case-insensitively on the server.
 * - Controlled mode (`value`) requires `onChange` to write the value back, or typing is ignored.
 *   Omit `value` (optionally pass `defaultValue`) for uncontrolled use.
 * - It calls `useTranslation()` from `@molecule/app-react`, so it MUST render inside
 *   `<I18nProvider>` / `<MoleculeProvider>`, and `getClassMap()` throws unless
 *   `setClassMap(classMap)` from `@molecule/app-ui` ran at startup. There is no visible label —
 *   only `joinCode.*` aria-labels; render your own heading/help text.
 *
 * @module
 */

export * from './JoinCode.js'
export * from './types.js'
