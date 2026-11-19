<!--
  The scaffold's sign-up page: `useAuth().register` for the ONE mutation and
  `useForm` for the fields — the shared pair a generated app is expected to use.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { AuthError, UserProfile } from '@molecule/app-auth'

  import { useAuthClient } from '../../context.js'
  import { useAuth } from '../../hooks/useAuth.js'
  import { useForm } from '../../hooks/useForm.js'

  interface AppUser extends UserProfile {
    username?: string
    bio?: string
  }
  interface AppRegisterFields {
    username: string
  }
  interface SignupValues extends Record<string, unknown> {
    email: string
    password: string
    username: string
  }

  let { duplicate = false }: { duplicate?: boolean } = $props()
  const { register: registerUser } = useAuth<AppUser, AppRegisterFields>()
  const client = useAuthClient<AppUser, AppRegisterFields>()
  let failure = $state('')
  const form = untrack(() =>
    useForm<SignupValues>({
      defaultValues: { email: '', password: '', username: '' },
    }),
  )
  const { formState, isSubmitting } = form
  const email = form.register('email')
  const password = form.register('password')
  const username = form.register('username')

  /**
   * Registers through the auth client, and — in the duplicate control — also
   * through the API's own resource helper, which is the 409.
   *
   * @param values - The typed form values.
   */
  async function submit(values: SignupValues): Promise<void> {
    failure = ''
    try {
      await registerUser(values)
      if (duplicate) await client.register(values)
    } catch (error) {
      const body = (error as AuthError).body as
        { errors?: Record<string, string[]>; error?: string } | undefined
      failure =
        error instanceof Error
          ? `${error.message}${body?.error ? ` (${body.error})` : ''}`
          : 'Sign-up failed'
    }
  }
</script>

<form aria-label="Create account" onsubmit={form.handleSubmit(submit)}>
  <input
    aria-label="Email"
    name={email.name}
    value={$formState.values.email}
    oninput={email.onChange}
    onblur={email.onBlur}
  />
  <input
    aria-label="Username"
    name={username.name}
    value={$formState.values.username}
    oninput={username.onChange}
    onblur={username.onBlur}
  />
  <input
    aria-label="Password"
    type="password"
    name={password.name}
    value={$formState.values.password}
    oninput={password.onChange}
    onblur={password.onBlur}
  />
  <button type="submit" disabled={$isSubmitting}>Create account</button>
  {#if $isSubmitting}<span role="status">Creating account</span>{/if}
  {#if failure}<p role="alert">{failure}</p>{/if}
</form>
