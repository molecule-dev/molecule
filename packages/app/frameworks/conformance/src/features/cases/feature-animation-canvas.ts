/**
 * `@molecule/app-feature-animation-canvas-react` cases: the SVG animation
 * canvas and the pure interpolation / easing helpers it exports.
 *
 * `AnimationCanvas` is the package's only component; `interpolateState`,
 * `bracketKeyframes`, `lerp`, `pickEasing`, `cubicBezier`, `sampleEasing`,
 * `resolveEasing` and `easingFunctions` are its plain-function and constant
 * exports.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/**
 * Two keyframes of one shape: still at the origin, then moved, rotated,
 * scaled and faded.
 */
const moveAndFade = [
  { time: 0, state: [{ id: 'a', x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 }] },
  { time: 1, state: [{ id: 'a', x: 100, y: 60, rotation: 90, scale: 1.5, opacity: 0.5 }] },
]

/** Three keyframes of one shape, so a playhead picks the right segment. */
const threeKeyframes = [
  { time: 0, state: [{ id: 'a', x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 }] },
  { time: 1, state: [{ id: 'a', x: 100, y: 50, rotation: 180, scale: 2, opacity: 1 }] },
  { time: 2, state: [{ id: 'a', x: 50, y: 0, rotation: 360, scale: 1, opacity: 0.25 }] },
]

