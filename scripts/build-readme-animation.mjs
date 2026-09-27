#!/usr/bin/env node
/**
 * Builds docs/assets/how-molecule-works.svg — the animated "How Molecule
 * works" graphic embedded at the top of README.md.
 *
 * The output is a single self-contained SVG: CSS keyframe animations (plus
 * two SMIL `<animate>`s for the typing effect), no scripts, no external
 * fonts or images, and its own opaque background so it reads identically on
 * GitHub's light and dark themes. GitHub serves README images through its
 * camo proxy as `<img>`, where CSS/SMIL animation plays and JavaScript does
 * not — so everything here is declarative.
 *
 * One 30-second loop, five scenes of six seconds:
 *   1. Describe → compose      2. Bonds (swap providers, not code)
 *   3. Built in by default     4. Verified, then fed back
 *   5. Why it pays off
 *
 * Every scene element gets its own `@keyframes` with a visibility window
 * expressed as a percentage of the loop, so the timeline is edited by
 * changing numbers in this file, not by hand-editing the SVG.
 *
 *   node scripts/build-readme-animation.mjs
 */

import console from 'node:console'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'docs',
  'assets',
  'how-molecule-works.svg',
)

// ---------------------------------------------------------------- timeline
const LOOP = 30 // seconds
const SCENE = 6
const pct = (s) => +((s / LOOP) * 100).toFixed(3)

// ------------------------------------------------------------------ palette
const C = {
  bg0: '#0b1220',
  bg1: '#121c33',
  border: 'rgba(148,163,184,0.16)',
  card: '#152038',
  cardHi: '#1b2a4a',
  text: '#f1f5f9',
  muted: '#94a3b8',
  faint: '#64748b',
  primary: '#4070e0',
  primaryHi: '#60a5fa',
  green: '#34d399',
  amber: '#fbbf24',
  pink: '#f472b6',
  cyan: '#22d3ee',
  violet: '#a78bfa',
}
const SANS = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
const MONO = `ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace`

// Rough text width so chips fit on wide system fonts (DejaVu, Segoe) too.
const tw = (s, size, weight = 400) => s.length * size * (weight >= 600 ? 0.62 : 0.58)

// -------------------------------------------------------------- animation
const keyframes = []
let idCounter = 0
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Register a keyframe block that shows an element from `start` to `end`
 * seconds, with an entrance transform and fade. Returns the CSS class.
 */
function show(
  start,
  end,
  { fadeIn = 0.45, fadeOut = 0.4, from = 'translateY(10px)', hold = false } = {},
) {
  const name = `k${++idCounter}`
  const s0 = pct(start)
  const s1 = pct(start + fadeIn)
  const e0 = pct(Math.max(start + fadeIn, end - fadeOut))
  const e1 = pct(end)
  const hidden = `opacity:0;transform:${from}`
  const shown = `opacity:1;transform:none`
  const frames = [`0%{${hidden}}`]
  if (s0 > 0) frames.push(`${s0}%{${hidden}}`)
  frames.push(`${s1}%{${shown}}`, `${e0}%{${shown}}`)
  if (hold) {
    frames.push(`100%{${shown}}`)
  } else {
    frames.push(`${e1}%{${hidden}}`, `100%{${hidden}}`)
  }
  keyframes.push(`@keyframes ${name}{${frames.join('')}}`)
  return name
}

/** A line that draws itself (stroke-dashoffset) inside its visibility window. */
function draw(start, end, len, { dur = 0.6, fadeOut = 0.3 } = {}) {
  const name = `d${++idCounter}`
  const s0 = pct(start)
  const s1 = pct(start + dur)
  const e0 = pct(end - fadeOut)
  const e1 = pct(end)
  keyframes.push(
    `@keyframes ${name}{0%{opacity:1;stroke-dashoffset:${len}}${s0 > 0 ? `${s0}%{opacity:1;stroke-dashoffset:${len}}` : ''}${s1}%{opacity:1;stroke-dashoffset:0}${e0}%{opacity:1;stroke-dashoffset:0}${e1}%{opacity:0;stroke-dashoffset:0}100%{opacity:0;stroke-dashoffset:${len}}}`,
  )
  return { name, len }
}

const A = (name) => `style="animation:${name} ${LOOP}s linear infinite"`

