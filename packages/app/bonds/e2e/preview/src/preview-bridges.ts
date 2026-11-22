/**
 * Keeps the molecule.dev IDE's live-preview bridges out of production builds.
 *
 * The bridges (`mol:preview-bridge`, `mol:nav-bridge`, `mol:snapshot-bridge`, `mol:runtime-bridge`,
 * `mol:interact-bridge`) exist only so the IDE, which frames the Vite DEV server, can drive its
 * preview overlay. Each posts to `window.parent` with a wildcard target origin: the navigated URL,
 * a JPEG of the rendered page, the app's stack traces, and the interact bridge accepts commands
 * that click and fill the page. A deployed build can be framed by any page, so none of it may
 * ship. A project scaffolded with `mlcl create --ide-preview` carries their script files in
 * `public/__mol/bridges/` and one tag per bridge in `index.html`; every other project has none,
 * and these plugins then change nothing.
 *
 * The strip follows the naming convention, not a list: every bridge is `mol:<name>-bridge` (or
 * `-shim`), injected as a `:start`/`:end` region or as a sentinel comment directly followed by one
 * inline `<script>`. A literal list fell behind once, and `mol:runtime-bridge` and
 * `mol:interact-bridge` shipped in production builds fleet-wide. A `<script>` whose `src` points
 * into `/__mol/` is removed wherever it sits: an edit once separated a tag from its sentinel, the
 * tag survived, and the deployed page loaded the SPA fallback as JavaScript. Markers that are not
 * preview plumbing (`mol:fonts`, `mol:design-resources`) never match.
 *
 * @module
 */

import { type Dirent, readdirSync, readFileSync, rmSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import type { Plugin } from 'vite'

/** A molecule preview-plumbing sentinel name: `mol:<name>-bridge` / `-shim`. */
const SENTINEL = String.raw`mol:[a-z0-9]+(?:-[a-z0-9]+)*-(?:bridge|shim)`

/** `<!-- mol:x-bridge:start -->` … `<!-- mol:x-bridge:end -->`, inclusive. */
const DELIMITED_REGION = new RegExp(
  String.raw`[ \t]*<!--\s*(${SENTINEL}):start\s*-->[\s\S]*?<!--\s*\1:end\s*-->[ \t]*\n?`,
  'g',
)

/**
 * `<!-- mol:x-bridge -->` plus the single INLINE `<script>` (no `src`) that follows it directly,
 * the older bridge form. A following `<script src>` is left to {@link BRIDGE_SCRIPT}, so a
 * sentinel never consumes a tag it does not describe.
 */
const SENTINEL_INLINE_SCRIPT = new RegExp(
  String.raw`[ \t]*<!--\s*${SENTINEL}\s*-->\s*<script\b(?![^>]*\bsrc\s*=)[^>]*>[\s\S]*?<\/script>[ \t]*\n?`,
  'g',
)

/**
 * Any `<script>` whose `src` resolves under the platform-owned `__mol` tree, wherever it sits.
 * The test covers the whole directory, not only `bridges`, because {@link dropBridgeAssets}
 * deletes the whole directory.
 */
const BRIDGE_SCRIPT = new RegExp(
  String.raw`[ \t]*<script\b[^>]*\bsrc\s*=\s*["'](?:[^"']*\/)?__mol\/[^"']*["'][^>]*>[\s\S]*?<\/script>[ \t]*\n?`,
  'gi',
)

/** A bridge sentinel comment left without a script (or after both were removed). */
const SENTINEL_COMMENT = new RegExp(String.raw`[ \t]*<!--\s*${SENTINEL}\s*-->[ \t]*\n?`, 'g')

/** Where `index.html` finds the bridge scripts, and where Vite copies them from. */
const BRIDGE_ASSET_DIR = '__mol'

/** The URL prefix whose references must never survive into production HTML. */
const BRIDGE_URL_MARKER = '/__mol/'

/**
 * Remove every molecule preview bridge from an HTML document: delimited regions, then sentinel +
 * inline-script pairs, then every script that points into `/__mol/`, then leftover sentinels.
 *
 * @param html - The document to strip.
 * @returns The document with every bridge region and bridge script removed.
 */
export const stripPreviewBridges = (html: string): string =>
  html
    .replace(DELIMITED_REGION, '')
    .replace(SENTINEL_INLINE_SCRIPT, '')
    .replace(BRIDGE_SCRIPT, '')
    .replace(SENTINEL_COMMENT, '')

/**
 * Delete the bridge scripts from a build output. Vite copies `public/` wholesale, after the tags
 * that loaded them were stripped, so without this a deploy ships about 59 KB of unreachable
 * bridge scripts.
 *
 * @param outDir - Absolute path to the build output directory.
 */
export const dropBridgeAssets = (outDir: string): void => {
  rmSync(join(outDir, BRIDGE_ASSET_DIR), { recursive: true, force: true })
}

/**
 * Fail when an emitted HTML document still points into `/__mol/`. The tree is deleted from the
 * output, so such a URL returns the SPA fallback, which the browser parses as JavaScript.
 *
 * @param outDir - Absolute path to the build output directory.
 * @throws {Error} Naming every emitted `.html` file that still references `/__mol/`.
 */
export const assertNoBridgeReferences = (outDir: string): void => {
  const offenders: string[] = []
  const walk = (dir: string): void => {
    let entries: Dirent[]
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch (_error) {
      // The output directory does not exist: nothing was emitted to check.
      return
    }
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (
        /\.html?$/i.test(entry.name) &&
        readFileSync(full, 'utf8').includes(BRIDGE_URL_MARKER)
      )
        offenders.push(relative(outDir, full))
    }
  }
  walk(outDir)
  if (offenders.length > 0) {
    throw new Error(
      `Production HTML still references /__mol/ (${offenders.join(', ')}). The bridge scripts ` +
        'are deleted from the build output, so these URLs would return the SPA fallback and be ' +
        'parsed as JavaScript. stripPreviewBridges must remove every bridge script and sentinel.',
    )
  }
}

/**
 * The three build-only plugins: strip the bridges from the emitted HTML, fail the build if a
 * reference survives, and delete the bridge scripts from the output. Each call returns new
 * plugin instances, which share the resolved output directory between them.
 *
 * @returns The plugins, for `plugins: [...]` (Vite flattens nested arrays).
 */
export const previewBridgeBuildPlugins = (): Plugin[] => {
  let outDir = 'dist'
  const captureOutDir: Plugin['configResolved'] = (config) => {
    outDir = resolve(config.root, config.build.outDir)
  }
  return [
    {
      name: 'molecule-strip-preview-bridge',
      apply: 'build',
      transformIndexHtml: { order: 'pre', handler: (html: string) => stripPreviewBridges(html) },
    },
    {
      name: 'molecule-assert-no-bridge-references',
      apply: 'build',
      configResolved: captureOutDir,
      writeBundle: () => assertNoBridgeReferences(outDir),
    },
    {
      name: 'molecule-drop-preview-bridge-assets',
      apply: 'build',
      configResolved: captureOutDir,
      closeBundle: () => dropBridgeAssets(outDir),
    },
  ]
}
