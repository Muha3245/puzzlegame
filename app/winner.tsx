// app/winner.tsx
// Victory / Battle result screen — handles both pass-and-play and live battle modes.

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { ScreenLayout } from '../components/ui/ScreenLayout';
import { HighlightText } from '../components/HighlightText';
import { Theme, GlassEffects } from '../constants/theme';
import { useAppState } from '../lib/storage';
import { playGameSound } from '../lib/audio';
import {
  acceptBattleRoom,
  BattleRoom,
  createBattleRoom,
  getBattleRooms,
  PublicUser,
  rejectBattleRoom,
} from '../lib/online';
import { getRandomBattleLevel } from '../lib/battleHelpers';
import { DifficultyPickerModal } from '../components/DifficultyPickerModal';

export default function Winner() {
  const params = useLocalSearchParams<{
    winner?: string; p1?: string; p2?: string;
    s1?: string; s2?: string; coins?: string;
    id?: string; categoryKey?: string; difficulty?: string; level?: string;
    isBattle?: string; title?: string; opponentId?: string; opponentName?: string;
  }>();
  const { addCoins, state } = useAppState();
  const [rematchBusy, setRematchBusy] = useState(false);
  const [showDiffPicker, setShowDiffPicker] = useState(false);
  const [incomingRematch, setIncomingRematch] = useState<BattleRoom | null>(null);
  const [acceptRematchBusy, setAcceptRematchBusy] = useState(false);
  const incomingShownRef = useRef<Set<string>>(new Set());
  const staleIncomingRoomIdsRef = useRef<Set<string>>(new Set());
  const initialIncomingScanDoneRef = useRef(false);
  const navigatingRef = useRef(false);
  const [rematchStatus, setRematchStatus] = useState<string | null>(null);

  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const buildBattleUrl = (room: BattleRoom) =>
    `/game?id=${room.categoryId}&categoryKey=${room.categoryKey}&title=${encodeURIComponent(
      room.categoryTitle,
    )}&difficulty=${room.difficulty}&level=${room.level}&mode=battle&roomId=${room.id}`;

  const openBattleRoom = (room: BattleRoom) => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    setIncomingRematch(null);
    setShowDiffPicker(false);
    setRematchStatus(null);
    router.replace(buildBattleUrl(room) as any);
  };

  const isIncomingFromOpponent = (room: BattleRoom) =>
    !!params.opponentId &&
    room.player1Id === params.opponentId &&
    room.status === 'pending';

  const isStaleIncomingRoom = (room: BattleRoom) =>
    staleIncomingRoomIdsRef.current.has(String(room.id ?? ''));

  const roomIdSortValue = (room: BattleRoom) => String(room.id ?? '');


  const winner    = params.winner ?? 'Player 1';
  const p1        = params.p1 ?? 'Player 1';
  const p2        = params.p2 ?? 'Player 2';
  const s1        = Number(params.s1 ?? 0);
  const s2        = Number(params.s2 ?? 0);
  const coinDelta = Number(params.coins ?? 0);
  const isBattle  = params.isBattle === '1';
  const isTie     = s1 === s2;
  const iWon      = isBattle ? winner === p1 : false; // in battle, p1 is always "me"

  const trophy  = useRef(new Animated.Value(0)).current;
  const confetti = useRef(
    Array.from({ length: 12 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      op: new Animated.Value(1),
      rot: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    playGameSound(iWon || isTie || !isBattle ? 'win' : 'tap', state.settings.sound);

    // Reward/deduct coins on mount
    if (coinDelta !== 0) addCoins(coinDelta);

    // Trophy / defeat icon bounce-in
    Animated.spring(trophy, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();

    // Confetti burst (only when winning or tie)
    const showConfetti = !isBattle || iWon || isTie;
    if (showConfetti) {
      confetti.forEach((c, i) => {
        const angle  = (i / confetti.length) * 2 * Math.PI;
        const dist   = 80 + Math.random() * 60;
        const delay  = i * 40;
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(c.x,   { toValue: Math.cos(angle) * dist,       duration: 700, useNativeDriver: true }),
            Animated.timing(c.y,   { toValue: Math.sin(angle) * dist + 40,  duration: 700, useNativeDriver: true }),
            Animated.timing(c.rot, { toValue: Math.random() > 0.5 ? 4 : -4, duration: 700, useNativeDriver: true }),
            Animated.sequence([
              Animated.delay(400),
              Animated.timing(c.op, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]),
          ]),
        ]).start();
      });
    }
  }, []);

  const confettiColors = [Theme.primary, Theme.success, Theme.warn, '#B9A7FF', Theme.danger, Theme.pink];

  const trophyScale = trophy.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const trophyOp    = trophy.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });

  // Choose icon + label based on mode
  let iconName: 'trophy' | 'ribbon' | 'skull-outline' | 'flash' = 'trophy';
  let titleText = '';
  let subText   = '';

  if (isTie) {
    iconName  = 'ribbon';
    titleText = "It's a Tie!";
    subText   = 'Both players found the same number of words!';
  } else if (isBattle) {
    if (iWon) {
      iconName  = 'flash';
      titleText = 'Victory!';
      subText   = `You dominated the battle! ${coinDelta > 0 ? `+${coinDelta} coins earned.` : ''}`;
    } else {
      iconName  = 'skull-outline';
      titleText = 'Defeated!';
      subText   = `${winner} won this round. ${Math.abs(coinDelta)} coins lost.`;
    }
  } else {
    iconName  = 'trophy';
    titleText = `${winner} Wins!`;
    subText   = 'Congratulations on the victory!';
  }

  const iconColor = isBattle && !iWon && !isTie ? Theme.danger : Theme.warn;

  // Realtime + polling fallback for rematch requests.
  // Important fix:
  // When this result screen opens, old pending rooms from the previous rematch can still exist.
  // We mark those existing rooms as stale first, then only show requests created after this screen is ready.
  // This prevents "opponent sees rematch request" even when you did not send a new request.
  useEffect(() => {
    if (!isBattle || !params.opponentId) return;

    let alive = true;

    staleIncomingRoomIdsRef.current.clear();
    incomingShownRef.current.clear();
    initialIncomingScanDoneRef.current = false;
    setIncomingRematch(null);
    setRematchStatus(null);

    const showIncomingRequest = (room: BattleRoom) => {
      if (!alive || navigatingRef.current) return;
      if (!initialIncomingScanDoneRef.current) return;
      if (!isIncomingFromOpponent(room)) return;
      if (isStaleIncomingRoom(room)) return;
      if (incomingShownRef.current.has(room.id)) return;

      incomingShownRef.current.add(room.id);
      setIncomingRematch(room);
      setRematchStatus(null);
    };

    const markExistingIncomingAsStale = async () => {
      try {
        const rooms = await getBattleRooms();

        rooms.incoming
          .filter((room) => room.player1Id === params.opponentId && room.status === 'pending')
          .forEach((room) => {
            staleIncomingRoomIdsRef.current.add(String(room.id ?? ''));
            incomingShownRef.current.add(room.id);
          });
      } catch {
      } finally {
        if (!alive) return;
        initialIncomingScanDoneRef.current = true;
      }
    };

    const check = async () => {
      try {
        if (!initialIncomingScanDoneRef.current || navigatingRef.current) return;

        const rooms = await getBattleRooms();
        const hit = rooms.incoming.find((room) =>
          room.player1Id === params.opponentId &&
          room.status === 'pending' &&
          !isStaleIncomingRoom(room)
        );

        if (hit) showIncomingRequest(hit);
      } catch {}
    };

    markExistingIncomingAsStale().then(() => {
      if (!alive) return;
      check();
    });

    const iv = setInterval(check, 900);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [isBattle, params.opponentId]);

  const acceptIncomingRematch = async () => {
    playGameSound('tap', state.settings.sound);

    if (!incomingRematch || navigatingRef.current) return;

    setAcceptRematchBusy(true);
    setRematchStatus('Joining rematch...');

    try {
      const room = await acceptBattleRoom(incomingRematch);
      openBattleRoom(room);
    } catch (e: any) {
      Alert.alert('Rematch error', e?.message || 'Could not accept rematch.');
      setRematchStatus(null);
    } finally {
      setAcceptRematchBusy(false);
    }
  };

  const handleRematchDifficultySelect = async (difficulty: string) => {
    if (!params.opponentId || navigatingRef.current) return;

    const opponent: PublicUser = {
      uid: params.opponentId,
      displayName: params.opponentName || p2 || 'Opponent',
      coins: 0,
      totalScore: 0,
      levelsCompleted: 0,
      battlesWon: 0,
      battlesLost: 0,
    };

    setRematchBusy(true);
    setRematchStatus('Preparing rematch...');

    try {
      // 1) First check whether opponent already sent a rematch.
      // If yes, do not create another room. Show the same Accept popup like first battle.
      const beforeRooms = await getBattleRooms();
      const incomingBefore = beforeRooms.incoming.find(
        (room) =>
          room.player1Id === params.opponentId &&
          room.status === 'pending' &&
          !isStaleIncomingRoom(room),
      );

      if (incomingBefore) {
        setShowDiffPicker(false);
        setIncomingRematch(incomingBefore);
        setRematchStatus(null);
        return;
      }

      // 2) Normal first-time-battle behavior: create a pending room.
      const levelData = getRandomBattleLevel(difficulty);
      const createdRoom = await createBattleRoom({ friend: opponent, ...levelData });

      setShowDiffPicker(false);
      setRematchStatus('Rematch request sent...');

      // 3) Small duplicate-room protection:
      // If both players press Rematch at the same time, both may create pending rooms.
      // We choose one canonical room by id. The loser room is rejected and that player
      // sees the opponent's Accept popup instead of entering a different room.
      await sleep(650);

      const afterRooms = await getBattleRooms();
      const incomingAfter = afterRooms.incoming.find(
        (room) =>
          room.player1Id === params.opponentId &&
          room.status === 'pending' &&
          !isStaleIncomingRoom(room),
      );

      if (incomingAfter) {
        const incomingWins = roomIdSortValue(incomingAfter) < roomIdSortValue(createdRoom);

        if (incomingWins) {
          try {
            await rejectBattleRoom(createdRoom);
          } catch {}

          setIncomingRematch(incomingAfter);
          setRematchStatus(null);
          return;
        }

        try {
          await rejectBattleRoom(incomingAfter);
        } catch {}
      }

      // 4) Open game exactly like the first battle sender flow.
      // Game screen will wait until opponent accepts the same room.
      openBattleRoom(createdRoom);
    } catch (error: any) {
      Alert.alert('Rematch error', error?.message || 'Unable to send rematch.');
      setRematchStatus(null);
    } finally {
      setRematchBusy(false);
    }
  };

  return (
    <ScreenLayout>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Confetti particles */}
        <View style={styles.confettiContainer} pointerEvents="none">
          {confetti.map((c, i) => (
            <Animated.View
              key={i}
              style={[
                styles.confettiDot,
                {
                  backgroundColor: confettiColors[i % confettiColors.length],
                  transform: [
                    { translateX: c.x },
                    { translateY: c.y },
                    { rotate: c.rot.interpolate({ inputRange: [-4, 4], outputRange: ['-720deg', '720deg'] }) },
                  ],
                  opacity: c.op,
                },
              ]}
            />
          ))}
        </View>

        {/* Trophy / Icon */}
        <Animated.View style={[styles.trophyWrap, { transform: [{ scale: trophyScale }], opacity: trophyOp }]}>
          <View style={[styles.trophyCircle, isBattle && !iWon && !isTie && styles.trophyCircleLoss]}>
            <Ionicons name={iconName} size={72} color={iconColor} />
          </View>
        </Animated.View>

        {/* Title */}
        <HighlightText
          size="large"
          color={isBattle && !iWon && !isTie ? Theme.danger : Theme.warn}
          style={styles.winnerLabel}
        >
          {titleText}
        </HighlightText>
        <Text style={styles.winnerSub}>{subText}</Text>

        {/* Score comparison */}
        <View style={styles.scoreCard}>
          <ScoreRow
            name={p1}
            score={s1}
            isWinner={!isTie && winner === p1}
            align="left"
            label={isBattle ? 'score' : 'words'}
          />
          <View style={styles.scoreDivider}>
            <Text style={styles.scoreDividerText}>VS</Text>
          </View>
          <ScoreRow
            name={p2}
            score={s2}
            isWinner={!isTie && winner === p2}
            align="right"
            label={isBattle ? 'score' : 'words'}
          />
        </View>

        {/* Coins earned or lost badge */}
        {coinDelta !== 0 && (
          <View style={[styles.coinsBadge, coinDelta < 0 && styles.coinsBadgeLoss]}>
            <Ionicons
              name={coinDelta > 0 ? 'logo-bitcoin' : 'trending-down-outline'}
              size={18}
              color={coinDelta > 0 ? Theme.warn : Theme.danger}
            />
            <Text style={[styles.coinsText, coinDelta < 0 && { color: Theme.danger }]}>
              {coinDelta > 0 ? `+${coinDelta}` : coinDelta} coins {coinDelta > 0 ? 'awarded' : 'lost'}
            </Text>
          </View>
        )}

        {isBattle && rematchStatus && !incomingRematch && (
          <View style={styles.waitingRematchBox}>
            <Ionicons name="time-outline" size={20} color={Theme.warn} />
            <View style={{ flex: 1 }}>
              <Text style={styles.waitingRematchTitle}>{rematchStatus}</Text>
              <Text style={styles.waitingRematchSub}>Waiting for both phones to connect to the same room.</Text>
            </View>
          </View>
        )}

        {/* Incoming rematch banner — shown when opponent sends a rematch */}
        {isBattle && incomingRematch && (
          <Pressable
            onPress={acceptIncomingRematch}
            disabled={acceptRematchBusy}
            style={[styles.rematchBanner, acceptRematchBusy && { opacity: 0.7 }]}
          >
            <Ionicons name="flash" size={22} color="#0D0500" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rematchBannerTitle}>⚡ Rematch Request!</Text>
              <Text style={styles.rematchBannerSub}>{incomingRematch.player1Name} wants a rematch</Text>
            </View>
            <Text style={styles.rematchBannerCta}>{acceptRematchBusy ? 'Joining…' : 'Accept'}</Text>
          </Pressable>
        )}

        {/* Battle: Rematch or Return */}
        {isBattle ? (
          <>
            <Pressable
              disabled={rematchBusy}
              onPress={() => {
                if (!params.opponentId) {
                  Alert.alert('Rematch error', 'Opponent information is missing.');
                  return;
                }
                playGameSound('tap', state.settings.sound);
                setShowDiffPicker(true);
              }}
              style={[styles.primaryBtn, rematchBusy && { opacity: 0.65 }]}
            >
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>
                {rematchBusy ? 'Sending...' : '⚡ Rematch'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.replace('/battle')}
              style={styles.secondaryBtn}
            >
              <Ionicons name="flash-outline" size={18} color={Theme.textDim} />
              <Text style={styles.secondaryBtnText}>Battle Arena</Text>
            </Pressable>

            <Pressable
              onPress={() => router.replace('/levels')}
              style={styles.ghostBtn}
            >
              <Ionicons name="grid-outline" size={16} color={Theme.primary} />
              <Text style={styles.ghostBtnText}>Choose Level</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={() =>
                router.replace(
                  `/game?id=${params.id ?? ''}&categoryKey=${params.categoryKey ?? ''}&difficulty=${params.difficulty ?? 'easy'}&level=${params.level ?? 1}&mode=multi&p1=${encodeURIComponent(p1)}&p2=${encodeURIComponent(p2)}`
                )
              }
              style={styles.primaryBtn}
            >
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Play Again</Text>
            </Pressable>

            <Pressable
              onPress={() => router.replace(`/levels?difficulty=${params.difficulty ?? 'easy'}`)}
              style={styles.secondaryBtn}
            >
              <Ionicons name="grid-outline" size={18} color={Theme.textDim} />
              <Text style={styles.secondaryBtnText}>Level Select</Text>
            </Pressable>

            <Pressable
              onPress={() => router.replace('/leaderboard')}
              style={styles.ghostBtn}
            >
              <Ionicons name="trophy-outline" size={16} color={Theme.primary} />
              <Text style={styles.ghostBtnText}>Leaderboard</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <DifficultyPickerModal
        visible={showDiffPicker}
        onClose={() => setShowDiffPicker(false)}
        onSelect={handleRematchDifficultySelect}
      />
    </ScreenLayout>
  );
}

