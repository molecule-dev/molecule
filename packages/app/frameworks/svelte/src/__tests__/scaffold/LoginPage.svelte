<!--
  The scaffold's sign-in page: renders from the form controller, so the same
  DOM nodes survive a rejected request, and renders the API's own error body.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { AuthError, UserProfile } from '@molecule/app-auth'

  import { useAuth } from '../../hooks/useAuth.js'
  import { useForm } from '../../hooks/useForm.js'

  interface AppUser extends UserProfile {
    username?: string
    bio?: string
  }
  interface LoginValues extends Record<string, unknown> {
    email: string
    password: string
  }

  const { login, isLoading } = useAuth<AppUser>()
  let failure = $state('')
  const form = untrack(() => useForm<LoginValues>({ defaultValues: { email: '', password: '' } }))
  const { formState } = form
  const email = form.register('email')
  const password = form.register('password')

  /**
   * Signs in and renders the API's structured error body when the attempt fails.
   *
   * @param values - The typed form values.
   */
  async function submit(values: LoginValues): Promise<void> {
    failure = ''
    try {
      await login(values)
    } catch (error) {
      const body = (error as AuthError).body as
        { errors?: Record<string, string[]>; error?: string } | undefined
      failure =
        Object.entries(body?.errors ?? {})
          .map(([field, messages]) => `${field} ${messages.join(', ')}`)
          .join('; ') ||
        body?.error ||
        'Sign-in failed'
    }
  }
</script>

<form aria-label="Sign in" onsubmit={form.handleSubmit(submit)}>
  <input
    aria-label="Email"
    name={email.name}
    value={$formState.values.email}
    oninput={email.onChange}
    onblur={email.onBlur}
  />
  <input
    aria-label="Password"
    type="password"
    name={password.name}
    value={$formState.values.password}
    oninput={password.onChange}
    onblur={password.onBlur}
  />
  <button type="submit">Sign in</button>
  {#if $isLoading}<span role="status">Signing in</span>{/if}
  {#if failure}<p role="alert">{failure}</p>{/if}
</form>
