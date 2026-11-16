<script lang="ts">
  import ColorPicker from '../ColorPicker.svelte'

  let color = $state('#000000')
</script>

<div>
  <button onclick={() => (color = '#ff00ff')}>set</button>
  <ColorPicker value={color} onChange={(next) => (color = next)} />
</div>
