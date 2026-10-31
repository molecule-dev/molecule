/** The unflagged node:sqlite launch range, kept in sync with package.json. */
export const NODE_ENGINE_RANGE = '^22.13.0 || >=23.4.0'

/** Return whether a Node runtime can load node:sqlite without an extra flag. */
export const supportsSqliteRuntime = (version: string): boolean => {
  const match = /^(\d+)\.(\d+)\./.exec(version)
  if (match === null) return false
  const major = Number(match[1])
  const minor = Number(match[2])
  return (major === 22 && minor >= 13) || (major >= 23 && (major > 23 || minor >= 4))
}

/** Fail before importing node:sqlite on a runtime that still requires a flag. */
export const assertSqliteRuntime = (version = process.versions.node): void => {
  if (!supportsSqliteRuntime(version)) {
    throw new Error(
      `@molecule/api-paracrine-file requires Node.js ${NODE_ENGINE_RANGE}; ` +
        `the launching runtime is ${version}.`,
    )
  }
}

assertSqliteRuntime()
