/** Suppress only node:sqlite's experimental notice at executable boundaries. */
export const suppressSqliteExperimentalWarning = (): void => {
  const original = process.emitWarning
  process.emitWarning = function (warning, ...args) {
    const options = args[0]
    const name =
      typeof warning === 'object' && warning !== null
        ? warning.name
        : typeof options === 'string'
          ? options
          : typeof options === 'object' && options !== null
            ? options.type
            : undefined
    const text = typeof warning === 'string' ? warning : warning.message
    if (name === 'ExperimentalWarning' && /(?:node:sqlite|\bSQLite\b)/.test(text)) return
    return Reflect.apply(original, this, [warning, ...args])
  }
}