function ScoreRow({
  name, score, isWinner, align, label,
}: {
  name: string; score: number; isWinner: boolean; align: 'left' | 'right'; label?: string;
}) {
  return (
    <View style={[styles.scoreRow, align === 'right' && styles.scoreRowRight]}>
      {isWinner && align === 'left' && (
        <Ionicons name="trophy" size={16} color={Theme.warn} style={{ marginRight: 4 }} />
      )}
      <View>
        <Text style={[styles.scoreName, align === 'right' && { textAlign: 'right' }]} numberOfLines={1}>
          {name}
        </Text>
        <HighlightText
          size="large"
          color={isWinner ? Theme.warn : '#fff'}
          style={[styles.scoreNum, align === 'right' && { textAlign: 'right' }]}
        >
          {score}
        </HighlightText>
        <Text style={[styles.scoreSubLabel, align === 'right' && { textAlign: 'right' }]}>
          {label ?? 'words'}
        </Text>
      </View>
      {isWinner && align === 'right' && (
        <Ionicons name="trophy" size={16} color={Theme.warn} style={{ marginLeft: 4 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },

  confettiContainer: { position: 'absolute', top: '35%', left: '50%' },
  confettiDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },

  trophyWrap: { marginBottom: 20 },
  trophyCircle: {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,210,63,0.12)',
    borderWidth: 2, borderColor: 'rgba(255,210,63,0.3)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Theme.warn, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 0 }, shadowRadius: 30,
    elevation: 10,
  },
  trophyCircleLoss: {
    backgroundColor: 'rgba(247,108,108,0.1)',
    borderColor: 'rgba(247,108,108,0.3)',
    shadowColor: Theme.danger,
  },

  winnerLabel: { color: '#fff', fontSize: 32, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  winnerSub: { color: Theme.textDim, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28 },

  scoreCard: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    ...GlassEffects.medium,
    borderRadius: 24,
    padding: 20, marginBottom: 20,
  },
  scoreRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  scoreRowRight: { justifyContent: 'flex-end' },
  scoreName: { color: Theme.textDim, fontSize: 13, fontWeight: '800', marginBottom: 4, maxWidth: 90 },
  scoreNum: { color: '#fff', fontSize: 40, fontWeight: '900', lineHeight: 44 },
  scoreSubLabel: { color: Theme.textMute, fontSize: 11, fontWeight: '700' },
  scoreDivider: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center', marginHorizontal: 8,
  },
  scoreDividerText: { color: Theme.textMute, fontSize: 12, fontWeight: '900' },

  coinsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,210,63,0.12)',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,210,63,0.25)',
    marginBottom: 28,
  },
  coinsBadgeLoss: {
    backgroundColor: 'rgba(247,108,108,0.1)',
    borderColor: 'rgba(247,108,108,0.3)',
  },
  coinsText: { color: Theme.warn, fontSize: 16, fontWeight: '900' },

  primaryBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Theme.primary, paddingVertical: 15, borderRadius: 18, marginBottom: 10,
    shadowColor: Theme.primary, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 5 }, shadowRadius: 14, elevation: 6,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  secondaryBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.07)', paddingVertical: 14, borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginBottom: 10,
  },
  secondaryBtnText: { color: Theme.textDim, fontSize: 15, fontWeight: '800' },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999,
  },
  ghostBtnText: { color: Theme.primary, fontSize: 14, fontWeight: '800' },

  waitingRematchBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,210,63,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,210,63,0.28)',
    borderRadius: 20,
    padding: 15,
    marginBottom: 10,
  },
  waitingRematchTitle: {
    color: Theme.warn,
    fontSize: 14,
    fontWeight: '900',
  },
  waitingRematchSub: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },

  rematchBanner: {
    width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Theme.warn, borderRadius: 20, padding: 16, marginBottom: 10,
    shadowColor: Theme.warn, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6,
  },
  rematchBannerTitle: { color: '#0D0500', fontWeight: '900', fontSize: 15 },
  rematchBannerSub: { color: 'rgba(13,5,0,0.7)', fontSize: 12, fontWeight: '700' },
  rematchBannerCta: { color: '#0D0500', fontWeight: '900', fontSize: 14 },
});
