<script lang="ts">
  import { Car, Plus, Trash2, Users } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { session } from '../lib/stores';
  import { supabase } from '../lib/supabase';

  let cars: any[] = [];
  let loading = true;
  let showAddCar = false;
  let newCarName = '';
  let newCarCapacity = 50;
  
  let sharingCarId: string | null = null;
  let shareEmail = '';
  let shareMessage = '';

  onMount(() => {
    fetchCars();
  });

  async function fetchCars() {
    loading = true;
    const { data: ownedCars } = await supabase
      .from('cars')
      .select('*')
      .eq('owner_id', $session?.user.id);
    
    cars = ownedCars || [];
    loading = false;
  }

  async function addCar() {
    if (!newCarName) return;
    const { data, error } = await supabase
      .from('cars')
      .insert([{ 
        name: newCarName, 
        tank_capacity: newCarCapacity, 
        owner_id: $session?.user.id 
      }])
      .select()
      .single();
    
    if (data) {
      cars = [...cars, data];
      showAddCar = false;
      newCarName = '';
      newCarCapacity = 50;
    }
  }

  async function deleteCar(id: string) {
    if (!confirm('Are you sure you want to delete this vehicle? All refuel logs for this car will be lost.')) return;
    const { error } = await supabase.from('cars').delete().eq('id', id);
    if (!error) cars = cars.filter(c => c.id !== id);
  }

  async function openShare(carId: string) {
    sharingCarId = carId;
    shareEmail = '';
    shareMessage = '';
  }

  async function shareCar() {
    if (!sharingCarId || !shareEmail) return;
    
    // Find user by email (Simplified: in a real app, you'd use a server-side lookup or RPC)
    // Here we try to find in shared profiles since that's where we store user info
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', shareEmail) // For simplicity, we use ID if they provide it, or we could handle email if we had a mapping
      .single();
    
    // Fallback: If we don't have a lookup by email established, we tell the user to use the User ID for now
    // In the real system, you'd probably have an rpc find_user_by_email(email)
    
    if (pErr) {
      shareMessage = 'User not found. Please use their Supabase User ID for now.';
      return;
    }

    const { error } = await supabase
      .from('car_access')
      .insert([{ car_id: sharingCarId, user_id: profile.id }]);
    
    if (error) {
      shareMessage = 'Error sharing or already shared with this user.';
    } else {
      shareMessage = 'Car shared successfully!';
      setTimeout(() => { sharingCarId = null; }, 2000);
    }
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h3 class="text-xl font-bold flex items-center gap-2">
      <Car class="w-5 h-5 text-primary" />
      Manage Vehicles
    </h3>
    <button class="btn btn-primary btn-sm rounded-full gap-2" onclick={() => showAddCar = !showAddCar}>
      <Plus class="w-4 h-4" /> Add Car
    </button>
  </div>

  {#if showAddCar}
    <div class="card bg-base-300 border border-primary/20">
      <div class="card-body p-4">
        <h4 class="font-bold mb-2">New Vehicle</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label" for="mgr-newCarName"><span class="label-text">Name</span></label>
            <input type="text" id="mgr-newCarName" bind:value={newCarName} class="input input-bordered input-sm" placeholder="e.g. Blue Golf" />
          </div>
          <div class="form-control">
            <label class="label" for="mgr-newCarCapacity"><span class="label-text">Tank Capacity (L)</span></label>
            <input type="number" id="mgr-newCarCapacity" bind:value={newCarCapacity} class="input input-bordered input-sm" />
          </div>
        </div>
        <div class="card-actions justify-end mt-4">
          <button class="btn btn-ghost btn-sm" onclick={() => showAddCar = false}>Cancel</button>
          <button class="btn btn-primary btn-sm" onclick={addCar}>Save Vehicle</button>
        </div>
      </div>
    </div>
  {/if}

  {#if sharingCarId}
    <div class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <Users class="w-5 h-5" /> Share {cars.find(c => c.id === sharingCarId)?.name}
        </h3>
        <p class="py-4 text-sm text-base-content/70">Enter the User ID of the person you want to share this vehicle with. They will be able to see prices and log refuels.</p>
        <div class="form-control">
          <input type="text" bind:value={shareEmail} class="input input-bordered" placeholder="User ID" />
          {#if shareMessage}
            <p class="mt-2 text-xs {shareMessage.includes('success') ? 'text-success' : 'text-error'}">{shareMessage}</p>
          {/if}
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost" onclick={() => sharingCarId = null}>Close</button>
          <button class="btn btn-primary" onclick={shareCar}>Share Access</button>
        </div>
      </div>
    </div>
  {/if}

  {#if loading}
    <div class="flex justify-center py-4"><span class="loading loading-spinner text-primary"></span></div>
  {:else}
    <div class="space-y-3">
      {#each cars as car (car.id)}
        <div class="card bg-base-200 border border-base-content/5">
          <div class="card-body p-4 flex flex-row items-center justify-between">
            <div>
              <div class="font-bold">{car.name}</div>
              <div class="text-xs text-base-content/50">{car.tank_capacity}L Capacity</div>
            </div>
            <div class="flex gap-1">
              <button class="btn btn-ghost btn-sm btn-square" onclick={() => openShare(car.id)} title="Share">
                <Users class="w-4 h-4" />
              </button>
              <button class="btn btn-ghost btn-sm btn-square text-error" onclick={() => deleteCar(car.id)} title="Delete">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      {:else}
        <p class="text-center py-4 text-sm text-base-content/40 italic">You haven't added any vehicles yet.</p>
      {/each}
    </div>
  {/if}
</div>
