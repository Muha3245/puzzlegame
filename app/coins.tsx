import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '../components/ui/GlassCard';
import { HighlightText } from '../components/HighlightText';
import { Theme } from '../constants/theme';
import { useAppState } from '../lib/storage';

const BG_URI =
  'https://images.unsplash.com/photo-1605792657660-596af9009e82?auto=format&fit=crop&w=1200&q=80';

const PACKS = [
  { id: 'p1', coins: 100,   price: '$0.99',  label: 'Starter',    color: '#FF7A00' },
  { id: 'p2', coins: 500,   price: '$3.99',  label: 'Handy',      color: '#4CC38A', bonus: '+50' },
  { id: 'p3', coins: 1500,  price: '$9.99',  label: 'Best Value', color: '#FFD23F', bonus: '+200', popular: true },
  { id: 'p4', coins: 5000,  price: '$24.99', label: 'Mega',       color: '#E94B8C', bonus: '+1000' },
  { id: 'p5', coins: 15000, price: '$59.99', label: 'Ultimate',   color: '#B36AE2', bonus: '+4000' },
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

export default function Coins() {
  const { state, addCoins } = useAppState();
  const [selectedPack, setSelectedPack] = useState('p3');
  const [busy, setBusy] = useState<'idle' | 'processing' | 'done'>('idle');

  const selected = PACKS.find((p) => p.id === selectedPack)!;

  const handleBuy = () => {
    setBusy('processing');
    setTimeout(() => {
      setBusy('done');
      addCoins(selected.coins);
      setTimeout(() => {
        setSelectedPack('p3');
        setBusy('idle');
      }, 800);
    }, 1200);
  };

  return (
    <ImageBackground source={{ uri: BG_URI }} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <HighlightText size="large">Get Coins</HighlightText>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Current coins display */}
          <GlassCard style={styles.coinsCard}>
            <View style={styles.coinsDisplay}>
              <View style={styles.coinIcon}>
                <Ionicons name="logo-bitcoin" size={32} color={Theme.warn} />
              </View>
              <View>
                <Text style={styles.coinLabel}>Your Balance</Text>
                <HighlightText size="large" color={Theme.warn}>
                  {state.coins} coins
                </HighlightText>
              </View>
            </View>
          </GlassCard>

          {/* Info banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={18} color={Theme.primary} />
            <Text style={styles.infoText}>Spend coins on hints & power-ups. No ads. +10 free per level.</Text>
          </View>

          {/* Coin packs */}
          <HighlightText
            size="small"
            color={Theme.textDim}
            style={styles.sectionTitle}
          >
            COIN PACKAGES
          </HighlightText>

          <View style={styles.packsGrid}>
            {PACKS.map((pack) => {
              const isSelected = pack.id === selectedPack;
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

                  <View
                    style={[
                      styles.packIcon,
                      { backgroundColor: `${pack.color}22`, borderColor: pack.color },
                    ]}
                  >
                    <Text style={styles.coinEmoji}>💰</Text>
                  </View>

                  <HighlightText
                    size="small"
                    color={pack.color}
                    style={styles.packLabel}
                  >
                    {pack.label}
                  </HighlightText>

                  <HighlightText size="large">{pack.coins}</HighlightText>

                  {pack.bonus && (
                    <Text style={[styles.bonusText, { color: pack.color }]}>
                      {pack.bonus}
                    </Text>
                  )}

                  <Text style={styles.priceText}>{pack.price}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Daily rewards section */}
          <HighlightText
            size="small"
            color={Theme.textDim}
            style={styles.sectionTitle}
          >
            7-DAY LOGIN REWARDS
          </HighlightText>

          <View style={styles.rewardsGrid}>
            {DAILY_REWARDS.map((reward) => (
              <View key={reward.day} style={styles.rewardItem}>
                <View style={styles.rewardDay}>
                  <Text style={styles.rewardDayText}>Day {reward.day}</Text>
                </View>
                <Ionicons name="gift" size={20} color={Theme.warn} />
                <Text style={styles.rewardCoins}>{reward.coins}</Text>
              </View>
            ))}
          </View>

          {/* Buy button */}
          <View style={styles.buySection}>
            <GlassCard style={styles.selectedPackInfo}>
              <Text style={styles.selectedLabel}>Selected Package</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Text style={{ fontSize: 24 }}>📦</Text>
                <View style={{ flex: 1 }}>
                  <HighlightText color={selected.color}>
                    {selected.label}
                  </HighlightText>
                  <Text style={styles.selectedSub}>
                    {selected.coins} coins • {selected.price}
                  </Text>
                </View>
              </View>
            </GlassCard>

            <Pressable
              disabled={busy !== 'idle'}
              onPress={handleBuy}
              style={[styles.buyBtn, busy !== 'idle' && styles.buyBtnDisabled]}
            >
              {busy === 'done' ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={Theme.success} />
                  <Text style={styles.buyBtnText}>Purchase Complete!</Text>
                </>
              ) : busy === 'processing' ? (
                <Text style={styles.buyBtnText}>Processing...</Text>
              ) : (
                <>
                  <Ionicons name="card" size={20} color="#fff" />
                  <Text style={styles.buyBtnText}>Complete Purchase</Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: '#0D0500',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,5,0,0.84)',
  },
  orb1: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,100,0,0.13)',
  },
  orb2: {
    position: 'absolute',
    bottom: 60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,60,0,0.09)',
  },
  safe: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,120,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,150,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  coinsCard: {
    marginBottom: 16,
    padding: 16,
  },

  coinsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  coinIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(255,210,63,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  coinLabel: {
    color: Theme.textDim,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,120,0,0.12)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,150,0,0.22)',
  },

  infoText: {
    flex: 1,
    color: Theme.textDim,
    fontSize: 12,
    fontWeight: '600',
  },

  sectionTitle: {
    marginTop: 12,
    marginBottom: 12,
    letterSpacing: 1.2,
  },

  packsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },

  packCard: {
    width: '48.5%',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,150,0,0.16)',
  },

  packCardSelected: {
    backgroundColor: 'rgba(255,120,0,0.18)',
    borderColor: Theme.primary,
    borderWidth: 2,
  },

  packCardPopular: {
    borderColor: Theme.warn,
  },

  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: Theme.warn,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  popularText: {
    color: '#0D0500',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  packIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    fontSize: 24,
  },

  coinEmoji: {
    fontSize: 24,
  },

  packLabel: {
    fontSize: 11,
    marginTop: 4,
  },

  bonusText: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },

  priceText: {
    color: Theme.textMute,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },

  rewardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },

  rewardItem: {
    width: '32%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,150,0,0.16)',
  },

  rewardDay: {
    backgroundColor: 'rgba(255,120,0,0.20)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  rewardDayText: {
    color: Theme.primary,
    fontSize: 10,
    fontWeight: '800',
  },

  rewardCoins: {
    color: Theme.warn,
    fontSize: 12,
    fontWeight: '900',
  },

  buySection: {
    gap: 12,
  },

  selectedPackInfo: {
    padding: 14,
  },

  selectedLabel: {
    color: Theme.textDim,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  selectedSub: {
    color: Theme.textMute,
    fontSize: 11,
    marginTop: 2,
  },

  buyBtn: {
    backgroundColor: Theme.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: Theme.primary,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 7,
  },

  buyBtnDisabled: {
    opacity: 0.6,
  },

  buyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
});
