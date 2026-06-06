/**
 * React sort-by picker.
 *
 * Exports `<SortPicker>` — single-select wrapper for "Sort by" controls.
 *
 * @example
 * ```tsx
 * import { SortPicker } from '@molecule/app-sort-picker-react'
 *
 * const [sort, setSort] = useState('newest')
 *
 * <SortPicker
 *   value={sort}
 *   onChange={setSort}
 *   options={[
 *     { value: 'newest', label: 'Newest' },
 *     { value: 'oldest', label: 'Oldest' },
 *     { value: 'popular', label: 'Most Popular' },
 *   ]}
 * />
 * ```
 * @module
 */

export * from './SortPicker.js'
