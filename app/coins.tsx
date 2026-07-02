import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../lib/appTheme';
import { useAppState } from '../lib/storage';
import { playTapSound } from '../lib/audio';
import { goBackOrHome } from '../lib/navigation';

const ORANGE = '#D94F2B';
const GREEN = '#4CC38A';
const YELLOW = '#FFD23F';
const PURPLE = '#8E6BFF';

const PACKS = [
  { id: 'p1', coins: 100, bonus: 0, price: '$0.99', label: 'Starter', tag: 'Small boost', color: ORANGE },
  { id: 'p2', coins: 500, bonus: 50, price: '$3.99', label: 'Handy', tag: 'Good for hints', color: GREEN },
  { id: 'p3', coins: 1500, bonus: 200, price: '$9.99', label: 'Best Value', tag: 'Most popular', color: YELLOW, popular: true },
  { id: 'p4', coins: 5000, bonus: 1000, price: '$24.99', label: 'Mega', tag: 'Battle ready', color: PURPLE },
  { id: 'p5', coins: 15000, bonus: 4000, price: '$59.99', label: 'Ultimate', tag: 'Power player', color: '#E94B8C' },
];

const DAILY_REWARDS = [
  { day: 1, coins: 10 }, { day: 2, coins: 15 }, { day: 3, coins: 20 },
  { day: 4, coins: 25 }, { day: 5, coins: 30 }, { day: 6, coins: 50 }, { day: 7, coins: 100 },
];

function totalCoins(pack: (typeof PACKS)[number]) {
  return pack.coins + pack.bonus;
}

