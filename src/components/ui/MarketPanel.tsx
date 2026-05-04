/**
 * MarketPanel — creature marketplace.
 *
 * Browse tab: buy creatures listed by other players.
 * Mine tab:   manage own listings + list a new creature.
 *
 * All Supabase calls fail gracefully — the panel stays functional
 * when offline (shows cached data or empty state).
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useOnlineStore } from '../../store/onlineStore';
import { useCreatureStore } from '../../store/creatureStore';
import { useResourceStore } from '../../store/resourceStore';
import { SupabaseService } from '../../services/SupabaseService';
import { SPECIES_MAP, RARITY_COLOR } from '../../constants/creatures';
import { useTheme } from '../../constants/theme';
import type { MarketListing } from '../../store/onlineStore';

interface Props { onClose: () => void }

type TabId = 'browse' | 'mine';

export default function MarketPanel({ onClose }: Props) {
  const { colors, isDark } = useTheme();

  const [tab, setTab]           = useState<TabId>('browse');
  const [loading, setLoading]   = useState(false);
  const [busyId, setBusyId]     = useState<string | null>(null);
  const [statusMsg, setStatus]  = useState('');
  const [showSell, setShowSell] = useState(false);

  const userId         = useOnlineStore((s) => s.userId);
  const browseListings = useOnlineStore((s) => s.browseListings);
  const myListings     = useOnlineStore((s) => s.myListings);
  const gold           = useResourceStore((s) => s.gold);

  async function refresh() {
    setLoading(true);
    await Promise.all([
      SupabaseService.fetchBrowseListings(),
      SupabaseService.fetchMyListings(),
    ]);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  function flash(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(''), 2800);
  }

  async function handleBuy(listing: MarketListing) {
    if (busyId || listing.sellerId === userId) return;
    if (gold < listing.priceGold) { flash('✗ Not enough Gold'); return; }
    setBusyId(listing.id);
    const ok = await SupabaseService.buyListing(listing);
    setBusyId(null);
    flash(ok ? `✓ ${listing.creatureName} added to your roster!` : '✗ Listing no longer available');
    if (ok) refresh();
  }

  async function handleCancel(listing: MarketListing) {
    if (busyId) return;
    setBusyId(listing.id);
    const ok = await SupabaseService.cancelListing(listing);
    setBusyId(null);
    flash(ok ? '✓ Listing cancelled — creature returned' : '✗ Could not cancel');
    if (ok) refresh();
  }

  const panelBg = isDark ? '#1C1C1E' : '#FFFDF4';
  const cardBg  = isDark ? '#2C2C2E' : '#FFFFFF';
  const divider = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(80,60,20,0.10)';
  const activeTab = isDark ? colors.green : colors.green;

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
        <View style={[styles.sheet, { backgroundColor: panelBg }]}>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: divider }]}>
            <Text style={[styles.title, { color: colors.text }]}>🏪  Market</Text>
            <Pressable onPress={onClose} hitSlop={14}>
              <Text style={[styles.closeX, { color: colors.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          {/* Tab bar */}
          <View style={[styles.tabBar, { borderBottomColor: divider }]}>
            {(['browse', 'mine'] as TabId[]).map((t) => (
              <Pressable key={t} onPress={() => setTab(t)} style={styles.tabBtn}>
                <Text style={[
                  styles.tabLabel,
                  { color: tab === t ? activeTab : colors.textMuted },
                ]}>
                  {t === 'browse' ? '🔍 Browse' : '📦 Mine'}
                </Text>
                {tab === t && <View style={[styles.tabUnderline, { backgroundColor: activeTab }]} />}
              </Pressable>
            ))}
          </View>

          {/* Status message */}
          {!!statusMsg && (
            <Text style={[
              styles.flashMsg,
              { color: statusMsg.startsWith('✓') ? colors.green : '#EF4444' },
            ]}>
              {statusMsg}
            </Text>
          )}

          {/* Content */}
          {loading && browseListings.length === 0 && myListings.length === 0 ? (
            <ActivityIndicator color={colors.green} style={styles.loader} />
          ) : tab === 'browse' ? (
            <FlatList
              data={browseListings}
              keyExtractor={(l) => l.id}
              contentContainerStyle={styles.list}
              onRefresh={refresh}
              refreshing={loading}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <EmptyState text="No creatures for sale right now. Check back later!" colors={colors} />
              }
              renderItem={({ item }) => (
                <ListingCard
                  listing={item}
                  isOwn={false}
                  busy={busyId === item.id}
                  gold={gold}
                  onBuy={() => handleBuy(item)}
                  colors={colors}
                  cardBg={cardBg}
                  divider={divider}
                />
              )}
            />
          ) : (
            <ScrollView
              contentContainerStyle={styles.list}
              onScrollBeginDrag={Keyboard.dismiss}
              refreshControl={undefined}
              showsVerticalScrollIndicator={false}
            >
              <Pressable
                onPress={() => setShowSell(true)}
                style={[styles.sellBtn, { borderColor: colors.green }]}
              >
                <Text style={[styles.sellBtnText, { color: colors.green }]}>
                  + List a Creature
                </Text>
              </Pressable>

              {myListings.length === 0 ? (
                <EmptyState text="You have no active listings." colors={colors} />
              ) : (
                myListings.map((item) => (
                  <ListingCard
                    key={item.id}
                    listing={item}
                    isOwn
                    busy={busyId === item.id}
                    gold={gold}
                    onCancel={() => handleCancel(item)}
                    colors={colors}
                    cardBg={cardBg}
                    divider={divider}
                  />
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>

      {/* Sell flow — creature picker + price input */}
      {showSell && (
        <SellFlow
          onClose={() => setShowSell(false)}
          onListed={() => { setShowSell(false); setTab('mine'); refresh(); flash('✓ Creature listed!'); }}
          panelBg={panelBg}
          cardBg={cardBg}
          divider={divider}
          colors={colors}
        />
      )}
    </Modal>
  );
}

// ── ListingCard ───────────────────────────────────────────────────────────────

function ListingCard({
  listing, isOwn, busy, gold, onBuy, onCancel, colors, cardBg, divider,
}: {
  listing:  MarketListing;
  isOwn:    boolean;
  busy:     boolean;
  gold:     number;
  onBuy?:   () => void;
  onCancel?: () => void;
  colors:   ReturnType<typeof useTheme>['colors'];
  cardBg:   string;
  divider:  string;
}) {
  const rarityColor = RARITY_COLOR[listing.rarity] ?? '#8DC99A';
  const canAfford   = gold >= listing.priceGold;
  const isSold      = listing.status !== 'available';

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: divider }]}>
      <View style={styles.cardLeft}>
        <View style={styles.nameRow}>
          <Text style={[styles.creatureName, { color: colors.text }]}>
            {listing.isShiny ? '✨ ' : ''}{listing.creatureName}
          </Text>
          {isSold && (
            <Text style={[styles.soldBadge, {
              backgroundColor: listing.status === 'sold' ? '#065F46' : '#374151',
            }]}>
              {listing.status === 'sold' ? 'SOLD' : 'CANCELLED'}
            </Text>
          )}
        </View>
        <Text style={[styles.speciesName, { color: rarityColor }]}>
          {listing.speciesName} · {listing.rarity}
        </Text>
        {!isOwn && (
          <Text style={[styles.sellerText, { color: colors.textMuted }]}>
            by {listing.sellerName}
          </Text>
        )}
      </View>

      <View style={styles.cardRight}>
        <Text style={[styles.price, { color: colors.gold }]}>
          🪙 {listing.priceGold}
        </Text>
        {!isSold && (
          isOwn ? (
            <Pressable
              onPress={onCancel}
              disabled={busy}
              style={[styles.actionBtn, { borderColor: '#EF4444' }]}
            >
              {busy
                ? <ActivityIndicator size="small" color="#EF4444" />
                : <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Cancel</Text>
              }
            </Pressable>
          ) : (
            <Pressable
              onPress={onBuy}
              disabled={busy || !canAfford}
              style={[styles.actionBtn, {
                backgroundColor: canAfford ? colors.green : undefined,
                borderColor:     canAfford ? colors.green : colors.border,
              }]}
            >
              {busy
                ? <ActivityIndicator size="small" color={canAfford ? '#fff' : colors.textMuted} />
                : <Text style={[styles.actionBtnText, { color: canAfford ? '#fff' : colors.textMuted }]}>
                    Buy
                  </Text>
              }
            </Pressable>
          )
        )}
      </View>
    </View>
  );
}

