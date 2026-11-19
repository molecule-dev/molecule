<script lang="ts">
  // `/probe/list/sign-in`: where a signed-out protected view is replaced, as React's
  // `<Route path="/sign-in" element={<output>Sign in</output>}>` is. It is NOT the list
  // page, so the mounted list's last state stays readable, as React's `current` does.
</script>

<output>Sign in</output>