// --------------------------------------------------------------- primitives
/** A rounded label chip; returns its geometry so callers can lay out around it. */
function chip(
  x,
  y,
  label,
  {
    fill = C.card,
    stroke = C.border,
    color = C.text,
    size = 13,
    weight = 500,
    dot,
    mono = false,
    anchor = 'start',
  } = {},
) {
  const padX = 14
  const dotW = dot ? 16 : 0
  const w = Math.round(tw(label, size, weight) + padX * 2 + dotW)
  const h = 30
  const left = anchor === 'middle' ? x - w / 2 : x
  return {
    w,
    h,
    left,
    svg: `<rect x="${left}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}"/>${
      dot ? `<circle cx="${left + padX + 4}" cy="${y + h / 2}" r="4" fill="${dot}"/>` : ''
    }<text x="${left + padX + dotW}" y="${y + h / 2 + size * 0.36}" font-size="${size}" font-weight="${weight}" fill="${color}"${mono ? ` font-family="${MONO}"` : ''}>${esc(label)}</text>`,
  }
}

/** A positioned `<text>` element. */
function text(
  x,
  y,
  s,
  { size = 14, weight = 400, color = C.text, anchor = 'start', mono = false, extra = '' } = {},
) {
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}"${mono ? ` font-family="${MONO}" xml:space="preserve"` : ''}${extra}>${esc(s)}</text>`
}

/** Scene caption: title + one-line subtitle, shown for the scene's window. */
function caption(i, title, sub) {
  const s = i * SCENE
  const k = show(s, s + SCENE, { from: 'translateY(6px)' })
  return `<g ${A(k)}>${text(60, 128, title, { size: 28, weight: 700 })}${text(60, 158, sub, { size: 16, color: C.muted })}</g>`
}

// ------------------------------------------------------------------ header
const logo = `<g transform="translate(58 40) scale(1.25)"><g transform="matrix(.86229 0 0 .86229 .81594 2.2034)" stroke="${C.primaryHi}" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4737"><g><line x1="20.959" x2="24.924" y1="18.579" y2="25.446"/><line x1="20.959" x2="24.924" y1="13.422" y2="6.555"/><line x1="16.494" x2="8.563" y1="16" y2="16"/></g><g fill="none"><circle cx="19.47" cy="16" r="2.976"/><circle cx="5.587" cy="16" r="2.977"/><circle cx="26.412" cy="28.023" r="2.976"/><circle cx="26.412" cy="3.977" r="2.976"/></g></g></g>`
const header = `${logo}${text(112, 68, 'How Molecule works', { size: 22, weight: 700 })}${text(1140, 68, 'molecule.dev', { size: 15, weight: 500, color: C.muted, anchor: 'end' })}`

// Scene index at the bottom: five segments, the live one lit.
const SCENES = ['Describe', 'Bonds', 'Built in', 'Verify loop', 'Outcomes']
let footer = ''
{
  const segW = 200
  const x0 = 60
  const y = 662
  SCENES.forEach((label, i) => {
    const x = x0 + i * (segW + 20)
    const kf = `s${++idCounter}`
    const s0 = pct(i * SCENE)
    const s1 = pct(i * SCENE + 0.3)
    const e0 = pct((i + 1) * SCENE - 0.3)
    const e1 = pct((i + 1) * SCENE)
    keyframes.push(
      `@keyframes ${kf}{0%{opacity:0.25}${s0 > 0 ? `${s0}%{opacity:0.25}` : ''}${s1}%{opacity:1}${e0}%{opacity:1}${e1}%{opacity:0.25}100%{opacity:0.25}}`,
    )
    // Progress fill for the live segment.
    const pf = `p${++idCounter}`
    keyframes.push(
      `@keyframes ${pf}{0%{transform:scaleX(0)}${s0 > 0 ? `${s0}%{transform:scaleX(0)}` : ''}${e1}%{transform:scaleX(1)}100%{transform:scaleX(${i === SCENES.length - 1 ? 1 : 0})}}`,
    )
    footer += `<g ${A(kf)}><rect x="${x}" y="${y}" width="${segW}" height="4" rx="2" fill="${C.border}"/><rect x="${x}" y="${y}" width="${segW}" height="4" rx="2" fill="${C.primaryHi}" style="transform-box:fill-box;transform-origin:left center;animation:${pf} ${LOOP}s linear infinite"/>${text(x, y + 22, `${i + 1}  ${label}`, { size: 12, weight: 600, color: C.muted })}</g>`
  })
}

