/**
 * SupabaseService — all remote operations for WILDS online features.
 *
 * Every public method is fire-and-forget-safe: it catches all errors and
 * returns a fallback value so the game works fully offline.
 */
import { supabase } from '../lib/supabase';
import {
  useOnlineStore,
  LeaderboardEntry,
  MarketListing,
  UserProfile,
  RARITY_SCORE,
  xpToLevel,
} from '../store/onlineStore';
import { useCreatureStore } from '../store/creatureStore';
import type { Creature } from '../store/creatureStore';
import { useResourceStore } from '../store/resourceStore';
import { useMapStore } from '../store/mapStore';
import { SPECIES_MAP, ScheduleType } from '../constants/creatures';

// ── Auth ──────────────────────────────────────────────────────────────────────

export const SupabaseService = {

  /** Sign in anonymously if no session exists. Non-blocking on error. */
  async init(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      let userId: string | null = null;
      let isAnonymous = true;

      if (session?.user) {
        userId = session.user.id;
        isAnonymous = session.user.is_anonymous ?? true;
      } else {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (!error && data.user) {
          userId = data.user.id;
          isAnonymous = true;
        }
      }

      useOnlineStore.getState().setUserId(userId, isAnonymous);

      if (userId) {
        await SupabaseService.loadProfile(userId);
      }
    } catch {
      // Offline — stay in offline mode
    }
  },

  // ── Profile ────────────────────────────────────────────────────────────────

  async loadProfile(userId: string): Promise<void> {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, pending_gold')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        useOnlineStore.getState().setProfile({
          id:          data.id as string,
          username:    data.username as string | null,
          pendingGold: (data.pending_gold as number) ?? 0,
        });
      } else {
        // First visit: create profile row
        await supabase.from('profiles').insert({ id: userId });
        useOnlineStore.getState().setProfile({ id: userId, username: null, pendingGold: 0 });
      }
    } catch {
      // Offline — leave profile null
    }
  },

  async setUsername(username: string): Promise<boolean> {
    const { userId } = useOnlineStore.getState();
    if (!userId) return false;
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, username, updated_at: new Date().toISOString() });
      if (error) return false;

      const profile = useOnlineStore.getState().profile;
      useOnlineStore.getState().setProfile({ ...profile!, username });

      // Also update leaderboard display name
      await supabase
        .from('leaderboard')
        .update({ display_name: username, updated_at: new Date().toISOString() })
        .eq('id', userId);

      return true;
    } catch {
      return false;
    }
  },

  /** Claim pending gold from creature sales. Returns gold amount credited. */
  async claimPendingGold(): Promise<number> {
    const { userId, profile } = useOnlineStore.getState();
    if (!userId || !profile || profile.pendingGold <= 0) return 0;
    try {
      const amount = profile.pendingGold;
      const { error } = await supabase
        .from('profiles')
        .update({ pending_gold: 0, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) return 0;

      useResourceStore.getState().addGold(amount);
      useOnlineStore.getState().setProfile({ ...profile, pendingGold: 0 });
      return amount;
    } catch {
      return 0;
    }
  },

  // ── Leaderboard ────────────────────────────────────────────────────────────

  async fetchLeaderboard(): Promise<void> {
    try {
      const { data } = await supabase
        .from('leaderboard')
        .select('id, display_name, creature_count, rarity_score, level, updated_at')
        .order('rarity_score', { ascending: false })
        .limit(50);

      if (data) {
        const entries: LeaderboardEntry[] = data.map((r) => ({
          id:            r.id as string,
          displayName:   r.display_name as string,
          creatureCount: r.creature_count as number,
          rarityScore:   r.rarity_score as number,
          level:         r.level as number,
          updatedAt:     r.updated_at as string,
        }));
        useOnlineStore.getState().setLeaderboard(entries);
      }
    } catch {
      // Offline — keep cached data
    }
  },

  /** Push current score to the leaderboard. */
  async submitScore(): Promise<boolean> {
    const { userId, profile } = useOnlineStore.getState();
    if (!userId) return false;
    try {
      const { creatures } = useCreatureStore.getState();
      const { xp } = useResourceStore.getState();

      const ownedCreatures = creatures.filter((c) => c.wildExpiresAt === null);
      const creatureCount  = ownedCreatures.length;
      const rarityScore    = ownedCreatures.reduce((sum, c) => {
        const rarity = SPECIES_MAP.get(c.speciesId)?.rarity ?? 'common';
        const pts    = (RARITY_SCORE[rarity] ?? 1) * (c.isShiny ? 2 : 1);
        return sum + pts;
      }, 0);
      const level = xpToLevel(xp);

      const displayName = profile?.username ?? `Anon_${userId.slice(0, 6)}`;

      const { error } = await supabase.from('leaderboard').upsert({
        id:             userId,
        display_name:   displayName,
        creature_count: creatureCount,
        rarity_score:   rarityScore,
        level,
        updated_at:     new Date().toISOString(),
      });

      return !error;
    } catch {
      return false;
    }
  },

  // ── Market ─────────────────────────────────────────────────────────────────

  async fetchBrowseListings(): Promise<void> {
    const { userId } = useOnlineStore.getState();
    try {
      let query = supabase
        .from('market_listings')
        .select('id, seller_id, seller_name, species_id, species_name, rarity, is_shiny, creature_name, price_gold, status, listed_at')
        .eq('status', 'available')
        .order('listed_at', { ascending: false })
        .limit(40);

      if (userId) {
        query = query.neq('seller_id', userId);
      }

      const { data } = await query;
      if (data) {
        useOnlineStore.getState().setBrowseListings(data.map(rowToListing));
      }
    } catch {
      // Offline
    }
  },

  async fetchMyListings(): Promise<void> {
    const { userId } = useOnlineStore.getState();
    if (!userId) { useOnlineStore.getState().setMyListings([]); return; }
    try {
      const { data } = await supabase
        .from('market_listings')
        .select('id, seller_id, seller_name, species_id, species_name, rarity, is_shiny, creature_name, price_gold, status, listed_at')
        .eq('seller_id', userId)
        .order('listed_at', { ascending: false })
        .limit(20);

      if (data) {
        useOnlineStore.getState().setMyListings(data.map(rowToListing));
      }
    } catch {
      // Offline
    }
  },

  /**
   * List a creature on the market. Removes it from the local roster.
   * Returns the new listing ID on success, null on failure.
   */
  async listCreature(
    creatureId: string,
    priceGold:  number,
  ): Promise<string | null> {
    const { userId, profile } = useOnlineStore.getState();
    if (!userId) return null;

    const { creatures, removeCreature } = useCreatureStore.getState();
    const creature = creatures.find((c) => c.id === creatureId);
    if (!creature || creature.wildExpiresAt !== null) return null;

    const speciesDef = SPECIES_MAP.get(creature.speciesId);
    if (!speciesDef) return null;

    // Remove from habitat if needed, then from store
    if (creature.habitatId) {
      useMapStore.getState().unassignCreatureFromHabitat(creature.habitatId, creature.id);
    }
    removeCreature(creature.id);

    try {
      const sellerName = profile?.username ?? `Anon_${userId.slice(0, 6)}`;
      const { data, error } = await supabase
        .from('market_listings')
        .insert({
          seller_id:    userId,
          seller_name:  sellerName,
          species_id:   creature.speciesId,
          species_name: speciesDef.name,
          rarity:       speciesDef.rarity,
          is_shiny:     creature.isShiny,
          creature_name: creature.name,
          price_gold:   priceGold,
        })
        .select('id')
        .single();

      if (error || !data) {
        // Restore creature on failure
        useCreatureStore.getState().addCreature(creature);
        return null;
      }
      return data.id as string;
    } catch {
      useCreatureStore.getState().addCreature(creature);
      return null;
    }
  },

  /**
   * Buy a listing. Deducts gold locally, creates creature, marks sold remotely.
   * Returns true on success.
   */
  async buyListing(listing: MarketListing): Promise<boolean> {
    const { userId } = useOnlineStore.getState();
    if (!userId || listing.sellerId === userId) return false;

    const { spendGold } = useResourceStore.getState();
    if (!spendGold(listing.priceGold)) return false;

    try {
      const { data, error } = await supabase.rpc('complete_purchase', {
        p_listing_id: listing.id,
      });

      const result = data as { success: boolean; error?: string } | null;
      if (error || !result?.success) {
        // Refund gold
        useResourceStore.getState().addGold(listing.priceGold);
        return false;
      }

      // Create creature locally
      useCreatureStore.getState().addCreature(buildCreatureFromListing(listing));

      return true;
    } catch {
      useResourceStore.getState().addGold(listing.priceGold);
      return false;
    }
  },

  /** Cancel an active own listing. Returns the creature to the player's roster. */
  async cancelListing(listing: MarketListing): Promise<boolean> {
    const { userId } = useOnlineStore.getState();
    if (!userId || listing.sellerId !== userId) return false;

    try {
      const { data, error } = await supabase.rpc('cancel_listing', {
        p_listing_id: listing.id,
      });

      const result = data as { success: boolean } | null;
      if (error || !result?.success) return false;

      // Restore creature locally
      useCreatureStore.getState().addCreature(buildCreatureFromListing(listing));
      return true;
    } catch {
      return false;
    }
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCreatureFromListing(listing: MarketListing): Creature {
  const speciesDef = SPECIES_MAP.get(listing.speciesId);
  const schedule   = (speciesDef?.schedule ?? 'diurnal') as ScheduleType;
  const now        = Date.now();
  return {
    id:                  generateId(),
    speciesId:           listing.speciesId,
    name:                listing.creatureName,
    level:               1,
    happiness:           75,
    hunger:              0,
    lastHungerAt:        now,
    isShiny:             listing.isShiny,
    habitatId:           null,
    state:               'active',
    position:            { x: 400, y: 300 },
    targetPosition:      { x: 400, y: 300 },
    lastProducedAt:      now,
    scheduleType:        schedule,
    nextMoveAt:          now,
    lastWokenAt:         now,
    sleepInterrupts:     0,
    lastAffectedAt:      now,
    wildExpiresAt:       null,
    sleepCyclesInHabitat: 0,
  };
}

function rowToListing(r: Record<string, unknown>): MarketListing {
  return {
    id:           r.id as string,
    sellerId:     r.seller_id as string,
    sellerName:   r.seller_name as string,
    speciesId:    r.species_id as string,
    speciesName:  r.species_name as string,
    rarity:       r.rarity as string,
    isShiny:      r.is_shiny as boolean,
    creatureName: r.creature_name as string,
    priceGold:    r.price_gold as number,
    status:       r.status as 'available' | 'sold' | 'cancelled',
    listedAt:     r.listed_at as string,
  };
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
