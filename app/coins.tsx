import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
import { useAppState } from '../lib/storage';

const BG = '#EDE8E1';
const INK = '#1C1C1E';
const MUTED = '#8A8480';
const DIVIDER = '#D8D3CC';
const ORANGE = '#D94F2B';
const GREEN = '#4CC38A';
const YELLOW = '#FFD23F';
const PURPLE = '#8E6BFF';

const PACKS = [
  {
    id: 'p1',
    coins: 100,
    bonus: 0,
    price: '$0.99',
    label: 'Starter',
    tag: 'Small boost',
    color: ORANGE,
  },
  {
    id: 'p2',
    coins: 500,
    bonus: 50,
    price: '$3.99',
    label: 'Handy',
    tag: 'Good for hints',
    color: GREEN,
  },
  {
    id: 'p3',
    coins: 1500,
    bonus: 200,
    price: '$9.99',
    label: 'Best Value',
    tag: 'Most popular',
    color: YELLOW,
    popular: true,
  },
  {
    id: 'p4',
    coins: 5000,
    bonus: 1000,
    price: '$24.99',
    label: 'Mega',
    tag: 'Battle ready',
    color: PURPLE,
  },
  {
    id: 'p5',
    coins: 15000,
    bonus: 4000,
    price: '$59.99',
    label: 'Ultimate',
    tag: 'Power player',
    color: '#E94B8C',
  },
];

const DAILY_REWARDS = [
  { day: 1, coins: 10 },
  { day: 2, coins: 15 },
  { day: 3, coins: 20 },
  { day: 4, coins: 25 },
  { day: 5, coins: 30 },
  { day: 6, coins: 50 },
  { day: 7, coins: 100 },
];

function totalCoins(pack: (typeof PACKS)[number]) {
  return pack.coins + pack.bonus;
}