// =============================================================== SCENE 1
// Describe → compose
let scene1 = caption(
  0,
  'Describe it. Synthase composes a real project.',
  'From a sentence to a TypeScript codebase assembled from 950+ open-source @molecule/* packages.',
)
{
  const s = 0
  // Prompt card with typed text.
  const promptK = show(s + 0.2, s + SCENE, { from: 'translateY(12px)' })
  const prompt = 'A CRM with Google sign-in, Stripe billing, and a mobile app.'
  const px = 60
  const py = 210
  const pw = 400
  const ph = 118
  const line1 = prompt.slice(0, 33)
  const line2 = prompt.slice(33)
  const w1 = tw(line1, 16, 500)
  const w2 = tw(line2, 16, 500)
  const kt = (t) => (pct(s + t) / 100).toFixed(4)
  const sceneEnd = kt(SCENE)
  const x0 = px + 20
  // Each line has its own clip that widens while it "types"; the cursor tracks the pen.
  scene1 += `<g ${A(promptK)}>
    <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="14" fill="${C.card}" stroke="${C.border}"/>
    ${text(x0, py + 30, 'You', { size: 12, weight: 700, color: C.faint })}
    <clipPath id="typeClip1"><rect x="${x0}" y="${py + 44}" width="0" height="26"><animate attributeName="width" values="0;0;${w1};${w1};0" keyTimes="0;${kt(0.7)};${kt(1.7)};${sceneEnd};1" dur="${LOOP}s" repeatCount="indefinite"/></rect></clipPath>
    <clipPath id="typeClip2"><rect x="${x0}" y="${py + 68}" width="0" height="26"><animate attributeName="width" values="0;0;${w2};${w2};0" keyTimes="0;${kt(1.7)};${kt(2.6)};${sceneEnd};1" dur="${LOOP}s" repeatCount="indefinite"/></rect></clipPath>
    <g clip-path="url(#typeClip1)">${text(x0, py + 62, line1, { size: 16, weight: 500 })}</g>
    <g clip-path="url(#typeClip2)">${text(x0, py + 86, line2, { size: 16, weight: 500 })}</g>
    <rect x="${x0}" y="${py + 48}" width="2" height="18" fill="${C.primaryHi}">
      <animate attributeName="x" values="${x0};${x0};${x0 + w1};${x0};${x0 + w2};${x0 + w2};${x0}" keyTimes="0;${kt(0.7)};${kt(1.7)};${kt(1.7)};${kt(2.6)};${sceneEnd};1" dur="${LOOP}s" repeatCount="indefinite"/>
      <animate attributeName="y" values="${py + 48};${py + 48};${py + 72};${py + 72};${py + 48}" keyTimes="0;${kt(1.7)};${kt(1.7)};${sceneEnd};1" dur="${LOOP}s" repeatCount="indefinite"/>
    </rect>
  </g>`

  // Synthase / mlcl badge under the prompt.
  const badgeK = show(s + 2.7, s + SCENE)
  const b1 = chip(px, 352, 'Synthase  ·  the agent in the molecule.dev IDE', {
    dot: C.pink,
    size: 13,
  })
  const b2 = chip(px, 392, 'npx mlcl create  ·  the CLI / MCP server', {
    dot: C.cyan,
    size: 13,
    mono: true,
  })
  scene1 += `<g ${A(badgeK)}>${b1.svg}${b2.svg}${text(px, 458, 'Either one reads the packages’ generated docs, picks the', { size: 13, color: C.muted })}${text(px, 478, 'right ones, and wires them — same rules as hand-written code.', { size: 13, color: C.muted })}</g>`

  // Catalog column (faint rows) at the middle.
  const catX = 520
  const catK = show(s + 0.4, s + SCENE, { from: 'translateX(-8px)' })
  let cat = `<g ${A(catK)}>${text(catX, 212, '@molecule/*  ·  959 packages', { size: 12, weight: 700, color: C.faint })}`
  for (let i = 0; i < 11; i++) {
    cat += `<rect x="${catX}" y="${226 + i * 30}" width="${90 + ((i * 37) % 60)}" height="16" rx="5" fill="${C.card}" stroke="${C.border}"/>`
  }
  cat += `</g>`
  scene1 += cat

  // Molecule graph: center + ring of package nodes flying in from the catalog.
  const cx = 930
  const cy = 420
  const r = 165
  const nodes = [
    ['api-database', C.primaryHi],
    ['api-auth', C.green],
    ['api-payments', C.amber],
    ['app-react', C.cyan],
    ['app-i18n', C.violet],
    ['app-analytics', C.pink],
    ['api-emails', C.primaryHi],
    ['app-react-native', C.green],
  ]
  const centerK = show(s + 2.9, s + SCENE, { from: 'scale(0.6)', fadeIn: 0.5 })
  scene1 += `<g style="transform-box:fill-box;transform-origin:center;animation:${centerK} ${LOOP}s linear infinite"><circle cx="${cx}" cy="${cy}" r="40" fill="${C.cardHi}" stroke="${C.primaryHi}" stroke-width="2"/>${text(cx, cy - 2, 'your', { size: 13, weight: 700, anchor: 'middle' })}${text(cx, cy + 14, 'app', { size: 13, weight: 700, anchor: 'middle' })}</g>`
  nodes.forEach(([label, color], i) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / nodes.length
    const nx = cx + Math.cos(ang) * r
    const ny = cy + Math.sin(ang) * r
    const t0 = s + 3.1 + i * 0.28
    const c = chip(nx, ny - 15, label, { dot: color, anchor: 'middle', mono: true, size: 12 })
    // Fly in from the catalog column row i.
    const fromX = catX + 40 - c.left - c.w / 2
    const fromY = 234 + i * 30 - ny
    const k = show(t0, s + SCENE, {
      from: `translate(${fromX.toFixed(0)}px, ${fromY.toFixed(0)}px) scale(0.7)`,
      fadeIn: 0.5,
    })
    // Bond line to the center, drawn after the node lands.
    const len = Math.hypot(nx - cx, ny - cy)
    const ux = (cx - nx) / len
    const uy = (cy - ny) / len
    const lx1 = nx + ux * (c.w / 2 - 6)
    const ly1 = ny + uy * 15
    const lx2 = cx - ux * 40
    const ly2 = cy - uy * 40
    const d = draw(t0 + 0.45, s + SCENE, Math.hypot(lx2 - lx1, ly2 - ly1), { dur: 0.35 })
    scene1 += `<line x1="${lx1.toFixed(1)}" y1="${ly1.toFixed(1)}" x2="${lx2.toFixed(1)}" y2="${ly2.toFixed(1)}" stroke="${color}" stroke-width="2" stroke-opacity="0.75" stroke-dasharray="${d.len.toFixed(1)}" ${A(d.name)}/>`
    scene1 += `<g style="transform-box:fill-box;transform-origin:center;animation:${k} ${LOOP}s linear infinite">${c.svg}</g>`
  })
  const doneK = show(s + 5.3, s + SCENE, { fadeIn: 0.3 })
  scene1 += `<g ${A(doneK)}>${chip(cx, cy + r + 44, 'Express API  +  React app  ·  compiles, tests pass, live preview', { dot: C.green, anchor: 'middle', size: 12 }).svg}</g>`
}

