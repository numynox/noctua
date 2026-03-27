import { writable } from 'svelte/store';
import type { Session } from '@supabase/supabase-js';

export const session = writable<Session | null>(null);
export const userProfile = writable<any>(null);
export const preferredFuelType = writable<string>('E10');
