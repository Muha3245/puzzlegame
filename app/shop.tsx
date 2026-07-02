// app/shop.tsx
// Coin shop modal — pack picker + payment methods + buy button.

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Sheet } from '../components/Sheet';
import { Theme } from '../constants/theme';
import { goBackOrHome } from '../lib/navigation';
import { useAppState } from '../lib/storage';

const PACKS = [
  { id: 'p1', coins: 100,   price: '$0.99',  label: 'Starter',    color: '#5B9BFF' },
  { id: 'p2', coins: 500,   price: '$3.99',  label: 'Handy',      color: '#4CC38A', bonus: '+50' },
  { id: 'p3', coins: 1500,  price: '$9.99',  label: 'Best Value', color: '#FFD23F', bonus: '+200', popular: true },
  { id: 'p4', coins: 5000,  price: '$24.99', label: 'Mega',       color: '#E94B8C', bonus: '+1000' },
  { id: 'p5', coins: 15000, price: '$59.99', label: 'Ultimate',   color: '#B36AE2', bonus: '+4000' },
];

const METHODS = [
  { id: 'card',   label: 'Card',       sub: '•••• 4242' },
  { id: 'apple',  label: 'Apple Pay',  sub: 'Touch ID' },
  { id: 'google', label: 'Google Pay', sub: 'Default' },
];

export default function Shop() {
  const { addCoins } = useAppState();
  const [pack, setPack] = useState('p3');
  const [method, setMethod] = useState('card');
  const [busy, setBusy] = useState<'idle' | 'processing' | 'done'>('idle');

  const selected = PACKS.find((p) => p.id === pack)!;

  const close = goBackOrHome;

  const buy = () => {
    setBusy('processing');
    setTimeout(() => {
      setBusy('done');
      addCoins(selected.coins);
      setTimeout(close, 1100);
    }, 1200);
  };

  return (
    <Sheet visible title="Get Coins" onClose={close}>
      <View style={styles.note}>
        <View style={styles.noteCoin}><Text style={{ color: '#3F2E10', fontWeight: '900' }}>$</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Spend coins on hints & power-ups</Text>
          <Text style={{ color: Theme.textDim, fontSize: 11, marginTop: 1 }}>No ads. +10 free per level finished.</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {PACKS.map((p) => {
          const sel = p.id === pack;
          return (
            <Pressable
              key={p.id}
              onPress={() => setPack(p.id)}
              style={[
                styles.pack,
                p.id === 'p5' && { width: '100%' },
                { backgroundColor: sel ? p.color : 'rgba(255,255,255,0.05)', borderColor: sel ? p.color : 'rgba(255,255,255,0.08)' },
              ]}
            >
              {p.popular && (
                <View style={styles.popularBadge}><Text style={styles.popularTxt}>MOST POPULAR</Text></View>
              )}
              <Text style={{ fontSize: 10, fontWeight: '800', color: sel ? 'rgba(255,255,255,0.85)' : Theme.textDim, letterSpacing: 1 }}>
                {p.label.toUpperCase()}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>{p.coins.toLocaleString()}</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: sel ? '#fff' : Theme.warn }}>coins</Text>
              </View>
              {p.bonus && (
                <View style={[styles.bonus, { backgroundColor: sel ? 'rgba(0,0,0,0.18)' : 'rgba(76,195,138,0.15)' }]}>
                  <Text style={{ color: sel ? '#fff' : Theme.success, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>BONUS {p.bonus}</Text>
                </View>
              )}
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#fff', marginTop: 10 }}>{p.price}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.section}>PAYMENT METHOD</Text>
      <View style={{ gap: 6 }}>
        {METHODS.map((m) => {
          const sel = m.id === method;
          return (
            <Pressable
              key={m.id}
              onPress={() => setMethod(m.id)}
              style={[
                styles.method,
                { backgroundColor: sel ? 'rgba(91,155,255,0.15)' : 'rgba(255,255,255,0.04)', borderColor: sel ? Theme.primary : 'rgba(255,255,255,0.08)' },
              ]}
            >
              <View style={styles.methodIcon}><Text style={{ color: '#fff', fontWeight: '900' }}>{m.id === 'card' ? '🪪' : m.id === 'apple' ? '' : 'G'}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>{m.label}</Text>
                <Text style={{ color: Theme.textDim, fontSize: 11 }}>{m.sub}</Text>
              </View>
              <View style={[styles.radio, { borderColor: sel ? Theme.primary : 'rgba(255,255,255,0.2)', backgroundColor: sel ? Theme.primary : 'transparent' }]}>
                {sel && <View style={styles.radioDot} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Pressable onPress={buy} disabled={busy !== 'idle'} style={[styles.buyBtn, busy === 'done' && { backgroundColor: Theme.success }]}>
        <Text style={[styles.buyTxt, busy === 'done' && { color: '#fff' }]}>
          {busy === 'done' ? '✓ Purchase Complete'
            : busy === 'processing' ? 'Processing…'
            : `Buy ${selected.coins.toLocaleString()} coins — ${selected.price}`}
        </Text>
      </Pressable>
      <Text style={styles.legal}>Mock payment for prototype demo. No actual charges.</Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, marginBottom: 16,
    backgroundColor: 'rgba(255,210,63,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,210,63,0.2)',
  },
  noteCoin: { width: 32, height: 32, borderRadius: 16, backgroundColor: Theme.warn, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pack: {
    width: '47%', padding: 14, borderRadius: 16, borderWidth: 2,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute', top: -8, right: 10,
    backgroundColor: '#FF6B9F', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  popularTxt: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  bonus: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  section: { color: Theme.textDim, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 18, marginBottom: 8 },
  method: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 10, borderRadius: 12, borderWidth: 1,
  },
  methodIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  buyBtn: {
    marginTop: 18, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
    backgroundColor: Theme.warn,
  },
  buyTxt: { color: '#3F2E10', fontWeight: '900', fontSize: 15, letterSpacing: 0.4 },
  legal: { fontSize: 10, color: Theme.textMute, textAlign: 'center', marginTop: 10 },
});