// =============================================================== SCENE 2
// Bonds
let scene2 = caption(
  1,
  'Swap the provider, not the app.',
  'Every capability is a core interface plus swappable bonds. Application code never touches a vendor SDK.',
)
{
  const s = SCENE
  // Left: application code that never changes.
  const codeK = show(s + 0.2, s + SCENE, { from: 'translateY(12px)' })
  const cx0 = 60
  const cy0 = 205
  const lines = [
    ['// application code', C.faint],
    [`import { findMany } from '@molecule/api-database'`, C.text],
    ['', C.text],
    [`const users = await findMany('users', {`, C.text],
    [`  where: { plan: 'pro' },`, C.text],
    [`})`, C.text],
  ]
  scene2 += `<g ${A(codeK)}><rect x="${cx0}" y="${cy0}" width="560" height="190" rx="14" fill="${C.card}" stroke="${C.border}"/>`
  lines.forEach(([l, col], i) => {
    scene2 += text(cx0 + 24, cy0 + 40 + i * 24, l, { size: 14, mono: true, color: col })
  })
  const unchanged = chip(cx0 + 560 - 14, cy0 - 15, 'unchanged', {
    dot: C.green,
    size: 12,
    weight: 700,
    fill: C.cardHi,
    stroke: C.green,
    color: C.green,
  })
  scene2 += `<g transform="translate(${-unchanged.w} 0)">${unchanged.svg}</g></g>`

  // Left, below: bonds.ts with the provider import swapping.
  const bondsK = show(s + 0.6, s + SCENE, { from: 'translateY(12px)' })
  const by = 414
  scene2 += `<g ${A(bondsK)}><rect x="${cx0}" y="${by}" width="560" height="136" rx="14" fill="${C.card}" stroke="${C.border}"/>${text(cx0 + 24, by + 34, '// bonds.ts — the one wiring file', { size: 14, mono: true, color: C.faint })}${text(cx0 + 24, by + 60, `import { pool, store } from`, { size: 14, mono: true })}${text(cx0 + 24, by + 108, `setPool(pool); setStore(store)`, { size: 14, mono: true })}</g>`

  // Right: the socket and provider chips snapping in.
  const providers = [
    ['postgresql', 'PostgreSQL', C.primaryHi],
    ['mysql', 'MySQL', C.amber],
    ['sqlite', 'SQLite', C.green],
    ['d1', 'Cloudflare D1', C.cyan],
  ]
  const sx = 700
  const sy = 205
  const coreK = show(s + 0.4, s + SCENE, { from: 'translateY(12px)' })
  scene2 += `<g ${A(coreK)}><rect x="${sx}" y="${sy}" width="440" height="92" rx="14" fill="${C.cardHi}" stroke="${C.primaryHi}" stroke-width="1.5"/>${text(sx + 24, sy + 34, 'core interface', { size: 12, weight: 700, color: C.faint })}${text(sx + 24, sy + 62, '@molecule/api-database', { size: 17, weight: 700, mono: true })}${text(sx + 416, sy + 62, 'findMany · create · updateById …', { size: 12, color: C.muted, anchor: 'end' })}
    <path d="M${sx + 200} ${sy + 92} v22 h40 v-22" fill="none" stroke="${C.primaryHi}" stroke-width="1.5" stroke-dasharray="4 4"/>
    ${text(sx + 24, sy + 128, 'bond (provider)', { size: 12, weight: 700, color: C.faint })}
    <rect x="${sx}" y="${sy + 140}" width="440" height="60" rx="14" fill="none" stroke="${C.border}" stroke-dasharray="6 5"/>
  </g>`
  const slot = 1.2
  providers.forEach(([id, label, color], i) => {
    const t0 = s + 1.0 + i * slot
    const t1 = i === providers.length - 1 ? s + SCENE : t0 + slot
    const k = show(t0, t1, { from: 'translateX(48px)', fadeIn: 0.35, fadeOut: 0.25 })
    const c = chip(sx + 24, sy + 155, `@molecule/api-database-${id}`, {
      dot: color,
      mono: true,
      size: 13,
      fill: C.card,
      stroke: color,
    })
    scene2 += `<g ${A(k)}>${c.svg}${text(sx + 416, sy + 175, label, { size: 13, weight: 600, color, anchor: 'end' })}`
    // Matching import suffix in bonds.ts.
    scene2 += text(cx0 + 24, by + 84, `  '@molecule/api-database-${id}'`, {
      size: 14,
      mono: true,
      color,
    })
    scene2 += `</g>`
  })

  // Right, below: the same pattern across categories.
  const catsK = show(s + 1.6, s + SCENE, { from: 'translateY(10px)' })
  const cats = [
    'auth',
    'payments',
    'emails',
    'ai',
    'analytics',
    'realtime',
    'uploads',
    'search',
    'queue',
    'sms',
    'i18n',
    'logger',
  ]
  let row = `<g ${A(catsK)}>${text(sx, sy + 245, 'Same pattern for 80+ categories', { size: 13, weight: 700, color: C.muted })}`
  let xx = sx
  let yy = sy + 262
  cats.forEach((c) => {
    if (xx + tw(c, 12) + 28 > sx + 440) {
      xx = sx
      yy += 38
    }
    const ch2 = chip(xx, yy, c, { size: 12, mono: true, color: C.muted })
    row += ch2.svg
    xx += ch2.w + 8
  })
  row += text(sx, yy + 58, 'Frameworks swap the same way: React, Vue, Svelte, Solid, Angular,', {
    size: 13,
    color: C.muted,
  })
  row += text(sx, yy + 78, 'React Native — one interface layer, native idioms underneath.', {
    size: 13,
    color: C.muted,
  })
  row += `</g>`
  scene2 += row
}

