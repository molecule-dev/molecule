/**
 * `@molecule/app-annotation-pin-react` cases: the single pin marker (label,
 * note popup on every side, the empty-note fallback, normalised and raw-pixel
 * positioning, the click callback) and the layer that overlays many pins on a
 * surface (the surface children, the add-pin target and its normalised /
 * raw-pixel / keyboard-centre coordinates, the active pin's popup, the pin
 * click callback and the popup side forwarded to every pin).
 *
 * `AnnotationPin` and `AnnotationLayer` are the package's only runtime
 * exports; `Pin` and the props interfaces are types.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A label node (the marker's short tag can be rich content). */
const labelNode = [{ tag: 'strong', attrs: { 'data-label': '' }, children: ['Star'] }]
/** A note node (the popup body can be any content). */
const noteNode = [{ tag: 'p', children: ['A longer note'] }]
/** The surface children a caller annotates. */
const surface = [{ tag: 'img', attrs: { src: '/surface.png', alt: '' } }]

/** Pins used by the layer cases: two with notes, one without. */
const pins = [
  { id: 'a', position: { x: 0.25, y: 0.25 }, label: 1, note: 'Alpha note' },
  { id: 'b', position: { x: 0.5, y: 0.5 }, label: 2, note: 'Bravo note' },
  { id: 'c', position: { x: 0.75, y: 0.75 }, label: 3 },
]

/**
 * The selector of the nth pin marker on a layer (pins follow the content and
 * the add-pin target, and are the layer's only `div` children).
 *
 * @param n - 1-based pin index.
 * @returns The CSS selector of that pin's marker button.
 */
const markerOf = (n: number): string =>
  `div[data-mol-id="annotation-pin"]:nth-of-type(${n}) > button[data-mol-id="annotation-pin-marker"]`

/** The add-pin target that covers the surface. */
const addPinSelector = '[data-mol-id="annotation-layer-add-pin"]'

/** The add-pin target's box, which jsdom does not compute. */
const addPinLayout = [
  { selector: addPinSelector, rect: { left: 0, top: 0, width: 200, height: 100 } },
]

/** The add-pin target's box (offset from the viewport) for the raw-pixel case. */
const offsetAddPinLayout = [
  { selector: addPinSelector, rect: { left: 10, top: 5, width: 200, height: 100 } },
]

