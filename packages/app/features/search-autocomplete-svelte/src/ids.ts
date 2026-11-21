/**
 * Per-instance ids for the Svelte search-autocomplete component (React's
 * `useId()`): allocated once per component instance, in mount order.
 *
 * @module
 */

/** Counter backing the generated ids. */
let nextGeneratedId = 0

/**
 * The next instance's base id, which the listbox and option ids extend.
 *
 * @returns A stable base id for one component instance.
 */
export const nextSearchAutocompleteId = (): string => `mol-search-autocomplete-${nextGeneratedId++}`
