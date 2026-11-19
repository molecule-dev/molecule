/**
 * The pages' record of the location they read when they were created: React's
 * `provider-lifecycle` case pushes the path its state initializer read, and a SvelteKit
 * page reads its router at the same moment (component initialisation). The list lives on
 * `window` because `startKit` resets the module registry before each app starts.
 *
 * @module
 */

declare global {
  interface Window {
    /** The paths the pages read when they were created, oldest first. */
    __moleculeLifecyclePaths?: string[]
  }
}

/**
 * Records one page's first read of the location.
 *
 * @param pathname - The in-app pathname the page read.
 */
export const recordFirstRender = (pathname: string): void => {
  const paths = window.__moleculeLifecyclePaths ?? []
  paths.push(pathname)
  window.__moleculeLifecyclePaths = paths
}

/**
 * Every path a page recorded, oldest first.
 *
 * @returns The recorded paths.
 */
export const firstRenderPaths = (): string[] => window.__moleculeLifecyclePaths ?? []

/** Forgets every recorded path. */
export const clearFirstRenderPaths = (): void => {
  window.__moleculeLifecyclePaths = []
}
