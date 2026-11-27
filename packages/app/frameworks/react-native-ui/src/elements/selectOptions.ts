import type { SelectFieldOption, SelectFieldProps } from '@molecule/app-ui'

/** An option's identity and its positions in the select and in the virtualized list. */
export interface SelectChoice {
  key: string
  option: SelectFieldOption
  index: number
  listIndex: number
  grouped: boolean
  uniqueValue: boolean
}

/** The list interleaves option rows and noninteractive group headings. */
export type SelectRow = SelectChoice | { key: string; heading: string }

/** Builds ordered rows. Equal values in separate options keep separate identities. */
export function selectRows(items: SelectFieldProps['options']): {
  rows: readonly SelectRow[]
  choices: readonly SelectChoice[]
} {
  const rows: SelectRow[] = []
  const choices: SelectChoice[] = []
  const occurrences = new Map<string, number>()
  const counts = new Map<string, number>()
  const keyOf = (parts: readonly string[]): string => {
    const identity = JSON.stringify(parts)
    const occurrence = occurrences.get(identity) ?? 0
    occurrences.set(identity, occurrence + 1)
    return `${identity}:${occurrence}`
  }
  const add = (option: SelectFieldOption, group?: string): void => {
    const choice = {
      key: keyOf(['option', group ?? '', option.value, option.label]),
      option,
      index: choices.length,
      listIndex: rows.length,
      grouped: group !== undefined,
      uniqueValue: false,
    }
    counts.set(option.value, (counts.get(option.value) ?? 0) + 1)
    choices.push(choice)
    rows.push(choice)
  }
  for (const item of items) {
    if ('options' in item) {
      const key = keyOf(['group', item.label])
      rows.push({ key, heading: item.label })
      for (const option of item.options) add(option, key)
    } else {
      add(item)
    }
  }
  for (const choice of choices) choice.uniqueValue = counts.get(choice.option.value) === 1
  return { rows, choices }
}

/** Resolves a controlled value or a mount/reset default as a browser select does. */
export function choicesForValue(
  choices: readonly SelectChoice[],
  multiple: boolean,
  value: SelectFieldProps['value'],
): readonly SelectChoice[] {
  if (multiple) {
    const values = new Set(typeof value === 'string' ? [value] : value)
    return choices.filter((choice) => values.has(choice.option.value))
  }
  const first =
    choices.find((choice) => choice.option.value === value) ??
    choices.find((choice) => !choice.option.disabled)
  return first ? [first] : []
}

/** Reconciles held choices with the current list. A unique value can be relabeled in place. */
export function reconcileChoices(
  choices: readonly SelectChoice[],
  previous: readonly SelectChoice[],
  multiple: boolean,
): readonly SelectChoice[] {
  const keys = new Set(previous.map(({ key }) => key))
  const unique = new Set(
    previous.filter((choice) => choice.uniqueValue).map((choice) => choice.option.value),
  )
  const matched = choices.filter(
    (choice) => keys.has(choice.key) || (choice.uniqueValue && unique.has(choice.option.value)),
  )
  if (multiple) return matched
  const first = matched[0] ?? choices.find((choice) => !choice.option.disabled)
  return first ? [first] : []
}
