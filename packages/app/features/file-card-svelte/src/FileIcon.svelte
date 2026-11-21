<!--
  FileIcon: the Svelte counterpart of `@molecule/app-file-card-react`'s
  `FileIcon` — a stroke-currentColor SVG glyph keyed by `FileKind`. Same
  props, same DOM for the same input.
-->
<script lang="ts">
  import type { FileIconProps } from './types.js'

  let { kind, size = 24, ariaLabel }: FileIconProps = $props()
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.75"
  stroke-linecap="round"
  stroke-linejoin="round"
  role={ariaLabel ? 'img' : undefined}
  aria-label={ariaLabel}
  aria-hidden={ariaLabel ? undefined : true}
  data-mol-id="file-icon-{kind}"
>
  {#if kind === 'image'}<rect x="3" y="5" width="18" height="14" rx="2" /><circle
      cx="8.5"
      cy="10.5"
      r="1.5"
    /><path d="m21 15-5-5L5 21" />{:else if kind === 'video'}<rect
      x="3"
      y="5"
      width="18"
      height="14"
      rx="2"
    /><path d="m10 9 5 3-5 3z" fill="currentColor" />{:else if kind === 'audio'}<path
      d="M9 18V5l12-2v13"
    /><circle cx="6" cy="18" r="3" /><circle
      cx="18"
      cy="16"
      r="3"
    />{:else if kind === 'document'}<path
      d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"
    /><path d="M14 3v6h6" />{:else if kind === 'archive'}<rect
      x="3"
      y="3"
      width="18"
      height="6"
      rx="1"
    /><path d="M3 9v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9" /><path
      d="M10 13h4"
    />{:else if kind === 'code'}<path d="m9 8-5 4 5 4" /><path d="m15 8 5 4-5 4" /><path
      d="m13 5-2 14"
    />{:else if kind === 'folder'}<path
      d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
    />{:else}<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path
      d="M14 3v6h6"
    /><path d="M9 14h6" /><path d="M9 17h4" />{/if}
</svg>
