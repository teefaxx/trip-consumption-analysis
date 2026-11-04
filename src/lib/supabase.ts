import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { RemoteTripRow, RemoteTripWrite, TripRemote } from '../storage/sync'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * The Supabase client, or `null` when this build has no Supabase project
 * configured — the app then runs fully local, exactly as before accounts.
 *
 * The publishable key is meant to be public: what protects the data is
 * row-level security in supabase/migrations/0001_trips.sql. Never put the
 * service-role (secret) key in the app.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          // PKCE: the provider redirects back with a one-time `?code=` that is
          // exchanged for a session; no tokens ever appear in the URL (and
          // nothing collides with the app's #/hash routes).
          flowType: 'pkce',
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null

const PAGE = 100

/** The `trips` table of the signed-in user, as a sync remote. */
export function createSupabaseRemote(client: SupabaseClient, userId: string): TripRemote {
  return {
    async upsert(rows: RemoteTripWrite[]) {
      const { error } = await client
        .from('trips')
        .upsert(
          rows.map((r) => ({ ...r, user_id: userId })),
          { onConflict: 'user_id,id' },
        )
      if (error) throw new Error(error.message)
    },

    async fetchSince(since) {
      const all: RemoteTripRow[] = []
      for (let from = 0; ; from += PAGE) {
        let query = client
          .from('trips')
          .select('id,data,deleted,updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, from + PAGE - 1)
        if (since) query = query.gte('updated_at', since)
        const { data, error } = await query
        if (error) throw new Error(error.message)
        all.push(...(data as RemoteTripRow[]))
        if (data.length < PAGE) return all
      }
    },

    async isEmpty() {
      const { data, error } = await client
        .from('trips')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
      if (error) throw new Error(error.message)
      return data.length === 0
    },
  }
}
