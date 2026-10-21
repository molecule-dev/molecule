import type { AITool } from '@molecule/api-ai'

/** Options for exposing a small tool set while retaining access to other allowed tools. */
export interface DeferredToolCatalogOptions {
  /** The caller's current permission/mode-filtered tools. Discovery never grants access. */
  available: () => readonly AITool[]
  /** Tools that should be offered without a discovery call. */
  initialNames: ReadonlySet<string>
  /** Previously loaded names, in load order; useful across turns and compaction. */
  loadedNames?: readonly string[]
  /** Persist names after a successful load. No tool content is passed to this callback. */
  onLoad?: (names: string[]) => void
}

/** A provider-independent deferred catalog. The caller still executes and authorizes tools. */
export interface DeferredToolCatalog {
  loader: AITool
  /** Initial tools, loader, then requested tools in stable load order. */
  select: () => AITool[]
}

/**
 * Offer common tools and let the model load other schemas by exact name.
 *
 * This is ordinary allowlist selection, not semantic routing or authorization.
 * Pass tools already filtered by the current mode and permissions. Loading never
 * executes a tool; the caller must keep its normal execution-time guards. Loaded
 * schemas append in request order and stay available, avoiding an LRU that changes
 * the schema prefix on every request. Only names need persistence across turns.
 *
 * @param options - Allowed tools, initial selection and optional durable load state.
 * @returns A loader tool and the current provider-facing selection.
 */
export function createDeferredToolCatalog(
  options: DeferredToolCatalogOptions,
): DeferredToolCatalog {
  const loaded = new Set(options.loadedNames)
  const available = (): readonly AITool[] =>
    options.available().filter((tool) => tool.name !== 'load_tools')
  const loader: AITool = {
    name: 'load_tools',
    get description() {
      const deferred = available().filter((tool) => !options.initialNames.has(tool.name))
      return (
        'Load additional tools by exact name before calling them. Loading only exposes their ' +
        'schemas; it does not run them. They remain available for later requests. Other tools: ' +
        deferred
          .map(
            (tool) =>
              `${tool.name}: ${tool.description.split(/\n|(?<=[.!?])\s/)[0]!.slice(0, 160)}`,
          )
          .join('; ')
      )
    },
    parameters: {
      type: 'object',
      properties: {
        names: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          description: 'Exact tool names to load together, for example ["git_push", "git_pull"].',
        },
      },
      required: ['names'],
    },
    async execute(input) {
      const names = (input as { names?: unknown } | null)?.names
      if (
        !Array.isArray(names) ||
        names.length === 0 ||
        names.some((name) => typeof name !== 'string')
      ) {
        return { error: 'names must be a nonempty array of exact tool names. Nothing was loaded.' }
      }
      const permitted = new Set(available().map((tool) => tool.name))
      const refused = names.filter((name) => !permitted.has(name))
      if (refused.length > 0) {
        return {
          error: `Tools unavailable in the current mode: ${refused.join(', ')}. Nothing was loaded.`,
        }
      }
      for (const name of names) loaded.add(name)
      options.onLoad?.([...loaded])
      return {
        loaded: [...new Set(names)],
        message: 'Schemas loaded. Call these tools with their declared arguments.',
      }
    },
  }
  return {
    loader,
    select() {
      const tools = available()
      const byName = new Map(tools.map((tool) => [tool.name, tool]))
      return [
        ...tools.filter((tool) => options.initialNames.has(tool.name)),
        loader,
        ...[...loaded].flatMap((name) => {
          const tool = byName.get(name)
          return tool && !options.initialNames.has(name) ? [tool] : []
        }),
      ]
    },
  }
}