// =============================================================== SCENE 3
// Built in by default
let scene3 = caption(
  2,
  'The last 10% ships on day one.',
  'Every real app needs the same integrations. Molecule wires tested packages for them instead of regenerating them.',
)
{
  const s = 2 * SCENE
  const tiles = [
    ['Auth & OAuth', C.green],
    ['Payments & billing', C.amber],
    ['Database & migrations', C.primaryHi],
    ['i18n · 80 languages', C.violet],
    ['Analytics & telemetry', C.pink],
    ['Logging & monitoring', C.cyan],
    ['Error tracking', C.amber],
    ['Realtime', C.green],
    ['Uploads & media', C.primaryHi],
    ['Push notifications', C.pink],
    ['Search', C.cyan],
    ['Feature flags', C.violet],
    ['Tests: unit, E2E', C.green],
    ['CI/CD & deploys', C.primaryHi],
    ['Accessibility (a11y)', C.amber],
    ['AGENTS.md for AI agents', C.pink],
  ]
  const cols = 4
  const tw0 = 258
  const th = 76
  const gx = 60
  const gy = 200
  tiles.forEach(([label, color], i) => {
    const col = i % cols
    const rowI = Math.floor(i / cols)
    const x = gx + col * (tw0 + 16)
    const y = gy + rowI * (th + 14)
    const t0 = s + 0.3 + i * 0.16
    const k = show(t0, s + SCENE, { from: 'translateY(8px) scale(0.96)', fadeIn: 0.35 })
    const checkK = show(t0 + 0.35, s + SCENE, { from: 'scale(0.4)', fadeIn: 0.25 })
    scene3 += `<g style="transform-box:fill-box;transform-origin:center;animation:${k} ${LOOP}s linear infinite"><rect x="${x}" y="${y}" width="${tw0}" height="${th}" rx="12" fill="${C.card}" stroke="${C.border}"/><rect x="${x}" y="${y + 18}" width="4" height="${th - 36}" rx="2" fill="${color}"/>${text(x + 22, y + 44, label, { size: 15, weight: 600 })}<g style="transform-box:fill-box;transform-origin:center;animation:${checkK} ${LOOP}s linear infinite"><circle cx="${x + tw0 - 24}" cy="${y + th / 2}" r="10" fill="${C.green}" fill-opacity="0.18" stroke="${C.green}"/><path d="M${x + tw0 - 29} ${y + th / 2} l3.5 3.5 l6.5 -7" fill="none" stroke="${C.green}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g></g>`
  })
  const noteK = show(s + 3.4, s + SCENE)
  scene3 += `<g ${A(noteK)}>${text(60, 588, 'Generated from each package’s source JSDoc, every README is machine-readable — so an agent wires it right the first time, and the docs cannot drift from the code.', { size: 13, color: C.muted })}</g>`
}

