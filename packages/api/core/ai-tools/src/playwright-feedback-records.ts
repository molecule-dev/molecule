/**
 * Test-id records the feedback engine hands back to Playwright's `--last-failed`.
 *
 * A serial group (`test.describe.serial`, `describe.configure({ mode: 'serial' })`) runs its
 * tests in order on shared state, and Playwright re-runs it whole on a retry. `--last-failed`
 * does not: it runs exactly the tests a record names, so a record naming a later test of a group
 * runs that test without the ones it depends on, and it fails on code that works. Every record
 * built here therefore names whole serial groups.
 *
 * @module
 */

/**
 * The ids, with every serial group any of them belongs to.
 * @param ids - Test ids (`TestCase.id`).
 * @param groups - Serial groups by test id, from the runs that selected them.
 * @returns Distinct ids in input order, a group's tests together where its first member appeared.
 */
export function withSerialGroups(ids: readonly string[], groups: readonly string[][]): string[] {
  const out = new Set<string>()
  for (const id of ids) {
    const group = groups.find((members) => members.includes(id))
    for (const member of group ?? [id]) out.add(member)
  }
  return [...out]
}

/**
 * Serial groups known for one file, with a run's groups added. A run that selected part of a
 * group saw only that part, so overlapping groups join instead of replacing each other.
 * @param known - The groups already known for the file.
 * @param seen - The groups one run reported.
 * @returns Disjoint groups covering both.
 */
export function joinSerialGroups(
  known: readonly string[][],
  seen: readonly string[][],
): string[][] {
  let groups = known.map((group) => [...group])
  for (const group of seen) {
    const overlapping = groups.filter((members) => members.some((id) => group.includes(id)))
    const joined = new Set<string>([...overlapping.flat(), ...group])
    groups = [...groups.filter((members) => !overlapping.includes(members)), [...joined]]
  }
  return groups.filter((group) => group.length > 1)
}