// ── SellFlow ──────────────────────────────────────────────────────────────────

function SellFlow({
  onClose, onListed, panelBg, cardBg, divider, colors,
}: {
  onClose:  () => void;
  onListed: () => void;
  panelBg:  string;
  cardBg:   string;
  divider:  string;
  colors:   ReturnType<typeof useTheme>['colors'];
}) {
  const creatures = useCreatureStore((s) => s.creatures);
  const owned     = creatures.filter((c) => c.wildExpiresAt === null);

  const [selected, setSelected]   = useState<string | null>(null);
  const [priceStr, setPriceStr]   = useState('100');
  const [listing, setListing]     = useState(false);
  const [error, setError]         = useState('');

  async function handleList() {
    if (!selected || listing) return;
    const price = parseInt(priceStr, 10);
    if (!price || price <= 0) { setError('Enter a valid price'); return; }
    setListing(true);
    const id = await SupabaseService.listCreature(selected, price);
    setListing(false);
    if (id) {
      onListed();
    } else {
      setError('Could not list — offline or invalid creature');
    }
  }

  const selectedCreature = owned.find((c) => c.id === selected);
  const selectedDef      = selectedCreature ? SPECIES_MAP.get(selectedCreature.speciesId) : null;

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sellSheet, { backgroundColor: panelBg }]}>
          <View style={[styles.header, { borderBottomColor: divider }]}>
            <Text style={[styles.title, { color: colors.text }]}>List a Creature</Text>
            <Pressable onPress={onClose} hitSlop={14}>
              <Text style={[styles.closeX, { color: colors.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          {/* Creature list */}
          <Text style={[styles.pickLabel, { color: colors.textMuted }]}>
            Select a creature to sell:
          </Text>
          <ScrollView style={styles.creaturePicker} showsVerticalScrollIndicator={false}>
            {owned.length === 0 ? (
              <Text style={[styles.noCreatures, { color: colors.textMuted }]}>
                No owned creatures available to list.
              </Text>
            ) : (
              owned.map((c) => {
                const def    = SPECIES_MAP.get(c.speciesId);
                const rarity = def?.rarity ?? 'common';
                const isSelected = selected === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setSelected(c.id)}
                    style={[
                      styles.creaturePickRow,
                      { backgroundColor: isSelected ? (colors.green + '33') : cardBg, borderColor: isSelected ? colors.green : divider },
                    ]}
                  >
                    <View style={styles.creaturePickInfo}>
                      <Text style={[styles.creaturePickName, { color: colors.text }]}>
                        {c.isShiny ? '✨ ' : ''}{c.name}
                      </Text>
                      <Text style={[styles.creaturePickSub, { color: RARITY_COLOR[rarity] ?? colors.textMuted }]}>
                        {def?.name} · {rarity}
                      </Text>
                    </View>
                    {isSelected && <Text style={{ color: colors.green, fontSize: 18 }}>✓</Text>}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {/* Price input */}
          {selected && (
            <>
              <Text style={[styles.pickLabel, { color: colors.textMuted }]}>
                Price (Gold):
              </Text>
              <View style={styles.priceRow}>
                <Pressable
                  onPress={() => setPriceStr(String(Math.max(1, (parseInt(priceStr, 10) || 0) - 50)))}
                  style={[styles.priceBtn, { borderColor: divider }]}
                >
                  <Text style={[styles.priceBtnText, { color: colors.text }]}>−50</Text>
                </Pressable>
                <TextInput
                  style={[styles.priceInput, { color: colors.text, borderColor: divider, backgroundColor: cardBg }]}
                  value={priceStr}
                  onChangeText={setPriceStr}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <Pressable
                  onPress={() => setPriceStr(String((parseInt(priceStr, 10) || 0) + 50))}
                  style={[styles.priceBtn, { borderColor: divider }]}
                >
                  <Text style={[styles.priceBtnText, { color: colors.text }]}>+50</Text>
                </Pressable>
              </View>
            </>
          )}

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          {/* Summary + confirm */}
          {selected && selectedDef && (
            <View style={[styles.listSummary, { borderColor: divider }]}>
              <Text style={[styles.summaryText, { color: colors.textMuted }]}>
                Listing <Text style={{ color: colors.text, fontWeight: '700' }}>
                  {selectedCreature?.isShiny ? '✨ ' : ''}{selectedCreature?.name}
                </Text>
                {' '}({selectedDef.name}) for{' '}
                <Text style={{ color: colors.gold, fontWeight: '700' }}>
                  🪙 {priceStr} Gold
                </Text>
                {'\n'}The creature will be removed from your roster until sold or cancelled.
              </Text>
            </View>
          )}

          <Pressable
            onPress={handleList}
            disabled={!selected || listing}
            style={[
              styles.confirmBtn,
              { backgroundColor: selected ? colors.green : colors.border },
            ]}
          >
            {listing
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.confirmBtnText}>Confirm Listing</Text>
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ text, colors }: { text: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>{text}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 300 },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '88%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.24, shadowRadius: 14, elevation: 24,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1,
  },
  title:  { fontSize: 20, fontWeight: '800' },
  closeX: { fontSize: 17, fontWeight: '700' },
  loader: { marginTop: 40 },

  tabBar: {
    flexDirection: 'row', paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  tabBtn:      { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabLabel:    { fontSize: 14, fontWeight: '700' },
  tabUnderline: { position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 2, borderRadius: 2 },

  flashMsg: { textAlign: 'center', fontSize: 13, fontWeight: '700', paddingVertical: 6 },

  list: { padding: 12, gap: 8, paddingBottom: 30 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1, padding: 12, gap: 10,
  },
  cardLeft:    { flex: 1, gap: 2 },
  cardRight:   { alignItems: 'flex-end', gap: 6 },
  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  creatureName: { fontSize: 14, fontWeight: '700' },
  soldBadge: {
    color: '#fff', fontSize: 9, fontWeight: '800',
    borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2,
  },
  speciesName: { fontSize: 12 },
  sellerText:  { fontSize: 11 },
  price:       { fontSize: 15, fontWeight: '800' },
  actionBtn: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', minWidth: 60,
  },
  actionBtnText: { fontSize: 12, fontWeight: '800' },

  sellBtn: {
    borderWidth: 2, borderStyle: 'dashed', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 4,
  },
  sellBtnText: { fontSize: 15, fontWeight: '800' },

  emptyWrap: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center' },

  // SellFlow
  sellSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.24, shadowRadius: 14, elevation: 24,
  },
  pickLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  creaturePicker: { maxHeight: 200, paddingHorizontal: 16 },
  noCreatures:    { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  creaturePickRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 6 },
  creaturePickInfo: { flex: 1, gap: 2 },
  creaturePickName: { fontSize: 14, fontWeight: '700' },
  creaturePickSub:  { fontSize: 11 },

  priceRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  priceBtn:     { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  priceBtnText: { fontSize: 13, fontWeight: '700' },
  priceInput: {
    flex: 1, borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 18, fontWeight: '800', textAlign: 'center',
  },

  listSummary: { borderTopWidth: 1, margin: 16, paddingTop: 12 },
  summaryText: { fontSize: 13, lineHeight: 20 },
  errorText:   { color: '#EF4444', fontSize: 13, textAlign: 'center', paddingBottom: 6 },

  confirmBtn: {
    margin: 16, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
