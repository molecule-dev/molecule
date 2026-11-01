/** Internal conversion of detached error data into a fresh console/readback Error. */

const HTTP_ERROR_BRAND = Symbol.for('@molecule/app-http/HttpError')

/** Build a native reader view without retaining any input object or executable hook. */
export const errorFromSnapshot = (snapshot: unknown): Error => {
  const data = (snapshot && typeof snapshot === 'object' ? snapshot : {}) as Record<string, unknown>
  const error = new Error(typeof data.message === 'string' ? data.message : '')
  for (const [key, value] of Object.entries(data)) {
    Object.defineProperty(error, key, {
      value,
      enumerable: !['name', 'message', 'stack', 'cause', 'errors'].includes(key),
      configurable: true,
      writable: true,
    })
  }
  if (Object.getOwnPropertySymbols(data).includes(HTTP_ERROR_BRAND)) {
    Object.defineProperty(error, HTTP_ERROR_BRAND, { value: true })
  }
  return error
}
