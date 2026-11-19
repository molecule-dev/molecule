<!--
  React's `LoginPage`: a form whose local draft and failure must survive an
  unsuccessful sign-in.
-->
<script lang="ts">
  import type { AuthError } from '@molecule/app-auth'

  import { useAuth } from '../../hooks/useAuth.js'

  const { login, isLoading } = useAuth()
  let email = $state('')
  let failure = $state('')

  /**
   * Signs in with the form's current draft and renders the API's structured
   * errors when the attempt fails, keeping the draft itself.
   */
  async function submit(): Promise<void> {
    failure = ''
    try {
      await login({ email, password: 'test-password' })
    } catch (error) {
      const body = (error as AuthError).body as { errors?: Record<string, string[]> } | undefined
      failure = Object.entries(body?.errors ?? {})
        .map(([field, messages]) => `${field} ${messages.join(', ')}`)
        .join('; ')
    }
  }
</script>

<form
  aria-label="Sign in"
  onsubmit={(event) => {
    event.preventDefault()
    void submit()
  }}
>
  <input
    aria-label="Email"
    value={email}
    oninput={(event) => (email = event.currentTarget.value)}
  />
  <button type="submit">Sign in</button>
  {#if $isLoading}<span role="status">Signing in</span>{/if}
  {#if failure}<p role="alert">{failure}</p>{/if}
</form>
