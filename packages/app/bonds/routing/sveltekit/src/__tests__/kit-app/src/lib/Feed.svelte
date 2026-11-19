<script lang="ts">
  import { resolve } from '$app/paths'

  import type { EmptyPageProps } from './page-props.js'

  // A page that declares no props (React's `function Feed(): JSX.Element`).
  const props: EmptyPageProps = $props()
  // Read inside a closure: the declaration is the assertion, not a rendered value.
  $effect(() => {
    void props
  })
</script>

<main>
  <h1>Feed</h1>
  <h1>First article</h1>
  <h1>Second article</h1>
  <a href={resolve('/probe-lazy/article/[slug]', { slug: 'first' })}>Open first</a>
</main>
