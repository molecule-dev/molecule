// `semver` ships no types and its `@types/semver` package is not a dependency
// of this package, so the members this suite uses are declared here with their
// real signatures. Extend this declaration (or add `@types/semver` as a
// devDependency) before calling anything new on the module.
declare module 'semver' {
  interface SemVer {
    /** The major version number. */
    readonly major: number
    /** The minor version number. */
    readonly minor: number
    /** The patch version number. */
    readonly patch: number
    /** The version as a `major.minor.patch` string. */
    readonly version: string
  }

  const semver: {
    /**
     * Whether `version` is included by the semver `range` (e.g. `^1.2.0 || ^2.0.0`) —
     * the same resolution npm applies when checking a pinned version against a range.
     *
     * @param version - A concrete version, e.g. `1.2.0`.
     * @param range - A semver range expression, e.g. `^1.2.0`.
     * @param includePrerelease - `true`, or `{ includePrerelease: true }`, to let
     * prerelease versions satisfy ranges over them. Defaults to `false`.
     * @returns Whether the version is within the range.
     */
    satisfies(
      version: string,
      range: string,
      includePrerelease?: boolean | { includePrerelease?: boolean },
    ): boolean

    /**
     * The lowest version the semver `range` admits.
     *
     * @param range - A semver range expression, e.g. `^1.2.0`.
     * @returns The minimum admitted version, or `null` for a range that admits
     * no version (e.g. an invalid range).
     */
    minVersion(range: string): SemVer | null

    /**
     * Whether `v1` is greater than or equal to `v2`.
     *
     * @param v1 - A version or range expression.
     * @param v2 - A version or range expression.
     * @returns Whether `v1` >= `v2`.
     */
    gte(v1: string | SemVer, v2: string | SemVer): boolean
  }

  export = semver
}