/** `@molecule/app-feature-animation-canvas-react`. */
export const featureAnimationCanvasFeature: FeatureCases = {
  package: '@molecule/app-feature-animation-canvas-react',
  families: [
    {
      component: 'AnimationCanvas',
      cases: [
        // The family's first case also derives the locale-switch case, so it
        // carries the translated canvas aria label.
        {
          name: 'the first keyframe',
          props: { keyframes: moveAndFade, currentTime: 0, width: 400, height: 200 },
        },
        {
          name: 'halfway between two keyframes',
          props: { keyframes: moveAndFade, currentTime: 0.5, width: 400, height: 200 },
        },
        {
          name: 'a shape easing on the target keyframe',
          props: {
            keyframes: [
              { time: 0, state: [{ id: 'a', x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 }] },
              {
                time: 1,
                state: [
                  {
                    id: 'a',
                    x: 100,
                    y: 0,
                    rotation: 0,
                    scale: 1,
                    opacity: 1,
                    easing: 'easeIn',
                  },
                ],
              },
            ],
            currentTime: 0.25,
            width: 400,
            height: 200,
          },
        },
        {
          name: 'per-property easing overrides the whole-shape easing',
          props: {
            keyframes: [
              {
                time: 0,
                state: [
                  { id: 'a', x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 },
                  { id: 'b', x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 },
                ],
              },
              {
                time: 1,
                state: [
                  {
                    id: 'a',
                    x: 100,
                    y: 100,
                    rotation: 0,
                    scale: 1,
                    opacity: 1,
                    easing: 'easeOut',
                    easings: { x: 'easeIn' },
                  },
                  {
                    id: 'b',
                    x: 100,
                    y: 100,
                    rotation: 0,
                    scale: 1,
                    opacity: 1,
                    easings: { rotation: [0.42, 0, 0.58, 1] },
                  },
                ],
              },
            ],
            currentTime: 0.25,
            width: 400,
            height: 200,
          },
        },
        {
          name: 'a preset on the whole shape with per-property presets on scale and opacity',
          props: {
            keyframes: [
              { time: 0, state: [{ id: 'a', x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 }] },
              {
                time: 1,
                state: [
                  {
                    id: 'a',
                    x: 120,
                    y: 60,
                    rotation: 90,
                    scale: 2,
                    opacity: 0.5,
                    easing: 'linear',
                    easings: { scale: 'easeInOut', opacity: [0.42, 0, 1, 1] },
                  },
                ],
              },
            ],
            currentTime: 0.4,
            width: 400,
            height: 200,
          },
        },
        {
          name: 'an explicit bezier tuple on one property',
          props: {
            keyframes: [
              {
                time: 0,
                state: [{ id: 'spin', x: 20, y: 40, rotation: 0, scale: 1, opacity: 1 }],
              },
              {
                time: 1,
                state: [
                  {
                    id: 'spin',
                    x: 220,
                    y: 40,
                    rotation: 180,
                    scale: 1,
                    opacity: 1,
                    easings: { rotation: [0, 0, 0.58, 1] },
                  },
                ],
              },
            ],
            currentTime: 0.5,
            width: 400,
            height: 200,
          },
        },
        {
          name: 'a vanishing shape fades out',
          props: {
            keyframes: [
              {
                time: 0,
                state: [
                  { id: 'a', x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 },
                  { id: 'b', x: 40, y: 40, rotation: 0, scale: 1, opacity: 1 },
                ],
              },
              { time: 1, state: [{ id: 'a', x: 40, y: 0, rotation: 0, scale: 1, opacity: 1 }] },
            ],
            currentTime: 0.5,
            width: 400,
            height: 200,
          },
        },
        {
          name: 'an appearing shape fades in',
          props: {
            keyframes: [
              { time: 0, state: [{ id: 'a', x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 }] },
              {
                time: 1,
                state: [
                  { id: 'a', x: 40, y: 0, rotation: 0, scale: 1, opacity: 1 },
                  { id: 'b', x: 80, y: 80, rotation: 0, scale: 1, opacity: 0.8 },
                ],
              },
            ],
            currentTime: 0.5,
            width: 400,
            height: 200,
          },
        },
        {
          name: 'one keyframe holds its state at any time',
          props: {
            keyframes: [
              { time: 2, state: [{ id: 'a', x: 7, y: 8, rotation: 45, scale: 2, opacity: 0.4 }] },
            ],
            currentTime: 5,
            width: 400,
            height: 200,
          },
        },
        {
          name: 'no keyframes renders an empty canvas',
          props: { keyframes: [], currentTime: 0, width: 400, height: 200 },
        },
        {
          name: 'many shapes keep their order',
          props: {
            keyframes: [
              {
                time: 0,
                state: [
                  { id: 'one', x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 },
                  { id: 'two', x: 30, y: 30, rotation: 10, scale: 1, opacity: 0.9 },
                  { id: 'three', x: 60, y: 60, rotation: 20, scale: 2, opacity: 0.8 },
                ],
              },
            ],
            currentTime: 0,
            width: 400,
            height: 200,
          },
        },
        {
          name: 'a time outside the range clamps, then lands on each keyframe',
          props: { keyframes: threeKeyframes, currentTime: -1, width: 400, height: 200 },
          interactions: [
            { type: 'props', props: { currentTime: 1 } },
            { type: 'props', props: { currentTime: 1.5 } },
            { type: 'props', props: { currentTime: 2 } },
            { type: 'props', props: { currentTime: 99 } },
          ],
        },
        {
          name: 'the canvas size changes',
          props: { keyframes: moveAndFade, currentTime: 0.5, width: 400, height: 200 },
          interactions: [{ type: 'props', props: { width: 600, height: 300 } }],
        },
        {
          name: 'other keyframes replace the current ones',
          props: { keyframes: moveAndFade, currentTime: 0.5, width: 400, height: 200 },
          interactions: [{ type: 'props', props: { keyframes: threeKeyframes, currentTime: 1.5 } }],
        },
        {
          name: 'a className is added, replaced and removed',
          props: {
            keyframes: moveAndFade,
            currentTime: 0.5,
            width: 400,
            height: 200,
            className: 'parity-token',
          },
          interactions: [
            { type: 'props', props: { className: 'parity-other' } },
            { type: 'props', props: { className: undefined } },
          ],
        },
        {
          name: 'clicking the canvas seeks along the timeline',
          props: {
            keyframes: [
              { time: 0, state: [{ id: 'a', x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 }] },
              { time: 2, state: [{ id: 'a', x: 100, y: 0, rotation: 0, scale: 1, opacity: 1 }] },
            ],
            currentTime: 0,
            width: 400,
            height: 200,
          },
          callbacks: ['onSeek', 'onChange'],
          layout: [
            { selector: '[data-mol-id="animation-canvas"]', rect: { width: 400, height: 200 } },
          ],
          interactions: [
            {
              type: 'pointer',
              selector: '[data-mol-id="animation-canvas"]',
              event: 'pointerdown',
              clientX: 100,
              clientY: 50,
            },
            {
              type: 'pointer',
              selector: '[data-mol-id="animation-canvas"]',
              event: 'pointerdown',
              clientX: 300,
              clientY: 50,
            },
          ],
        },
        {
          name: 'a click outside the canvas clamps to its ends',
          props: {
            keyframes: [
              { time: 0, state: [{ id: 'a', x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 }] },
              { time: 2, state: [{ id: 'a', x: 100, y: 0, rotation: 0, scale: 1, opacity: 1 }] },
            ],
            currentTime: 0,
            width: 400,
            height: 200,
          },
          callbacks: ['onSeek'],
          layout: [
            { selector: '[data-mol-id="animation-canvas"]', rect: { width: 400, height: 200 } },
          ],
          interactions: [
            {
              type: 'pointer',
              selector: '[data-mol-id="animation-canvas"]',
              event: 'pointerdown',
              clientX: -50,
              clientY: 50,
            },
            {
              type: 'pointer',
              selector: '[data-mol-id="animation-canvas"]',
              event: 'pointerdown',
              clientX: 900,
              clientY: 50,
            },
          ],
        },
        {
          name: 'a single keyframe seeks to its own time',
          props: {
            keyframes: [
              { time: 3, state: [{ id: 'a', x: 5, y: 5, rotation: 0, scale: 1, opacity: 1 }] },
            ],
            currentTime: 0,
            width: 400,
            height: 200,
          },
          callbacks: ['onSeek'],
          layout: [
            { selector: '[data-mol-id="animation-canvas"]', rect: { width: 400, height: 200 } },
          ],
          interactions: [
            {
              type: 'pointer',
              selector: '[data-mol-id="animation-canvas"]',
              event: 'pointerdown',
              clientX: 250,
              clientY: 100,
            },
          ],
        },
        {
          name: 'without onSeek a click does nothing',
          props: { keyframes: moveAndFade, currentTime: 0, width: 400, height: 200 },
          layout: [
            { selector: '[data-mol-id="animation-canvas"]', rect: { width: 400, height: 200 } },
          ],
          interactions: [
            {
              type: 'pointer',
              selector: '[data-mol-id="animation-canvas"]',
              event: 'pointerdown',
              clientX: 100,
              clientY: 50,
            },
          ],
        },
        {
          name: 'onChange is accepted and never called',
          props: {
            keyframes: moveAndFade,
            currentTime: 0.5,
            width: 400,
            height: 200,
          },
          callbacks: ['onChange'],
          layout: [
            { selector: '[data-mol-id="animation-canvas"]', rect: { width: 400, height: 200 } },
          ],
          interactions: [
            {
              type: 'pointer',
              selector: '[data-mol-id="animation-canvas"]',
              event: 'pointerdown',
              clientX: 200,
              clientY: 100,
            },
          ],
        },
      ],
    },
  ],
  values: [
    { export: 'easingFunctions' },
    {
      export: 'resolveEasing',
      calls: [[], ['linear'], ['easeOut'], [[0.1, 0.2, 0.3, 0.9]]],
    },
    {
      export: 'cubicBezier',
      calls: [
        [0.25, 0.42, 0, 1, 1],
        [0.5, 0.42, 0, 0.58, 1],
        [0.5, 0.42, 0, 1, 1],
        [0, 0.42, 0, 0.58, 1],
        [1, 0.42, 0, 0.58, 1],
        [-0.5, 0, 0, 1, 1],
        [2, 0, 0, 1, 1],
        [0.3, 0, 0, 1, 1],
      ],
    },
    {
      export: 'sampleEasing',
      calls: [
        ['linear', 0.4],
        ['easeIn', 0.25],
        ['easeInOut', 0.5],
        [[0, 0, 1, 1], 0.3],
      ],
    },
    {
      export: 'lerp',
      calls: [
        [10, 20, 0],
        [10, 20, 1],
        [10, 20, 0.5],
        [10, 20, 1.5],
        [10, 20, -0.5],
      ],
    },
    {
      export: 'pickEasing',
      calls: [
        [
          {
            id: 'a',
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            opacity: 1,
            easing: 'easeIn',
            easings: { x: 'easeOut' },
          },
          'x',
        ],
        [
          {
            id: 'a',
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            opacity: 1,
            easing: 'easeIn',
            easings: { x: 'easeOut' },
          },
          'y',
        ],
        [{ id: 'a', x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, easing: 'easeIn' }, 'rotation'],
        [{ id: 'a', x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 }, 'opacity'],
        [
          {
            id: 'a',
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            opacity: 1,
            easing: 'easeIn',
            easings: { scale: 'easeInOut' },
          },
          'scale',
        ],
      ],
    },
    {
      export: 'bracketKeyframes',
      calls: [
        [moveAndFade, 0.5],
        [moveAndFade, -1],
        [moveAndFade, 5],
        [threeKeyframes, 1.5],
        [threeKeyframes, 0],
        [threeKeyframes, 2],
      ],
    },
    {
      export: 'interpolateState',
      calls: [
        [moveAndFade, 0.5],
        [threeKeyframes, 1.5],
        [threeKeyframes, -1],
        [threeKeyframes, 99],
        [
          [
            {
              time: 0,
              state: [
                { id: 'a', x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 },
                { id: 'gone', x: 10, y: 10, rotation: 0, scale: 1, opacity: 1 },
              ],
            },
            { time: 1, state: [{ id: 'a', x: 100, y: 0, rotation: 0, scale: 1, opacity: 1 }] },
          ],
          0.5,
        ],
        [
          [
            { time: 0, state: [{ id: 'a', x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 }] },
            {
              time: 1,
              state: [
                { id: 'a', x: 100, y: 0, rotation: 0, scale: 1, opacity: 1 },
                { id: 'new', x: 20, y: 20, rotation: 0, scale: 1, opacity: 0.6 },
              ],
            },
          ],
          0.25,
        ],
        [[], 0],
      ],
    },
  ],
}
