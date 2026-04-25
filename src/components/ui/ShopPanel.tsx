/**
 * ShopPanel — full-screen modal listing all 5 IAP products.
 *
 * Products:
 *   wilds_pass_monthly   subscription  €2.99/mo
 *   wilds_remove_ads     non-consumable €3.99
 *   wilds_starter_pack   consumable    €0.99 (first 48 h only)
 *   wilds_crystal_pack   consumable    €1.99
 *   wilds_crystal_pack_xl consumable   €4.99
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PurchaseService } from '../../services/PurchaseService';
import { usePurchaseStore } from '../../store/purchaseStore';
import { useTheme } from '../../constants/theme';
import type { PurchasesPackage } from 'react-native-purchases';

// ── Product catalogue ────────────────────────────────────────────────────────

const FORTY_EIGHT_H = 48 * 3_600_000;

interface CatalogEntry {
  id:           string;
  icon:         string;
  name:         string;
  tagline:      string;
  fallbackPrice: string;
  highlight?:   string;
  /** hex colour for the highlight badge */
  badgeColor?:  string;
}

const CATALOG: CatalogEntry[] = [
  {
    id:           'wilds_pass_monthly',
    icon:         '⚡',
    name:         'Wilds Pass',
    tagline:      'No ads  ·  ×1.2 production  ·  +1 creature slot',
    fallbackPrice: '€2.99 / month',
    highlight:    'Best Value',
    badgeColor:   '#6ABF7B',
  },
  {
    id:           'wilds_remove_ads',
    icon:         '🚫',
    name:         'Remove Ads',
    tagline:      'Remove all ads forever — one-time purchase',
    fallbackPrice: '€3.99',
  },
  {
    id:           'wilds_starter_pack',
    icon:         '🎁',
    name:         'Starter Pack',
    tagline:      '50 Gold  +  5 Crystals  ·  First 48 hours only',
    fallbackPrice: '€0.99',
    highlight:    'Limited',
    badgeColor:   '#F59E0B',
  },
  {
    id:           'wilds_crystal_pack',
    icon:         '💎',
    name:         'Crystal Pack',
    tagline:      '20 Crystals',
    fallbackPrice: '€1.99',
  },
  {
    id:           'wilds_crystal_pack_xl',
    icon:         '💎',
    name:         'Crystal Pack XL',
    tagline:      '60 Crystals',
    fallbackPrice: '€4.99',
    highlight:    '+50% more',
    badgeColor:   '#7C3AED',
  },
];

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export default function ShopPanel({ onClose }: Props) {
  const { colors, isDark } = useTheme();

  const isAdFree     = usePurchaseStore((s) => s.isAdFree);
  const isPremiumPass = usePurchaseStore((s) => s.isPremiumPass);
  const firstInstallAt = usePurchaseStore((s) => s.firstInstallAt);

  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    PurchaseService.getOfferings().then((offs) => {
      setPackages(offs?.current?.availablePackages ?? []);
    });
  }, []);

  function priceFor(productId: string): string {
    const pkg = packages?.find((p) => p.product.identifier === productId);
    return pkg?.product.priceString
      ?? CATALOG.find((c) => c.id === productId)?.fallbackPrice
      ?? '';
  }

  async function handleBuy(productId: string) {
    if (loadingId || restoring) return;
    setLoadingId(productId);
    await PurchaseService.purchase(productId);
    setLoadingId(null);
  }

  async function handleRestore() {
    if (loadingId || restoring) return;
    setRestoring(true);
    await PurchaseService.restore();
    setRestoring(false);
  }

  const panelBg  = isDark ? '#1C1C1E' : '#FFFDF4';
  const cardBg   = isDark ? '#2C2C2E' : '#FFFFFF';
  const divider  = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(80,60,20,0.10)';

  const now             = Date.now();
  const starterVisible  = firstInstallAt === 0 || now - firstInstallAt < FORTY_EIGHT_H;

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
        <View style={[styles.sheet, { backgroundColor: panelBg }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: divider }]}>
            <Text style={[styles.title, { color: colors.text }]}>🛒  Shop</Text>
            <Pressable onPress={onClose} hitSlop={14}>
              <Text style={[styles.closeX, { color: colors.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {packages === null ? (
              <ActivityIndicator color={colors.green} style={styles.loader} />
            ) : (
              CATALOG.map((entry) => {
                if (entry.id === 'wilds_starter_pack' && !starterVisible) return null;

                const isActive  = entry.id === 'wilds_pass_monthly' && isPremiumPass;
                const isOwned   = entry.id === 'wilds_remove_ads'   && isAdFree;
                const isBusy    = loadingId === entry.id;

                return (
                  <View
                    key={entry.id}
                    style={[styles.card, { backgroundColor: cardBg, borderColor: divider }]}
                  >
                    {/* Badge */}
                    {entry.highlight && (
                      <View style={[styles.badge, { backgroundColor: entry.badgeColor ?? colors.green }]}>
                        <Text style={styles.badgeText}>{entry.highlight}</Text>
                      </View>
                    )}

                    <View style={styles.cardBody}>
                      <Text style={styles.cardIcon}>{entry.icon}</Text>
                      <View style={styles.cardInfo}>
                        <Text style={[styles.cardName, { color: colors.text }]}>{entry.name}</Text>
                        <Text style={[styles.cardTagline, { color: colors.textMuted }]}>
                          {entry.tagline}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.cardFooter, { borderTopColor: divider }]}>
                      <Text style={[styles.price, { color: colors.gold }]}>
                        {priceFor(entry.id)}
                      </Text>
                      <BuyButton
                        isActive={isActive}
                        isOwned={isOwned}
                        loading={isBusy}
                        disabled={!!loadingId || restoring || isActive || isOwned}
                        onPress={() => handleBuy(entry.id)}
                        colors={colors}
                      />
                    </View>
                  </View>
                );
              })
            )}

            {/* Restore purchases */}
            <Pressable
              onPress={handleRestore}
              disabled={restoring || !!loadingId}
              style={styles.restoreRow}
            >
              {restoring
                ? <ActivityIndicator size="small" color={colors.textMuted} />
                : <Text style={[styles.restoreText, { color: colors.textMuted }]}>
                    Restore Purchases
                  </Text>
              }
            </Pressable>

            <Text style={[styles.legalNote, { color: colors.textMuted }]}>
              Prices include applicable taxes. Subscriptions renew automatically
              unless cancelled 24 h before the renewal date.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── BuyButton ─────────────────────────────────────────────────────────────────

function BuyButton({
  isActive, isOwned, loading, disabled, onPress, colors,
}: {
  isActive: boolean;
  isOwned:  boolean;
  loading:  boolean;
  disabled: boolean;
  onPress:  () => void;
  colors:   ReturnType<typeof useTheme>['colors'];
}) {
  const label = loading ? '…' : isActive ? 'Active' : isOwned ? 'Owned' : 'Buy';
  const bg    = isActive || isOwned ? '#065F46' : colors.green;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.buyBtn,
        { backgroundColor: bg },
        pressed && !disabled && { opacity: 0.8 },
      ]}
    >
      {loading
        ? <ActivityIndicator size="small" color="#fff" />
        : <Text style={styles.buyBtnText}>{label}</Text>
      }
    </Pressable>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 300,
  },
  sheet: {
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 24,
  },
  header: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: 20,
    paddingTop:      18,
    paddingBottom:   12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize:   20,
    fontWeight: '800',
  },
  closeX: {
    fontSize:   17,
    fontWeight: '700',
  },
  list: {
    padding:     16,
    gap:         12,
    paddingBottom: 36,
  },
  loader: {
    marginTop: 40,
  },
  card: {
    borderRadius:  14,
    borderWidth:   1,
    overflow:      'hidden',
  },
  badge: {
    alignSelf:     'flex-start',
    borderRadius:  6,
    paddingHorizontal: 8,
    paddingVertical:   3,
    marginTop:     10,
    marginLeft:    12,
  },
  badgeText: {
    color:      '#fff',
    fontSize:   10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems:    'center',
    padding:       14,
    gap:           12,
  },
  cardIcon: {
    fontSize: 32,
  },
  cardInfo: {
    flex: 1,
    gap:  3,
  },
  cardName: {
    fontSize:   15,
    fontWeight: '700',
  },
  cardTagline: {
    fontSize: 12,
  },
  cardFooter: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 14,
    paddingVertical:   10,
    borderTopWidth:    1,
  },
  price: {
    fontSize:   15,
    fontWeight: '700',
  },
  buyBtn: {
    borderRadius:       10,
    paddingHorizontal:  18,
    paddingVertical:    8,
    minWidth:           72,
    alignItems:         'center',
  },
  buyBtnText: {
    color:      '#fff',
    fontWeight: '800',
    fontSize:   13,
  },
  restoreRow: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  restoreText: {
    fontSize:          13,
    textDecorationLine: 'underline',
  },
  legalNote: {
    fontSize:    10,
    textAlign:   'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