export default function Coins() {
  const { C } = useAppTheme();
  const { state, addCoins } = useAppState();
  const insets = useSafeAreaInsets();

  const [selectedPack, setSelectedPack] = useState('p3');
  const [busy, setBusy] = useState(false);
  const [successText, setSuccessText] = useState('');

  const selected = useMemo(() => PACKS.find((p) => p.id === selectedPack) ?? PACKS[2], [selectedPack]);

  const balanceCardBg = '#1C1C1E';
  const packSelectedBg = 'rgba(217,79,43,0.28)';

  const handleBuy = () => {
    if (busy) return;
    const amount = totalCoins(selected);
    setBusy(true);
    addCoins(amount);
    setSuccessText(`+${amount.toLocaleString()} coins added`);
    setTimeout(() => { setBusy(false); setSuccessText(''); }, 1200);
  };

  return (
    <View style={styles.safe}>
      <Image source={require('../assets/images/wordrush-arena-background.png')} style={StyleSheet.absoluteFill} contentFit="cover" />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top,
            paddingBottom: 160,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => { playTapSound(state.settings.sound).catch(() => {}); goBackOrHome(); }} style={[styles.iconBtn, { backgroundColor: C.surface, borderColor: C.divider }]}>
            <Ionicons name="chevron-back" size={22} color={C.ink} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: C.ink }]}>Coin Store</Text>
            <Text style={[styles.headerSub, { color: C.muted }]}>Upgrade your game power</Text>
          </View>

          <View style={{ width: 42 }} />
        </View>

        {/* Balance card */}
        <View style={[styles.balanceCard, { backgroundColor: balanceCardBg }]}>
          <View>
            <Text style={styles.balanceLabel}>YOUR BALANCE</Text>
            <Text style={styles.balanceValue}>{state.coins.toLocaleString()}</Text>
            <Text style={styles.balanceSub}>Available coins</Text>
          </View>
          <View style={styles.bigCoin}>
            <Ionicons name="logo-bitcoin" size={34} color="#1C1C1E" />
          </View>
        </View>

        {/* Info strip */}
        <View style={[styles.infoStrip, { backgroundColor: C.surface, borderColor: C.divider }]}>
          <View style={styles.infoIcon}>
            <Ionicons name="flash" size={15} color="#fff" />
          </View>
          <Text style={[styles.infoText, { color: C.muted }]}>
            For now, purchase button directly adds coins. No payment gateway is connected.
          </Text>
        </View>

        {/* Packages header */}
        <View style={styles.sectionBar}>
          <Text style={[styles.sectionLabel, { color: C.muted }]}># COIN PACKAGES</Text>
          <Text style={[styles.sectionHint, { color: C.ink }]}>Tap to select</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: C.divider }]} />

        {/* Coin packages */}
        <View style={styles.packsWrap}>
          {PACKS.map((pack, index) => {
            const isSelected = pack.id === selectedPack;
            const amount = totalCoins(pack);

            return (
              <Pressable
                key={pack.id}
                onPress={() => setSelectedPack(pack.id)}
                android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false }}
                style={({ pressed }) => [
                  styles.packCard,
                  {
                    backgroundColor: isSelected ? packSelectedBg : C.surface,
                    borderColor: isSelected ? ORANGE : pack.popular ? YELLOW : C.divider,
                    borderWidth: isSelected ? 2 : 1,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                {pack.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>POPULAR</Text>
                  </View>
                )}

                <View style={styles.packTop}>
                  <Text style={[styles.packNum, { color: C.divider }]}>0{index + 1}</Text>
                  <View style={[styles.packIcon, { backgroundColor: isSelected ? C.ink : C.bg, borderColor: isSelected ? C.ink : C.divider }]}>
                    <Ionicons name="logo-bitcoin" size={22} color={isSelected ? YELLOW : C.ink} />
                  </View>
                </View>

                <Text style={[styles.packLabel, { color: C.ink }]}>{pack.label}</Text>
                <Text style={[styles.packCoins, { color: C.ink }]}>{amount.toLocaleString()}</Text>

                <View style={styles.packMetaRow}>
                  <Text style={[styles.packTag, { color: C.muted }]}>{pack.tag}</Text>
                  <Text style={styles.packPrice}>{pack.price}</Text>
                </View>

                {pack.bonus > 0 && (
                  <View style={[styles.bonusPill, { backgroundColor: C.ink }]}>
                    <Ionicons name="gift-outline" size={12} color={C.bg} />
                    <Text style={[styles.bonusText, { color: C.bg }]}>
                      +{pack.bonus.toLocaleString()} bonus
                    </Text>
                  </View>
                )}

                {isSelected && (
                  <View style={styles.selectedMark}>
                    <Ionicons name="checkmark" size={13} color="#0e0b0b" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Daily rewards */}
        <View style={styles.sectionBar}>
          <Text style={[styles.sectionLabel, { color: C.muted }]}># DAILY REWARDS</Text>
          <Text style={[styles.sectionHint, { color: C.ink }]}>Login bonus</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: C.divider }]} />

        <View style={styles.rewardsRow}>
          {DAILY_REWARDS.map((reward) => (
            <View key={reward.day} style={[styles.rewardCard, { backgroundColor: C.surface, borderColor: C.divider }]}>
              <Text style={[styles.rewardDay, { color: C.muted }]}>D{reward.day}</Text>
              <View style={styles.rewardIcon}>
                <Ionicons name="gift-outline" size={15} color="#1C1C1E" />
              </View>
              <Text style={[styles.rewardCoins, { color: C.ink }]}>{reward.coins}</Text>
            </View>
          ))}
        </View>

        {/* Checkout card */}
        <View style={[styles.checkoutCard, { backgroundColor: C.surface, borderColor: C.divider }]}>
          <View style={styles.checkoutTop}>
            <View>
              <Text style={[styles.checkoutLabel, { color: C.muted }]}>SELECTED PACKAGE</Text>
              <Text style={[styles.checkoutTitle, { color: C.ink }]}>{selected.label}</Text>
              <Text style={[styles.checkoutSub, { color: C.muted }]}>
                {selected.coins.toLocaleString()} coins
                {selected.bonus > 0 ? ` + ${selected.bonus.toLocaleString()} bonus` : ''}
              </Text>
            </View>

            <View style={[styles.checkoutPriceBox, { backgroundColor: C.ink }]}>
              <Text style={[styles.checkoutPrice, { color: C.bg }]}>{selected.price}</Text>
            </View>
          </View>

          <View style={[styles.checkoutDivider, { backgroundColor: C.divider }]} />

          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: C.muted }]}>Total coins to add</Text>
            <Text style={[styles.totalValue, { color: C.ink }]}>
              {totalCoins(selected).toLocaleString()}
            </Text>
          </View>

          <Pressable
            disabled={busy}
            onPress={handleBuy}
            style={[styles.buyBtn, busy && styles.buyBtnDisabled]}
          >
            {successText ? (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.buyBtnText}>{successText}</Text>
              </>
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.buyBtnText}>Complete Purchase</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 20 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 16,
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCenter: { alignItems: 'center' },

  headerTitle: { fontSize: 18, fontWeight: '900' },
  headerSub: { fontSize: 11, fontWeight: '700', marginTop: 2 },

  balanceCard: {
    borderRadius: 26,
    padding: 22,
    minHeight: 146,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },

  balanceLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#B8B1AB',
    letterSpacing: 1,
  },

  balanceValue: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 48,
    marginTop: 8,
  },

  balanceSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B8B1AB',
    marginTop: 2,
  },

  bigCoin: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: YELLOW,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
  },

  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
    marginBottom: 20,
  },

  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoText: { flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 17 },

  sectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },

  sectionLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  sectionHint: { fontSize: 11, fontWeight: '700' },

  divider: { height: 1, marginBottom: 14 },

  packsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },

  packCard: {
    width: '48.5%',
    minHeight: 170,
    borderRadius: 22,
    padding: 14,
    position: 'relative',
  },

  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 14,
    backgroundColor: YELLOW,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    zIndex: 2,
  },

  popularText: { fontSize: 8, fontWeight: '900', color: '#1C1C1E', letterSpacing: 0.8 },

  packTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  packNum: { fontSize: 20, fontWeight: '900' },

  packIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  packLabel: { fontSize: 13, fontWeight: '900' },
  packCoins: { fontSize: 28, fontWeight: '900', lineHeight: 34, marginTop: 4 },

  packMetaRow: { marginTop: 6, gap: 2 },

  packTag: { fontSize: 11, fontWeight: '700' },
  packPrice: { fontSize: 13, fontWeight: '900', color: ORANGE, marginTop: 2 },

  bonusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 10,
  },

  bonusText: { fontSize: 10, fontWeight: '800' },

  selectedMark: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rewardsRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 22,
  },

  rewardCard: {
    flex: 1,
    borderRadius: 15,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 5,
  },

  rewardDay: { fontSize: 9, fontWeight: '900' },

  rewardIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: YELLOW,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rewardCoins: { fontSize: 11, fontWeight: '900' },

  checkoutCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },

  checkoutTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  checkoutLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },
  checkoutTitle: { fontSize: 22, fontWeight: '900', marginTop: 4 },
  checkoutSub: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  checkoutPriceBox: {
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },

  checkoutPrice: { fontSize: 14, fontWeight: '900' },

  checkoutDivider: { height: 1, marginVertical: 14 },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  totalLabel: { fontSize: 13, fontWeight: '800' },
  totalValue: { fontSize: 22, fontWeight: '900' },

  buyBtn: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  buyBtnDisabled: { opacity: 0.85 },

  buyBtnText: { fontSize: 15, fontWeight: '900', color: '#fff' },
});

