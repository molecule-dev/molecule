// `semver` ships no types and its `@types/semver` package is not a dependency
// of this package, so the members this suite uses are declared here with their
// real signatures. Extend this declaration (or add `@types/semver` as a
// devDependency) before calling anything new on the module.
declare module 'semver' {
  const semver: {
    /**
     * Whether `version` is included by the semver `range` (e.g. `^1.2.0 || ^2.0.0`) —
     * the same resolution npm applies when checking a pinned version against a range.
     *
     * @param version - A concrete version, e.g. `4.3.3`.
     * @param range - A semver range expression, e.g. `^4.0.0 || ^5.0.0`.
     * @param includePrerelease - `true`, or `{ includePrerelease: true }`, to let
     * prerelease versions satisfy ranges over them. Defaults to `false`.
     * @returns Whether the version is within the range.
     */
    satisfies(
      version: string,
      range: string,
      includePrerelease?: boolean | { includePrerelease?: boolean },
    ): boolean
  }

  export = semver
}