// =============================================================== SCENE 4
// Verify loop
let scene4 = caption(
  3,
  'Verified before it reaches you. Then it learns.',
  'Generated code is type-checked, linted and tested; errors go straight back to the agent. Failure patterns feed the packages and prompts.',
)
{
  const s = 3 * SCENE
  // Inner loop: per build.
  const lcx = 268
  const lcy = 420
  const lr = 118
  const steps = [
    ['Synthase writes', C.pink],
    ['type-check · lint · tests', C.primaryHi],
    ['errors fed back', C.amber],
    ['agent fixes', C.green],
  ]
  const ringK = show(s + 0.2, s + SCENE, { from: 'scale(0.9)', fadeIn: 0.5 })
  scene4 += `<g style="transform-box:fill-box;transform-origin:center;animation:${ringK} ${LOOP}s linear infinite">`
  scene4 += `<circle cx="${lcx}" cy="${lcy}" r="${lr}" fill="none" stroke="${C.border}" stroke-width="2"/>`
  // Arrowheads along the ring, clockwise.
  for (let i = 0; i < 4; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 2
    const ax = lcx + Math.cos(ang) * lr
    const ay = lcy + Math.sin(ang) * lr
    const rot = ((ang + Math.PI / 2) * 180) / Math.PI
    scene4 += `<path d="M-6 -5 L4 0 L-6 5" fill="none" stroke="${C.muted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(${ax.toFixed(1)} ${ay.toFixed(1)}) rotate(${rot.toFixed(1)})"/>`
  }
  steps.forEach(([label, color], i) => {
    const ang = (-3 * Math.PI) / 4 + (i * Math.PI) / 2
    const nx = lcx + Math.cos(ang) * lr
    const ny = lcy + Math.sin(ang) * lr
    const c0 = chip(nx, ny - 15, label, {
      dot: color,
      anchor: 'middle',
      size: 13,
      weight: 600,
      stroke: color,
    })
    const outward = (Math.cos(ang) > 0 ? 1 : -1) * (c0.w / 2 - 30)
    scene4 += chip(nx + outward, ny - 15, label, {
      dot: color,
      anchor: 'middle',
      size: 13,
      weight: 600,
      stroke: color,
    }).svg
  })
  scene4 += text(lcx, lcy - 6, 'every build', {
    size: 13,
    weight: 700,
    anchor: 'middle',
    color: C.muted,
  })
  scene4 += text(lcx, lcy + 14, 'until green', {
    size: 13,
    weight: 700,
    anchor: 'middle',
    color: C.muted,
  })
  scene4 += `</g>`
  // Travelling dot around the inner loop.
  const spin = `r${++idCounter}`
  keyframes.push(
    `@keyframes ${spin}{0%{opacity:0;transform:rotate(0deg)}${pct(s + 0.6)}%{opacity:0;transform:rotate(0deg)}${pct(s + 0.9)}%{opacity:1}${pct(s + SCENE - 0.3)}%{opacity:1;transform:rotate(720deg)}${pct(s + SCENE)}%{opacity:0;transform:rotate(720deg)}100%{opacity:0;transform:rotate(720deg)}}`,
  )
  scene4 += `<g style="transform-box:view-box;transform-origin:${lcx}px ${lcy}px;animation:${spin} ${LOOP}s linear infinite"><circle cx="${lcx}" cy="${lcy - lr}" r="7" fill="${C.primaryHi}"/><circle cx="${lcx}" cy="${lcy - lr}" r="13" fill="${C.primaryHi}" fill-opacity="0.25"/></g>`

  // Outer loop: across builds.
  const ox = 600
  const oy = 200
  const rowsK = [
    show(s + 1.4, s + SCENE),
    show(s + 2.2, s + SCENE),
    show(s + 3.0, s + SCENE),
    show(s + 3.8, s + SCENE),
  ]
  const outer = [
    ['Past conversations & builds', 'every failure pattern is a signal', C.muted],
    ['Refine pipeline', 'extract → classify → review → propose', C.violet],
    ['Prompts, skills & packages improve', 'the fix lands once, in a shared package', C.green],
    ['Every project benefits', 'new builds start where the last one learned', C.primaryHi],
  ]
  outer.forEach(([title, sub, color], i) => {
    const y = oy + i * 96
    scene4 += `<g ${A(rowsK[i])}><rect x="${ox}" y="${y}" width="540" height="72" rx="12" fill="${C.card}" stroke="${C.border}"/><rect x="${ox}" y="${y + 16}" width="4" height="40" rx="2" fill="${color}"/>${text(ox + 24, y + 31, title, { size: 15, weight: 700 })}${text(ox + 24, y + 54, sub, { size: 13, color: C.muted })}`
    if (i < outer.length - 1) {
      scene4 += `<path d="M${ox + 270} ${y + 72} v14 M${ox + 265} ${y + 81} l5 6 l5 -6" fill="none" stroke="${C.muted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
    }
    scene4 += `</g>`
  })
  // Return arrow from the last row back to the first.
  const backLen = 96 * 3 + 72 + 40
  const back = draw(s + 4.4, s + SCENE, backLen, { dur: 0.6 })
  scene4 += `<path d="M${ox + 540} ${oy + 96 * 3 + 36} h24 v-${96 * 3} h-24" fill="none" stroke="${C.green}" stroke-width="2" stroke-dasharray="${backLen}" ${A(back.name)}/>`
  const backHeadK = show(s + 5.0, s + SCENE, { fadeIn: 0.2 })
  scene4 += `<path d="M${ox + 548} ${oy + 30} l-8 6 l8 6" fill="none" stroke="${C.green}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${A(backHeadK)}/>`
  scene4 += `<g ${A(rowsK[0])}>${text(ox, oy - 14, 'across builds', { size: 12, weight: 700, color: C.faint })}</g>`
}

// =============================================================== SCENE 5
// Outcomes
let scene5 = caption(
  4,
  'Why it pays off.',
  'Full-stack, cross-platform apps built for the AI era — with the operational layer already in place.',
)
{
  const s = 4 * SCENE
  const cards = [
    [
      'Faster',
      'Start from a working, tested app. 150 templates, 959 packages, live preview in the sandbox.',
      C.primaryHi,
    ],
    [
      'Cheaper',
      'Nothing is regenerated. Strict interfaces and generated docs let an agent wire a package in one pass.',
      C.green,
    ],
    [
      'Higher quality',
      'Type-checked, linted and tested before handoff. Tests ship with the project, not as an afterthought.',
      C.amber,
    ],
    [
      'Easier to maintain\n& scale',
      'Change a bond, not the app. Same architecture for a side project and an enterprise.',
      C.violet,
    ],
  ]
  const cw = 258
  const chh = 214
  cards.forEach(([title, body, color], i) => {
    const x = 60 + i * (cw + 16)
    const y = 200
    const k = show(s + 0.3 + i * 0.35, s + SCENE, {
      from: 'translateY(14px)',
      fadeIn: 0.45,
      fadeOut: 0.3,
    })
    // Wrap the body at ~36 chars.
    const words = body.split(' ')
    const wrapped = []
    let cur = ''
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > 34) {
        wrapped.push(cur.trim())
        cur = w
      } else cur += ' ' + w
    }
    if (cur.trim()) wrapped.push(cur.trim())
    scene5 += `<g ${A(k)}><rect x="${x}" y="${y}" width="${cw}" height="${chh}" rx="14" fill="${C.card}" stroke="${C.border}"/><rect x="${x + 22}" y="${y + 22}" width="36" height="5" rx="2.5" fill="${color}"/>${title
      .split('\n')
      .map((t, ti) => text(x + 22, y + 60 + ti * 24, t, { size: 20, weight: 700 }))
      .join('')}`
    const bodyY = y + 92 + (title.includes('\n') ? 24 : 0)
    wrapped.forEach((l, li) => {
      scene5 += text(x + 22, bodyY + li * 20, l, { size: 13, color: C.muted })
    })
    scene5 += `</g>`
  })
  // Platforms row.
  const platK = show(s + 2.2, s + SCENE, { fadeOut: 0.3 })
  const py = 450
  scene5 += `<g ${A(platK)}>${text(60, py, 'Cross-platform from one codebase', { size: 13, weight: 700, color: C.muted })}`
  const plats = [
    ['Web', 'React · Vue · Svelte · Solid · Angular', C.cyan],
    ['Mobile', 'React Native + native device bonds', C.green],
    ['API', 'Express, any database, any host', C.primaryHi],
  ]
  plats.forEach(([t, sub, color], i) => {
    const x = 60 + i * 366
    scene5 += `<rect x="${x}" y="${py + 14}" width="350" height="64" rx="12" fill="${C.card}" stroke="${C.border}"/><rect x="${x}" y="${py + 28}" width="4" height="36" rx="2" fill="${color}"/>${text(x + 22, py + 40, t, { size: 14, weight: 700 })}${text(x + 22, py + 62, sub, { size: 13, color: C.muted })}`
  })
  scene5 += `</g>`
  // Closing line.
  const closeK = show(s + 3.2, s + SCENE, { fadeOut: 0.3 })
  scene5 += `<g ${A(closeK)}>${text(60, 572, 'Plain TypeScript you own. Export the code, the database and your keys at any time.', { size: 15, weight: 600 })}${text(60, 598, 'Apache-2.0 packages on npm  ·  no lock-in  ·  works with any AI agent, editor or CI.', { size: 14, color: C.muted })}${text(1140, 598, 'www.molecule.dev', { size: 14, weight: 700, color: C.primaryHi, anchor: 'end' })}</g>`
}

// =================================================================== emit
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700" width="1200" height="700" role="img" aria-labelledby="t d" font-family="${SANS}">
<title id="t">How Molecule works</title>
<desc id="d">Describe an app; Synthase or the mlcl CLI composes it from 950+ open-source @molecule packages. Every provider sits behind a swappable bond, so the app never changes when a provider does. Auth, payments, i18n, analytics, monitoring, realtime, tests and CI are built in by default. Generated code is type-checked, linted and tested, with errors fed back until green, and failure patterns improve the shared packages. The result: faster, cheaper, higher-quality full-stack, cross-platform apps that are easier to maintain and scale.</desc>
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.bg0}"/><stop offset="1" stop-color="${C.bg1}"/></linearGradient>
  <radialGradient id="glow" cx="0.8" cy="0.1" r="0.7"><stop offset="0" stop-color="${C.primary}" stop-opacity="0.22"/><stop offset="1" stop-color="${C.primary}" stop-opacity="0"/></radialGradient>
</defs>
<style>
  text{font-family:${SANS}}
  ${keyframes.join('\n  ')}
  @media (prefers-reduced-motion: reduce){ *{animation:none !important} #scene-1,#scene-2,#scene-3,#scene-4{display:none} }
</style>
<rect width="1200" height="700" rx="20" fill="url(#bg)"/>
<rect width="1200" height="700" rx="20" fill="url(#glow)"/>
<rect x="0.5" y="0.5" width="1199" height="699" rx="20" fill="none" stroke="${C.border}"/>
${header}
${footer}
<g id="scene-1">${scene1}</g>
<g id="scene-2">${scene2}</g>
<g id="scene-3">${scene3}</g>
<g id="scene-4">${scene4}</g>
<g id="scene-5">${scene5}</g>
</svg>
`

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, svg)
console.log(
  `wrote ${OUT} (${(svg.length / 1024).toFixed(1)} KB, ${keyframes.length} keyframe blocks)`,
)
