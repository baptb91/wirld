/**
 * onlineStore — in-memory cache of the player's online presence.
 *
 * Not persisted (Supabase session is persisted by the Supabase client via
 * AsyncStorage; leaderboard/market data is refetched on each panel open).
 */
import { create } from 'zustand';

// ── Public types (shared with services and UI) ────────────────────────────────

export interface LeaderboardEntry {
  id:            string;
  displayName:   string;
  creatureCount: number;
  rarityScore:   number;
  level:         number;
  updatedAt:     string;
}

export interface MarketListing {
  id:           string;
  sellerId:     string;
  sellerName:   string;
  speciesId:    string;
  speciesName:  string;
  rarity:       string;
  isShiny:      boolean;
  creatureName: string;
  priceGold:    number;
  status:       'available' | 'sold' | 'cancelled';
  listedAt:     string;
}

export interface UserProfile {
  id:          string;
  username:    string | null;
  pendingGold: number;
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface OnlineState {
  /** null until Supabase session is established */
  userId:       string | null;
  isAnonymous:  boolean;
  profile:      UserProfile | null;
  leaderboard:  LeaderboardEntry[];
  /** Market listings from other sellers (for browsing) */
  browseListings: MarketListing[];
  /** Current user's own listings */
  myListings:   MarketListing[];
}

interface OnlineActions {
  setUserId(id: string | null, isAnonymous: boolean): void;
  setProfile(p: UserProfile | null): void;
  setLeaderboard(entries: LeaderboardEntry[]): void;
  setBrowseListings(listings: MarketListing[]): void;
  setMyListings(listings: MarketListing[]): void;
}

export const useOnlineStore = create<OnlineState & OnlineActions>((set) => ({
  userId:         null,
  isAnonymous:    true,
  profile:        null,
  leaderboard:    [],
  browseListings: [],
  myListings:     [],

  setUserId:        (id, isAnonymous) => set({ userId: id, isAnonymous }),
  setProfile:       (p)      => set({ profile: p }),
  setLeaderboard:   (entries) => set({ leaderboard: entries }),
  setBrowseListings: (listings) => set({ browseListings: listings }),
  setMyListings:    (listings) => set({ myListings: listings }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Compute player level from accumulated XP. */
export function xpToLevel(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
}

/** Rarity points used for leaderboard score. */
export const RARITY_SCORE: Record<string, number> = {
  common:    1,
  uncommon:  3,
  rare:      7,
  epic:     15,
  legendary: 30,
};