export default function Coins() {
  const { state, addCoins } = useAppState();
  const insets = useSafeAreaInsets();

  const [selectedPack, setSelectedPack] = useState('p3');
  const [busy, setBusy] = useState(false);
  const [successText, setSuccessText] = useState('');

  const selected = useMemo(
    () => PACKS.find((pack) => pack.id === selectedPack) || PACKS[2],
    [selectedPack]
  );

  const handleBuy = () => {
    if (busy) return;

    const amount = totalCoins(selected);

    setBusy(true);
    addCoins(amount);
    setSuccessText(`+${amount.toLocaleString()} coins added`);

    setTimeout(() => {
      setBusy(false);
      setSuccessText('');
    }, 1200);
  };

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top,
            paddingBottom:
              Platform.OS === 'ios'
                ? Math.max(insets.bottom, 24) + 24
                : Math.max(insets.bottom, 18) + 24,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={INK} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Coin Store</Text>
            <Text style={styles.headerSub}>Upgrade your game power</Text>
          </View>

          <Pressable onPress={() => router.push('/settings')} style={styles.iconBtn}>
            <Ionicons name="settings-outline" size={20} color={INK} />
          </Pressable>
        </View>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <View>
            <Text style={styles.balanceLabel}>YOUR BALANCE</Text>
            <Text style={styles.balanceValue}>{state.coins.toLocaleString()}</Text>
            <Text style={styles.balanceSub}>Available coins</Text>
          </View>

          <View style={styles.bigCoin}>
            <Ionicons name="logo-bitcoin" size={34} color={INK} />
          </View>
        </View>

        {/* Info strip */}
        <View style={styles.infoStrip}>
          <View style={styles.infoIcon}>
            <Ionicons name="flash" size={15} color="#fff" />
          </View>
          <Text style={styles.infoText}>
            For now, purchase button directly adds coins. No payment gateway is connected.
          </Text>
        </View>

        {/* Packages header */}
        <View style={styles.sectionBar}>
          <Text style={styles.sectionLabel}># COIN PACKAGES</Text>
          <Text style={styles.sectionHint}>Tap to select</Text>
        </View>

        <View style={styles.divider} />

        {/* Coin packages */}
        <View style={styles.packsWrap}>
          {PACKS.map((pack, index) => {
            const isSelected = pack.id === selectedPack;
            const amount = totalCoins(pack);

            return (
              <Pressable
                key={pack.id}
                onPress={() => setSelectedPack(pack.id)}
                style={[
                  styles.packCard,
                  isSelected && styles.packCardSelected,
                  pack.popular && styles.packCardPopular,
                ]}
              >
                {pack.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>POPULAR</Text>
                  </View>
                )}

                <View style={styles.packTop}>
                  <Text style={styles.packNum}>0{index + 1}</Text>

                  <View
                    style={[
                      styles.packIcon,
                      {
                        backgroundColor: isSelected ? INK : '#fff',
                        borderColor: isSelected ? INK : DIVIDER,
                      },
                    ]}
                  >
                    <Ionicons
                      name="logo-bitcoin"
                      size={22}
                      color={isSelected ? YELLOW : INK}
                    />
                  </View>
                </View>

                <Text style={styles.packLabel}>{pack.label}</Text>
                <Text style={styles.packCoins}>{amount.toLocaleString()}</Text>

                <View style={styles.packMetaRow}>
                  <Text style={styles.packTag}>{pack.tag}</Text>
                  <Text style={styles.packPrice}>{pack.price}</Text>
                </View>

                {pack.bonus > 0 && (
                  <View style={styles.bonusPill}>
                    <Ionicons name="gift-outline" size={12} color="#fff" />
                    <Text style={styles.bonusText}>
                      +{pack.bonus.toLocaleString()} bonus
                    </Text>
                  </View>
                )}

                {isSelected && (
                  <View style={styles.selectedMark}>
                    <Ionicons name="checkmark" size={13} color="#fff" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Daily rewards */}
        <View style={styles.sectionBar}>
          <Text style={styles.sectionLabel}># DAILY REWARDS</Text>
          <Text style={styles.sectionHint}>Login bonus</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.rewardsRow}>
          {DAILY_REWARDS.map((reward) => (
            <View key={reward.day} style={styles.rewardCard}>
              <Text style={styles.rewardDay}>D{reward.day}</Text>
              <View style={styles.rewardIcon}>
                <Ionicons name="gift-outline" size={15} color={INK} />
              </View>
              <Text style={styles.rewardCoins}>{reward.coins}</Text>
            </View>
          ))}
        </View>

        {/* Selected package */}
        <View style={styles.checkoutCard}>
          <View style={styles.checkoutTop}>
            <View>
              <Text style={styles.checkoutLabel}>SELECTED PACKAGE</Text>
              <Text style={styles.checkoutTitle}>{selected.label}</Text>
              <Text style={styles.checkoutSub}>
                {selected.coins.toLocaleString()} coins
                {selected.bonus > 0
                  ? ` + ${selected.bonus.toLocaleString()} bonus`
                  : ''}
              </Text>
            </View>

            <View style={styles.checkoutPriceBox}>
              <Text style={styles.checkoutPrice}>{selected.price}</Text>
            </View>
          </View>

          <View style={styles.checkoutDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total coins to add</Text>
            <Text style={styles.totalValue}>
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
  safe: {
    flex: 1,
    backgroundColor: BG,
  },

  scroll: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 16,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: DIVIDER,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: DIVIDER,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCenter: {
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: INK,
  },

  headerSub: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
    marginTop: 2,
  },

  balanceCard: {
    backgroundColor: INK,
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: DIVIDER,
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

  infoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
    lineHeight: 17,
  },

  sectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: MUTED,
    letterSpacing: 1.1,
  },

  sectionHint: {
    fontSize: 11,
    fontWeight: '700',
    color: INK,
  },

  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginBottom: 14,
  },

  packsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },

  packCard: {
    width: '48.5%',
    minHeight: 170,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 22,
    padding: 14,
    position: 'relative',
  },

  packCardSelected: {
    borderColor: INK,
    borderWidth: 2,
    backgroundColor: '#FFF8EC',
  },

  packCardPopular: {
    borderColor: YELLOW,
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

  popularText: {
    fontSize: 8,
    fontWeight: '900',
    color: INK,
    letterSpacing: 0.8,
  },

  packTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  packNum: {
    fontSize: 20,
    fontWeight: '900',
    color: DIVIDER,
  },

  packIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  packLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: INK,
  },

  packCoins: {
    fontSize: 28,
    fontWeight: '900',
    color: INK,
    lineHeight: 34,
    marginTop: 4,
  },

  packMetaRow: {
    marginTop: 6,
    gap: 2,
  },

  packTag: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
  },

  packPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: ORANGE,
    marginTop: 2,
  },

  bonusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: INK,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 10,
  },

  bonusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },

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
    backgroundColor: '#fff',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: DIVIDER,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 5,
  },

  rewardDay: {
    fontSize: 9,
    fontWeight: '900',
    color: MUTED,
  },

  rewardIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: YELLOW,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rewardCoins: {
    fontSize: 11,
    fontWeight: '900',
    color: INK,
  },

  checkoutCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DIVIDER,
    padding: 16,
  },

  checkoutTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  checkoutLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: MUTED,
    letterSpacing: 0.9,
  },

  checkoutTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: INK,
    marginTop: 4,
  },

  checkoutSub: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
    marginTop: 2,
  },

  checkoutPriceBox: {
    backgroundColor: INK,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },

  checkoutPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
  },

  checkoutDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 14,
  },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  totalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: MUTED,
  },

  totalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: INK,
  },

  buyBtn: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  buyBtnDisabled: {
    opacity: 0.85,
  },

  buyBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#fff',
  },
});