/** `@molecule/app-annotation-pin-react`. */
export const annotationPinFeature: FeatureCases = {
  package: '@molecule/app-annotation-pin-react',
  families: [
    {
      component: 'AnnotationPin',
      cases: [
        {
          name: 'defaults',
          props: { position: { x: 0.5, y: 0.5 } },
        },
        {
          name: 'a numeric label',
          props: { position: { x: 0.5, y: 0.5 }, label: 7 },
        },
        {
          name: 'a text label',
          props: { position: { x: 0.5, y: 0.5 }, label: 'N' },
        },
        {
          name: 'a node label passed as a prop',
          props: { position: { x: 0.5, y: 0.5 }, label: { $nodes: labelNode } },
        },
        {
          name: 'a node label passed as a slot',
          props: { position: { x: 0.5, y: 0.5 } },
          slots: { label: labelNode },
        },
        {
          name: 'normalised positions use percentages',
          props: { position: { x: 0.4, y: 0.6 }, label: 1 },
        },
        {
          name: 'raw pixel positions',
          props: { position: { x: 120, y: 80 }, label: 1, normalised: false },
        },
        {
          name: 'not selected renders no popup',
          props: { position: { x: 0.5, y: 0.5 }, label: 1, note: 'Hidden note' },
        },
        {
          name: 'selected renders the note in the popup',
          props: { position: { x: 0.5, y: 0.5 }, label: 1, note: 'Hello', selected: true },
        },
        {
          name: 'selected without a note renders the empty state',
          props: { position: { x: 0.5, y: 0.5 }, label: 1, selected: true },
        },
        {
          name: 'selected with a node note passed as a prop',
          props: {
            position: { x: 0.5, y: 0.5 },
            label: 1,
            note: { $nodes: noteNode },
            selected: true,
          },
        },
        {
          name: 'selected with a node note passed as a slot',
          props: { position: { x: 0.5, y: 0.5 }, label: 1, selected: true },
          slots: { note: noteNode },
        },
        {
          name: 'popup side top',
          props: {
            position: { x: 0.5, y: 0.5 },
            label: 1,
            note: 'Top',
            selected: true,
            popupSide: 'top',
          },
        },
        {
          name: 'popup side bottom',
          props: {
            position: { x: 0.5, y: 0.5 },
            label: 1,
            note: 'Bottom',
            selected: true,
            popupSide: 'bottom',
          },
        },
        {
          name: 'popup side left',
          props: {
            position: { x: 0.5, y: 0.5 },
            label: 1,
            note: 'Left',
            selected: true,
            popupSide: 'left',
          },
        },
        {
          name: 'popup side right',
          props: {
            position: { x: 0.5, y: 0.5 },
            label: 1,
            note: 'Right',
            selected: true,
            popupSide: 'right',
          },
        },
        {
          name: 'className passthrough',
          props: { position: { x: 0.5, y: 0.5 }, label: 1, className: 'parity-token' },
        },
        {
          name: 'clicking the marker calls onClick',
          props: { position: { x: 0.5, y: 0.5 }, label: 1 },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: '[data-mol-id="annotation-pin-marker"]' }],
        },
        {
          name: 'clicking the marker without onClick is harmless',
          props: { position: { x: 0.5, y: 0.5 }, label: 1 },
          interactions: [{ type: 'click', selector: '[data-mol-id="annotation-pin-marker"]' }],
        },
        {
          name: 'selection, position and side change after mount',
          props: { position: { x: 0.5, y: 0.5 }, label: 1, note: 'Move' },
          interactions: [
            { type: 'props', props: { selected: true } },
            { type: 'props', props: { position: { x: 0.2, y: 0.9 }, popupSide: 'left' } },
            { type: 'props', props: { selected: false } },
          ],
        },
        {
          name: 'removing the note after mount shows the empty state',
          props: { position: { x: 0.5, y: 0.5 }, label: 1, note: 'Gone soon', selected: true },
          interactions: [{ type: 'props', props: { note: null } }],
        },
        {
          name: 'removing the label after mount leaves the marker empty',
          props: { position: { x: 0.5, y: 0.5 }, label: 1 },
          interactions: [{ type: 'props', props: { label: null } }],
        },
      ],
    },
    {
      component: 'AnnotationLayer',
      cases: [
        {
          name: 'pins render as markers over the surface',
          props: { pins },
          children: surface,
        },
        {
          name: 'no pins and no content',
          props: { pins: [] },
        },
        {
          name: 'content only',
          props: { pins: [] },
          children: surface,
        },
        {
          name: 'the active pin shows its popup',
          props: { pins, activePinId: 'b' },
          children: surface,
        },
        {
          name: 'an active id with no matching pin shows nothing',
          props: { pins, activePinId: 'missing' },
          children: surface,
        },
        {
          name: 'pin labels and notes as nodes',
          props: {
            pins: [
              {
                id: 'n',
                position: { x: 0.3, y: 0.3 },
                label: { $nodes: labelNode },
                note: { $nodes: noteNode },
              },
            ],
            activePinId: 'n',
          },
        },
        {
          name: 'clicking a pin fires onPinClick with its id',
          props: { pins },
          callbacks: ['onPinClick'],
          interactions: [{ type: 'click', selector: markerOf(2) }],
        },
        {
          name: 'a pin click does not reach onSurfaceClick',
          props: { pins },
          callbacks: ['onPinClick', 'onSurfaceClick'],
          interactions: [{ type: 'click', selector: markerOf(1) }],
        },
        {
          name: 'the add-pin target renders when onSurfaceClick is set',
          props: { pins: [] },
          callbacks: ['onSurfaceClick'],
          children: surface,
        },
        {
          name: 'no add-pin target without onSurfaceClick',
          props: { pins: [] },
          children: surface,
        },
        {
          name: 'activating the add-pin target places a pin at the centre',
          props: { pins: [] },
          callbacks: ['onSurfaceClick'],
          layout: addPinLayout,
          interactions: [{ type: 'click', selector: addPinSelector }],
        },
        {
          name: 'raw-pixel coordinates at the centre',
          props: { pins: [], normalised: false },
          callbacks: ['onSurfaceClick'],
          layout: offsetAddPinLayout,
          interactions: [{ type: 'click', selector: addPinSelector }],
        },
        {
          name: 'the popup side reaches every pin',
          props: { pins, activePinId: 'a', popupSide: 'top' },
          children: surface,
        },
        {
          name: 'raw pixel pin positions',
          props: { pins: [{ id: 'p', position: { x: 30, y: 40 } }], normalised: false },
        },
        {
          name: 'className and style passthrough',
          props: {
            pins: [],
            className: 'parity-token',
            style: { background: 'red', color: 'blue' },
          },
          children: surface,
        },
        {
          name: 'pins and the active id change after mount',
          props: { pins: [pins[0]!], activePinId: 'a' },
          interactions: [
            { type: 'props', props: { pins: [pins[0]!, pins[1]!], activePinId: 'b' } },
            { type: 'props', props: { pins: [] } },
          ],
        },
      ],
    },
  ],
}
