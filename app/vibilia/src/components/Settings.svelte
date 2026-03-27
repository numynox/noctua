<script lang="ts">
  import { Fuel, LogOut } from 'lucide-svelte';
  import { preferredFuelType, session } from '../lib/stores';
  import { supabase } from '../lib/supabase';
  import VehicleManager from './VehicleManager.svelte';

  let saving = false;

  async function updateFuelPreference(type: string) {
    saving = true;
    preferredFuelType.set(type);
    const { error } = await supabase
      .from('profiles')
      .update({ preferred_fuel_type: type })
      .eq('id', $session?.user.id);
    saving = false;
  }
</script>

<div class="space-y-8 animate-in slide-in-from-bottom duration-500">
  <div>
    <h1 class="text-3xl font-black text-base-content">Settings</h1>
    <p class="text-sm text-base-content/60">Manage your profile and preferences</p>
  </div>

  <!-- Fuel Preference -->
  <div class="card bg-base-200 shadow-xl border border-primary/5">
    <div class="card-body">
      <h2 class="card-title flex items-center gap-2">
        <Fuel class="w-5 h-5 text-primary" />
        Fuel Preferences
      </h2>
      <p class="text-sm text-base-content/70">Select the fuel type to show in the dashboard and statistics.</p>
      
      <div class="flex flex-wrap gap-2 mt-4">
        {#each ['E5', 'E10', 'Diesel'] as type}
          <button 
            class="btn flex-1 {$preferredFuelType === type ? 'btn-primary' : 'btn-outline'}" 
            disabled={saving}
            onclick={() => updateFuelPreference(type)}
          >
            {type}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <div class="divider"></div>

  <!-- Vehicle Management (Moved from separate tab as requested) -->
  <VehicleManager />

  <!-- Logout for Mobile (duplicated in drawer but useful here) -->
  <div class="lg:hidden">
    <button class="btn btn-error btn-outline w-full gap-2" onclick={() => supabase.auth.signOut()}>
      <LogOut class="w-4 h-4" />
      Sign Out
    </button>
  </div>
</div>
