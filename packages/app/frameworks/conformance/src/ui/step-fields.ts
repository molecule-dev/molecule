/**
 * The fields each case and step takes, checked when a case runs.
 *
 * A case is plain data, often built from shared constants and spreads that the
 * type checker does not see as a `UICase` or `HookStep`. A field a step does
 * not take (`{ type: 'locale', code: 'fr' }` where the step takes `locale`) is
 * then never read: the case runs, records, and passes in every framework while
 * testing nothing. So every runner checks each case and step against these
 * tables first and fails the case with the field named.
 *
 * The tables are typed against the step unions themselves ({@link StepFields}),
 * so adding a step type or a field without listing it here is a type error.
 *
 * @module
 */

/** Whether a field must be present. */
export type FieldPresence = 'required' | 'optional'

/** The fields of one object type, each marked required or optional. */
export type FieldsOf<T> = {
  [K in keyof T]-?: undefined extends T[K] ? 'optional' : 'required'
}

/** For a union of steps tagged by `type`: each type's fields (`type` itself excluded). */
export type StepFields<U extends { type: string }> = {
  [T in U['type']]: FieldsOf<Omit<Extract<U, { type: T }>, 'type'>>
}

/**
 * Throws when an object carries a field the table does not list, or lacks a
 * required one.
 *
 * @param value - The case or step.
 * @param fields - Its fields.
 * @param what - How the error names it (`a locale step`, `the case "renders"`).
 */
export function checkFields(
  value: object,
  fields: Readonly<Record<string, FieldPresence>>,
  what: string,
): void {
  const known = Object.keys(fields)
  for (const key of Object.keys(value)) {
    if (!(key in fields))
      throw new Error(
        `conformance: ${what} has no field \`${key}\`; it takes ${known.length ? known.map((k) => `\`${k}\``).join(', ') : 'no fields'}`,
      )
  }
  for (const [key, presence] of Object.entries(fields)) {
    if (presence === 'required' && (value as Record<string, unknown>)[key] === undefined)
      throw new Error(`conformance: ${what} needs \`${key}\``)
  }
}

/**
 * Checks one step of a tagged union against its type's fields.
 *
 * @param step - The step.
 * @param table - Every step type's fields.
 * @param where - Where the step is (`interaction 3 of "renders"`), for the error.
 */
export function checkStepFields<U extends { type: string }>(
  step: U,
  table: StepFields<U>,
  where: string,
): void {
  const fields = (table as Record<string, Record<string, FieldPresence>>)[step.type]
  if (!fields)
    throw new Error(
      `conformance: ${where} has an unknown step type \`${step.type}\`; the types are ${Object.keys(table).join(', ')}`,
    )
  const { type: _type, ...rest } = step
  checkFields(rest, fields, `${where} (a ${step.type} step)`)
}
