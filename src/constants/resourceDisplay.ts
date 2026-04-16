/**
 * Display metadata for all resource IDs.
 * Used by ResourceBar (top HUD) and WarehousePanel.
 */

export interface ResourceDisplayDef {
  emoji: string;
  color: string;
  label: string;
}

export const RESOURCE_DISPLAY: Record<string, ResourceDisplayDef> = {
  // ── Creature resources ──────────────────────────────────────────────────
  seeds:         { emoji: '🌱', color: '#4A7C59', label: 'Seeds' },
  wicker:        { emoji: '🧺', color: '#8B5E3C', label: 'Wicker' },
  pollen:        { emoji: '🌸', color: '#EC4899', label: 'Pollen' },
  honey:         { emoji: '🍯', color: '#F59E0B', label: 'Honey' },
  wood:          { emoji: '🪵', color: '#8B5E3C', label: 'Wood' },
  mushrooms:     { emoji: '🍄', color: '#7C3AED', label: 'Shrooms' },
  ore:           { emoji: '⛏️', color: '#6A7A5A', label: 'Ore' },
  crystals:      { emoji: '💎', color: '#6C63FF', label: 'Crystals' },
  venom:         { emoji: '🧪', color: '#F97316', label: 'Venom' },
  goldSand:      { emoji: '🏜️', color: '#D97706', label: 'Gold Sand' },
  feathers:      { emoji: '🪶', color: '#374151', label: 'Feathers' },
  fur:           { emoji: '🐻', color: '#92400E', label: 'Fur' },
  rareToxin:     { emoji: '☠️', color: '#581C87', label: 'Toxin' },
  purifiedWater: { emoji: '💧', color: '#38BDF8', label: 'Water' },
  scales:        { emoji: '🐟', color: '#10B981', label: 'Scales' },
  pearl:         { emoji: '🫧', color: '#0891B2', label: 'Pearl' },
  lightEssence:  { emoji: '✨', color: '#EAB308', label: 'Essence' },
  darkSoul:      { emoji: '🌑', color: '#6D28D9', label: 'Dark Soul' },
  // ── Plant resources ─────────────────────────────────────────────────────
  berries:       { emoji: '🫐', color: '#7C3AED', label: 'Berries' },
  sunPollen:     { emoji: '🌻', color: '#F59E0B', label: 'Sun Pollen' },
  fibers:        { emoji: '🌿', color: '#4A7C59', label: 'Fibers' },
  moonDew:       { emoji: '🪷', color: '#C084FC', label: 'Moon Dew' },
  crystalDust:   { emoji: '💠', color: '#60A5FA', label: 'Crystal Dust' },
  glowSpores:    { emoji: '🍄', color: '#A78BFA', label: 'Spores' },
};

/** Fallback for unknown resource IDs */
export const RESOURCE_DISPLAY_FALLBACK: ResourceDisplayDef = {
  emoji: '📦',
  color: '#6B7280',
  label: 'Resource',
};
