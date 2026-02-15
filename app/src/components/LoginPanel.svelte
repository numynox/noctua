<script lang="ts">
  import { onMount } from "svelte";
  import { getSession, signInWithPassword } from "../lib/data";

  let email = $state("");
  let password = $state("");
  let isBusy = $state(false);
  let authError = $state("");

  let homeHref = $state("/");

  onMount(async () => {
    if (typeof document !== "undefined") {
      const baseUrl = document.documentElement.dataset.baseUrl || "/";
      homeHref = baseUrl;
    }

    try {
      const session = await getSession();
      if (session?.user) {
        window.location.replace(homeHref);
      }
    } catch {
      // Let user continue and submit manually; error shown on submit if needed.
    }
  });

  async function handleLogin(event: SubmitEvent) {
    event.preventDefault();
    authError = "";

    if (!email || !password) {
      authError = "Please enter email and password.";
      return;
    }

    isBusy = true;
    try {
      await signInWithPassword(email.trim(), password);
      window.location.replace(homeHref);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      authError = message;
    } finally {
      isBusy = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center p-6 bg-base-100">
  <div class="w-full max-w-md card bg-base-200 shadow-sm">
    <div class="card-body p-6 lg:p-8">
      <h1 class="text-2xl font-bold mb-2">Sign in</h1>
      <p class="text-sm text-base-content/70 mb-4">
        Use your Supabase account to continue.
      </p>

      <form class="space-y-4" onsubmit={handleLogin}>
        <label class="form-control w-full">
          <span class="label-text">Email</span>
          <input
            class="input input-bordered w-full"
            type="email"
            bind:value={email}
            autocomplete="email"
            required
          />
        </label>

        <label class="form-control w-full">
          <span class="label-text">Password</span>
          <input
            class="input input-bordered w-full"
            type="password"
            bind:value={password}
            autocomplete="current-password"
            required
          />
        </label>

        {#if authError}
          <div class="alert alert-error text-sm">
            <span>{authError}</span>
          </div>
        {/if}

        <button class="btn btn-primary w-full" type="submit" disabled={isBusy}>
          {isBusy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  </div>
</div>
