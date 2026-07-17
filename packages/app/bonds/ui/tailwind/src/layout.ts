/**
 * Tailwind CSS layout component class definitions.
 *
 * @module
 */

import { cva } from './utilities.js'

/**
 * Container component classes.
 */
export const container = cva('mx-auto w-full px-4', {
  variants: {
    size: {
      sm: 'max-w-screen-sm',
      md: 'max-w-screen-md',
      lg: 'max-w-screen-lg',
      xl: 'max-w-screen-xl',
      '2xl': 'max-w-screen-2xl',
      full: 'max-w-full',
    },
  },
  defaultVariants: {
    size: 'xl',
  },
})

/**
 * Flex layout classes.
 */
export const flex = cva('flex', {
  variants: {
    direction: {
      row: 'flex-row',
      'row-reverse': 'flex-row-reverse',
      col: 'flex-col',
      'col-reverse': 'flex-col-reverse',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    },
    wrap: {
      wrap: 'flex-wrap',
      nowrap: 'flex-nowrap',
      'wrap-reverse': 'flex-wrap-reverse',
    },
    gap: {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    },
  },
  defaultVariants: {
    direction: 'row',
    align: 'stretch',
    justify: 'start',
    wrap: 'nowrap',
    // Intentionally no default `gap`: `getClassMap().flex({ gap: N })` appends
    // `gap-${N}`; the styling `cn()` is not tailwind-merge — a default `gap-0`
    // would be concatenated with `gap-3` and whichever utility wins in CSS is
    // undefined. Callers that need zero gap pass `gap: 'none'`.
  },
})

/**
 * Grid layout classes.
 *
 * These `cols` values are the FIXED (non-responsive) column classes — a grid
 * that is `cols`-wide at every viewport width. The ClassMap `grid` resolver
 * (see `classMap.ts`) uses these only for the opt-out (`responsive: false`)
 * and single-column paths; by DEFAULT it emits the mobile-first ramp in
 * {@link gridResponsiveCols} instead.
 */
export const grid = cva('grid', {
  variants: {
    cols: {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
      12: 'grid-cols-12',
    },
    gap: {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    },
  },
  defaultVariants: {
    cols: 1,
    gap: 'md',
  },
})

/**
 * Mobile-first responsive column ramps for `cm.grid({ cols })`.
 *
 * Each value is a COMPLETE, literal Tailwind class string (never built by
 * template interpolation) so Tailwind's scanner picks it up from this
 * package's compiled `dist` (see the `@source` note in `index.ts`), and
 * `base.css` safelists the same set. A multi-column grid starts at one
 * column on phones and steps up to the requested `cols` at `sm`/`lg`/`xl`,
 * so KPI / listing / card grids COLLAPSE on mobile instead of overflowing.
 * `cols: 1` stays single-column. The ClassMap `grid` resolver uses this as
 * the DEFAULT for `cols >= 2`; pass `responsive: false` there for the fixed
 * `grid-cols-N` from the {@link grid} CVA above. Every emitted token is a
 * real Tailwind utility (`grid-cols-1..6`, `grid-cols-12`, and the
 * `sm:`/`lg:`/`xl:` variants of each).
 */
export const gridResponsiveCols: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  12: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 xl:grid-cols-12',
}

/**
 * Stack layout classes (vertical flexbox).
 */
export const stack = cva('flex flex-col', {
  variants: {
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    },
    gap: {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    },
  },
  defaultVariants: {
    align: 'stretch',
    gap: 'md',
  },
})

/**
 * HStack layout classes (horizontal flexbox).
 */
export const hstack = cva('flex flex-row items-center', {
  variants: {
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    },
    gap: {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    },
  },
  defaultVariants: {
    justify: 'start',
    gap: 'md',
  },
})

/**
 * Center layout classes.
 */
export const center = 'flex items-center justify-center'

/**
 * Screen reader only classes.
 */
export const srOnly = 'sr-only'
/**
 * The not sr only.
 */
export const notSrOnly = 'not-sr-only'
