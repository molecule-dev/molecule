/**
 * Skeleton, SkeletonText and SkeletonCircle parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** Skeleton: dimensions, circle, border radius, animation variants and passthrough. */
export const skeletonCases: UIComponentCases = {
  component: 'Skeleton',
  cases: [
    { name: 'defaults' },
    { name: 'numeric width and height', props: { width: 120, height: 16 } },
    { name: 'percent width', props: { width: '50%', height: 12 } },
    { name: 'string height', props: { width: 200, height: '2rem' } },
    { name: 'circle', props: { circle: true, width: 48, height: 48 } },
    { name: 'circle with width only mirrors height', props: { circle: true, width: 64 } },
    { name: 'numeric border radius', props: { width: 100, height: 20, borderRadius: 8 } },
    { name: 'string border radius', props: { width: 100, height: 20, borderRadius: '0.5rem' } },
    { name: 'animation wave', props: { width: 100, height: 20, animation: 'wave' } },
    { name: 'animation none', props: { width: 100, height: 20, animation: 'none' } },
    {
      name: 'className, style and testId',
      props: { className: 'parity-token', style: { marginTop: '4px' }, testId: 'bone' },
    },
  ],
}

/** SkeletonText: line counts and last-line tapering. */
export const skeletonTextCases: UIComponentCases = {
  component: 'SkeletonText',
  cases: [
    { name: 'defaults three lines' },
    { name: 'single line', props: { lines: 1 } },
    { name: 'five lines', props: { lines: 5 } },
    { name: 'className', props: { className: 'parity-token' } },
  ],
}

/** SkeletonCircle: default and custom avatar placeholder sizes. */
export const skeletonCircleCases: UIComponentCases = {
  component: 'SkeletonCircle',
  cases: [
    { name: 'defaults' },
    { name: 'custom size', props: { size: 24 } },
    { name: 'className', props: { className: 'parity-token' } },
  ],
}
