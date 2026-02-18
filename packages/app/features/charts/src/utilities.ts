/**
 * Chart utilities for molecule.dev.
 *
 * @module
 */

/**
 * Color palette presets.
 */
export const colorPalettes = {
  default: [
    '#4e79a7',
    '#f28e2c',
    '#e15759',
    '#76b7b2',
    '#59a14f',
    '#edc949',
    '#af7aa1',
    '#ff9da7',
    '#9c755f',
    '#bab0ab',
  ],
  pastel: [
    '#a1c9f4',
    '#ffb482',
    '#8de5a1',
    '#ff9f9b',
    '#d0bbff',
    '#debb9b',
    '#fab0e4',
    '#cfcfcf',
    '#fffea3',
    '#b9f2f0',
  ],
  vivid: [
    '#e41a1c',
    '#377eb8',
    '#4daf4a',
    '#984ea3',
    '#ff7f00',
    '#ffff33',
    '#a65628',
    '#f781bf',
    '#999999',
  ],
  cool: [
    '#005f73',
    '#0a9396',
    '#94d2bd',
    '#e9d8a6',
    '#ee9b00',
    '#ca6702',
    '#bb3e03',
    '#ae2012',
    '#9b2226',
  ],
  warm: ['#ffcdb2', '#ffb4a2', '#e5989b', '#b5838d', '#6d6875'],
  monochrome: [
    '#1a1a1a',
    '#333333',
    '#4d4d4d',
    '#666666',
    '#808080',
    '#999999',
    '#b3b3b3',
    '#cccccc',
    '#e6e6e6',
  ],
}

/**
 * Gets a color from a palette.
 * @param index - The color index (wraps around if it exceeds palette length).
 * @param palette - The named color palette to pick from.
 * @returns The hex color string at the given index.
 */
export const getColor = (
  index: number,
  palette: keyof typeof colorPalettes = 'default',
): string => {
  const colors = colorPalettes[palette]
  return colors[index % colors.length]
}

/**
 * Generates colors for a dataset.
 * @param count - The number of colors to generate.
 * @param palette - The named color palette to draw from.
 * @returns An array of hex color strings cycling through the palette.
 */
export const generateColors = (
  count: number,
  palette: keyof typeof colorPalettes = 'default',
): string[] => {
  return Array.from({ length: count }, (_, i) => getColor(i, palette))
}
