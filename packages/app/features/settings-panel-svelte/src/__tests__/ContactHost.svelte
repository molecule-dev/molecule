<!--
  Test host for the custom-aliases + custom-form counterexample: ContactForm under
  the binding's AuthProvider, as the React package's test renders its ContactForm
  under `<AuthProvider client={client}>`.
-->
<script lang="ts">
  import type { AuthClient } from '@molecule/app-auth'
  import { AuthProvider } from '@molecule/app-svelte'

  import type { HandleUser } from './account-types.js'
  import ContactForm from './ContactForm.svelte'

  let { client }: { client: AuthClient<HandleUser> } = $props()
</script>

<AuthProvider {client}>
  <ContactForm />
</AuthProvider>
