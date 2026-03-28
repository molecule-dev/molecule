# DESIGN.md — Molecule Design System

This file defines the visual design system for all molecule applications. AI tools (Claude Code, Synthase, Cursor, Stitch) should reference this file when generating or modifying any UI component. Use only the values defined here — never invent arbitrary colors, fonts, sizes, or spacing.

## Colors

### Brand
- Primary: `#4070e0`
- Primary Hover: `#6090f0`
- Primary Dark: `#3060c0`
- Secondary: `#808080`
- Secondary Hover: `#a0a0a0`
- Secondary Dark: `#606060`

### Semantic
- Success: `#309000`
- Success Light: `#dcfce7`
- Warning: `#e0e040`
- Warning Light: `#fef3c7`
- Error: `#d02000`
- Error Light: `#fee2e2`
- Info: `#17a2b8`
- Info Light: `#cffafe`

### Backgrounds
- Primary: `#f6f6f6`
- Secondary: `#eeeeee`
- Tertiary: `#e8e8e8`
- Surface: `#ffffff`
- Surface Secondary: `#f8f8f8`
- Input: `#ffffff`
- Overlay: `rgba(0, 0, 0, 0.5)`

### Text
- Primary: `#333333`
- Secondary: `#808080`
- Tertiary: `#555555`
- Inverse: `#ffffff`
- Link: `#4070e0`
- Link Hover: `#3060c0`

### Borders
- Primary: `#e0e0e0`
- Secondary: `#d0d0d0`
- Focus: `#4070e0`

### Dark Theme Overrides
- Primary: `#60a5fa`
- Background: `#0f172a`
- Surface: `#1e293b`
- Text Primary: `#f8fafc`
- Text Secondary: `#cbd5e1`
- Border Primary: `#334155`

## Typography

### Font Families
- Sans (default): `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Serif: `Georgia, "Times New Roman", Times, serif`
- Mono: `SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`

### Font Sizes
- xs: `0.75rem` (12px)
- sm: `0.875rem` (14px)
- base: `1rem` (16px)
- lg: `1.125rem` (18px)
- xl: `1.25rem` (20px)
- 2xl: `1.5rem` (24px)
- 3xl: `1.875rem` (30px)
- 4xl: `2.25rem` (36px)
- 5xl: `3rem` (48px)

### Font Weights
- Light: `300`
- Normal: `400`
- Medium: `500`
- Semibold: `600`
- Bold: `700`

### Line Heights
- Tight: `1.25`
- Normal: `1.5`
- Relaxed: `1.75`

## Spacing

All spacing follows an 8px base grid:
- xs: `4px`
- sm: `8px`
- md: `16px`
- lg: `24px`
- xl: `32px`
- 2xl: `48px`
- 3xl: `64px`

## Border Radius
- none: `0`
- sm: `4px`
- md: `8px` (default for inputs, cards)
- lg: `12px` (modals, larger cards)
- xl: `16px`
- full: `9999px` (pills, avatars)

## Shadows
- sm: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- md: `0 4px 6px -1px rgba(0, 0, 0, 0.1)` (default for cards)
- lg: `0 10px 15px -3px rgba(0, 0, 0, 0.1)` (dropdowns, modals)
- xl: `0 20px 25px -5px rgba(0, 0, 0, 0.15)` (popovers)

## Breakpoints
- Mobile S: `320px`
- Mobile M: `375px`
- Mobile L: `425px`
- Tablet: `768px`
- Laptop: `1024px`
- Laptop L: `1440px`
- Desktop: `2560px`

## Transitions
- Fast: `150ms ease` (hover states, toggles)
- Normal: `300ms ease` (most animations)
- Slow: `500ms ease` (page transitions, modals)

## Z-Index Scale
- Dropdown: `1000`
- Sticky: `1100`
- Fixed: `1200`
- Modal: `1300`
- Popover: `1400`
- Tooltip: `1500`
- Toast: `1600`

## Components

### Buttons
- Border radius: `8px` (md)
- Padding: `8px 16px` (sm-md)
- Font weight: `500` (medium)
- Variants: `solid` (filled), `outline` (bordered), `ghost` (transparent), `link` (text only)
- Sizes: `xs` (28px height), `sm` (32px), `md` (40px), `lg` (48px), `xl` (56px)
- Colors: primary, secondary, success, warning, error, info

### Cards
- Border radius: `12px` (lg)
- Shadow: `md` by default
- Padding: `16px` (md)
- Border: `1px solid` border-primary
- Variants: `default`, `elevated` (stronger shadow), `outline` (no shadow), `ghost` (no border/shadow)

### Inputs
- Border radius: `8px` (md)
- Border: `1px solid` border-primary
- Height: `40px` (md)
- Padding: `8px 12px`
- Focus: `2px solid` focus color with `2px` offset
- Error: border-error color, error-light background

### Badges
- Border radius: `9999px` (pill)
- Padding: `2px 8px`
- Font size: `xs` (12px)
- Font weight: `500`

### Alerts
- Border radius: `8px` (md)
- Padding: `12px 16px`
- Border-left: `4px solid` (accent variant)
- Variants: info (blue), success (green), warning (yellow), error (red)

### Modals
- Border radius: `12px` (lg)
- Shadow: `xl`
- Overlay: `rgba(0, 0, 0, 0.5)`
- Sizes: `sm` (400px), `md` (500px), `lg` (640px), `xl` (800px), `full` (100%)
- Padding: `24px` (lg)

### Tables
- Header background: surface-secondary
- Row hover: surface-secondary
- Border: `1px solid` border-primary
- Cell padding: `12px 16px`
- Striped: alternating surface/surface-secondary

### Navigation
- Sidebar width: `240px` (collapsed: `64px`)
- Top bar height: `56px`
- Active item: primary-light background, primary text

## Design Principles

1. **Consistency over creativity** — use the tokens above, don't invent new values
2. **8px grid** — all spacing should be multiples of 8px (with 4px for tight spaces)
3. **Semantic colors** — use success/warning/error/info for status, not arbitrary colors
4. **Hierarchy through weight** — use font weight and size for emphasis, not color alone
5. **Accessible contrast** — text on backgrounds must meet WCAG AA (4.5:1 for body, 3:1 for large text)
6. **Responsive first** — design for mobile, enhance for desktop
7. **Dark mode parity** — every screen must work in both light and dark themes

## CSS Variable Naming

All tokens are available as CSS custom properties with the `--mol-` prefix:

```css
var(--mol-color-primary)
var(--mol-color-bg-primary)
var(--mol-color-text-primary)
var(--mol-spacing-md)
var(--mol-radius-lg)
var(--mol-shadow-md)
var(--mol-font-sans)
var(--mol-text-lg)
var(--mol-transition-normal)
```

## Automation

All interactive elements should include `data-mol-id` attributes for AI agent interaction and E2E testing. See `@molecule/app-ui` automation module for helpers.
