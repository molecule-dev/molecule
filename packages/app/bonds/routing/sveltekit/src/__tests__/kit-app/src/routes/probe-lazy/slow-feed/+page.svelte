<script lang="ts">
  import { resolve } from '$app/paths'
</script>

<main>
  <h1>Feed</h1>
  <h1>First article</h1>
  <h1>Second article</h1>
  <a href={resolve('/probe-lazy/slow-article/[slug]', { slug: 'first' })}>Open first</a>
</main>
