<script lang="ts">
  import { Car } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import Auth from './components/Auth.svelte';
  import CarsView from './components/CarsView.svelte';
  import Dashboard from './components/Dashboard.svelte';
  import Settings from './components/Settings.svelte';
  import { preferredFuelType, session, userProfile } from './lib/stores';
  import { supabase } from './lib/supabase';
  const baseUrl = import.meta.env.BASE_URL;

  let currentView = $state('dashboard');

  function setView(view: string) {
    currentView = view;
  }
  let loading = $state(true);

  onMount(() => {
    supabase.auth.getSession().then(({ data: { session: s } }: { data: { session: any } }) => {
      session.set(s);
      if (s) fetchProfile(s.user.id);
      loading = false;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, s: any) => {
      session.set(s);
      if (s) fetchProfile(s.user.id);
      else userProfile.set(null);
    });

    return () => subscription.unsubscribe();
  });

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) {
      userProfile.set(data);
      preferredFuelType.set(data.preferred_fuel_type);
    }
  }

  function handleLogout() {
    supabase.auth.signOut();
  }
</script>

{#if loading}
  <div class="min-h-screen flex items-center justify-center bg-base-100">
    <span class="loading loading-infinity loading-lg text-primary"></span>
  </div>
{:else if !$session}
  <Auth />
{:else}
  <div class="drawer lg:drawer-open">
    <input id="my-drawer" type="checkbox" class="drawer-toggle" />
    <div class="drawer-content flex flex-col min-h-screen bg-base-100">
      <!-- Top Navbar for Mobile -->
      <div class="navbar bg-base-200 lg:hidden shadow-sm">
        <div class="flex-none">
          <label for="my-drawer" class="btn btn-square btn-ghost">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-6 h-6 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </label>
        </div>
        <div class="flex-1">
          <a href={baseUrl} class="btn btn-ghost text-xl font-bold text-primary">Vibilia</a>
        </div>
      </div>

      <!-- Main Content Area -->
      <main class="flex-grow p-4 md:p-8 max-w-5xl mx-auto w-full">
        {#if currentView === 'dashboard'}
          <Dashboard onRefuel={() => currentView = 'cars'} />
        {:else if currentView === 'cars'}
          <CarsView />
        {:else if currentView === 'settings'}
          <Settings />
        {/if}
      </main>

      <!-- Bottom Navigation for Mobile -->
      <div class="btm-nav lg:hidden z-10 border-t border-base-300">
        <button class={currentView === 'dashboard' ? 'font-bold text-primary' : ''} onclick={() => setView('dashboard')}>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span class="btm-nav-label text-[10px]">Dashboard</span>
        </button>
        <button class={currentView === 'cars' ? 'font-bold text-primary' : ''} onclick={() => setView('cars')}>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1m-6-1a1 1 0 011-1h1m6 1a1 1 0 011-1h1" /></svg>
          <span class="btm-nav-label text-[10px]">Logs</span>
        </button>
        <button class={currentView === 'settings' ? 'font-bold text-primary' : ''} onclick={() => setView('settings')}>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span class="btm-nav-label text-[10px]">Settings</span>
        </button>
      </div>
    </div>

    <!-- Sidebar for Desktop -->
    <div class="drawer-side z-20">
      <label for="my-drawer" class="drawer-overlay"></label>
      <ul class="menu p-4 w-64 min-h-full bg-base-200 text-base-content gap-2">
        <li class="mb-4">
          <a href={baseUrl} class="text-2xl font-black text-primary hover:bg-transparent">Vibilia</a>
        </li>
        <li>
          <button class={currentView === 'dashboard' ? 'font-bold bg-base-300' : ''} onclick={() => setView('dashboard')}>
            Dashboard
          </button>
        </li>
        <li>
          <button
            class="btn btn-ghost justify-start gap-3 px-4 {currentView === 'cars' ? 'bg-base-300 font-bold' : ''}"
            onclick={() => setView('cars')}
          >
            <Car class="w-5 h-5 {currentView === 'cars' ? 'text-primary' : ''}" />
            Vehicle Logs
          </button>
        </li>
        <li>
          <button class={currentView === 'settings' ? 'font-bold bg-base-300' : ''} onclick={() => setView('settings')}>
            Settings
          </button>
        </li>
        <div class="mt-auto pt-4 border-t border-base-300">
          <button class="btn btn-outline btn-sm w-full" onclick={handleLogout}>
            Logout
          </button>
        </div>
      </ul>
    </div>
  </div>
{/if}

