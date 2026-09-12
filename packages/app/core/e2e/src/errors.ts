/**
 * Errors the e2e core throws. Every unsupported method names its alternative,
 * so a spec author (human or executor) can recover without guessing.
 *
 * @module
 */

/** A Playwright method this bond does not implement. The message names what to use instead. */
export class E2EUnsupportedError extends Error {
  constructor(method: string, alternative: string, bondName = 'this e2e bond') {
    super(`${method} is not supported by ${bondName}. ${alternative}`)
    this.name = 'E2EUnsupportedError'
  }
}

/** An action, wait or navigation ran out of time. Named like Playwright's for `catch` parity. */
export class E2ETimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

/** A locator matched several elements where an action needs exactly one (Playwright's strict mode). */
export class E2EStrictModeError extends Error {
  constructor(description: string, count: number) {
    super(
      `strict mode violation: ${description} resolved to ${count} elements. Use .first(), .nth(i), .last() or a more specific locator.`,
    )
    this.name = 'E2EStrictModeError'
  }
}
