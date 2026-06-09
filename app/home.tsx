import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Svg, {
  Circle, Defs, Ellipse,
  FeColorMatrix, Filter,
  Image as SvgImage,
  Path, Polygon,
  RadialGradient, Rect, Stop,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { AnimatedEntry } from '../components/AnimatedEntry';
import { useAppState } from '../lib/storage';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Candy palette ────────────────────────────────────────────────────────────
const C = {
  // Background gradient zones (reference image 1)
  bg1:      '#2A0A80',   // deep purple top
  bg2:      '#5520A8',   // medium purple
  bg3:      '#C858B8',   // pink-magenta middle
  bg4:      '#F090D0',   // light pink lower
  bg5:      '#50C8B8',   // teal bottom
  // UI accents
  pink:     '#FF6BB3',
  pinkDk:   '#D94A95',
  purple:   '#C054E8',
  purpleDk: '#8B25C9',
  blue:     '#48C9F5',
  yellow:   '#FFD700',
  orange:   '#FF8C42',
  green:    '#6EE86A',
  white:    '#FFFFFF',
  shadow:   'rgba(0,0,0,0.45)',
};

// ─── Transparent iridescent bubble ────────────────────────────────────────────
function FloatingBubble({ x, y, r, delay = 0 }: { x: number; y: number; r: number; delay?: number }) {
  const ty = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ty, { toValue: -18, duration: 2200 + delay * 250, useNativeDriver: true }),
          Animated.timing(op, { toValue: 1, duration: 1100 + delay * 125, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ty, { toValue: 0, duration: 2200 + delay * 250, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0.7, duration: 1100 + delay * 125, useNativeDriver: true }),
        ]),
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: x - r, top: y - r, opacity: op, transform: [{ translateY: ty }] }}
    >
      <Svg width={r * 2} height={r * 2}>
        {/* Transparent bubble with soft border */}
        <Circle cx={r} cy={r} r={r - 1} fill="rgba(200,220,255,0.06)" stroke="rgba(200,210,255,0.55)" strokeWidth={1.5} />
        {/* Rainbow arc highlight */}
        <Path
          d={`M ${r * 0.28} ${r * 0.42} A ${r * 0.7} ${r * 0.7} 0 0 1 ${r * 1.28} ${r * 0.3}`}
          stroke="rgba(210,190,255,0.75)" strokeWidth={r * 0.11} fill="none" strokeLinecap="round"
        />
        {/* Shine dot */}
        <Circle cx={r * 0.58} cy={r * 0.38} r={r * 0.13} fill="rgba(255,255,255,0.7)" />
        <Circle cx={r * 0.42} cy={r * 0.55} r={r * 0.07} fill="rgba(255,255,255,0.4)" />
      </Svg>
    </Animated.View>
  );
}

// ─── Candy star (gold, pulsing) ───────────────────────────────────────────────
function StarDeco({ x, y, size, color, delay = 0 }: { x: number; y: number; size: number; color: string; delay?: number }) {
  const sc = useRef(new Animated.Value(0.85)).current;
  const op = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(sc, { toValue: 1.25, duration: 1400 + delay * 200, useNativeDriver: true }),
          Animated.timing(op, { toValue: 1, duration: 700 + delay * 100, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(sc, { toValue: 0.85, duration: 1400 + delay * 200, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0.7, duration: 700 + delay * 100, useNativeDriver: true }),
        ]),
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = size;
  const outer = s / 2;
  const inner = s / 4;
  const pts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const a1 = (Math.PI / 2.5) * i - Math.PI / 2;
    const a2 = a1 + Math.PI / 5;
    pts.push(`${outer + outer * Math.cos(a1)},${outer + outer * Math.sin(a1)}`);
    pts.push(`${outer + inner * Math.cos(a2)},${outer + inner * Math.sin(a2)}`);
  }
  const pointsStr = pts.join(' ');

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, opacity: op, transform: [{ scale: sc }] }}
    >
      <Svg width={size} height={size}>
        <Polygon points={pointsStr} fill={color} />
        {/* Shine */}
        <Circle cx={outer * 0.9} cy={outer * 0.7} r={size * 0.08} fill="rgba(255,255,255,0.55)" />
      </Svg>
    </Animated.View>
  );
}

// ─── Lollipop ─────────────────────────────────────────────────────────────────
function Lollipop({ x, y, size, c1, c2, delay = 0 }: {
  x: number; y: number; size: number; c1: string; c2: string; delay?: number;
}) {
  const ty = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ty, { toValue: -14, duration: 2400 + delay * 400, useNativeDriver: true }),
        Animated.timing(ty, { toValue: 0,   duration: 2400 + delay * 400, useNativeDriver: true }),
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cx = size / 2;
  const cy = size / 2;
  const or = cx - 3;        // outer pop radius
  const mr = cx * 0.58;     // mid-ring swirl radius
  const sH = size * 0.78;   // stick height
  const DEG = Math.PI / 180;
  const gId = `lp_${size}_${c1.replace('#', '')}`;

  // clockwise sector path, 0° = top
  function sec(r: number, a1: number, a2: number) {
    const s1 = a1 * DEG - Math.PI / 2;
    const s2 = a2 * DEG - Math.PI / 2;
    const x1 = (cx + r * Math.cos(s1)).toFixed(2);
    const y1 = (cy + r * Math.sin(s1)).toFixed(2);
    const x2 = (cx + r * Math.cos(s2)).toFixed(2);
    const y2 = (cy + r * Math.sin(s2)).toFixed(2);
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
  }

  return (
    <Animated.View pointerEvents="none"
      style={{ position: 'absolute', left: x, top: y, transform: [{ translateY: ty }] }}>
      <Svg width={size} height={size + sH}>
        <Defs>
          {/* Radial gradient gives the pop a glossy 3-D depth */}
          <RadialGradient id={gId} gradientUnits="userSpaceOnUse"
            cx={cx * 0.58} cy={cy * 0.36} r={or * 1.1}>
            <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity={0.65}/>
            <Stop offset="35%"  stopColor={c1}      stopOpacity={1}/>
            <Stop offset="100%" stopColor={c1}      stopOpacity={1}/>
          </RadialGradient>
        </Defs>

        {/* Stick */}
        <Rect x={cx - 4} y={size - 4} width={8}   height={sH}        rx={4}   fill="#E8E0D0"/>
        <Rect x={cx - 1} y={size - 4} width={2.5} height={sH * 0.85} rx={1.2} fill="rgba(255,255,255,0.42)"/>

        {/* Pop base with gradient */}
        <Circle cx={cx} cy={cy} r={or} fill={`url(#${gId})`}/>

        {/* Outer swirl: two 90° sectors in c2 at 0° and 180° */}
        <Path d={sec(or, 0,   90)}  fill={c2} opacity={0.9}/>
        <Path d={sec(or, 180, 270)} fill={c2} opacity={0.9}/>

        {/* Mid swirl ring (offset 45°) */}
        <Path d={sec(mr, 45,  135)} fill={c2} opacity={0.88}/>
        <Path d={sec(mr, 225, 315)} fill={c2} opacity={0.88}/>

        {/* Centre discs to finish the spiral illusion */}
        <Circle cx={cx} cy={cy} r={or * 0.36} fill={c1}/>
        <Circle cx={cx} cy={cy} r={or * 0.16} fill={c2} opacity={0.9}/>

        {/* Glossy top-left shine */}
        <Ellipse cx={cx * 0.55} cy={cy * 0.36}
          rx={or * 0.3} ry={or * 0.14}
          fill="rgba(255,255,255,0.7)"
          transform={`rotate(-32 ${cx * 0.55} ${cy * 0.36})`}/>
        <Circle cx={cx * 0.72} cy={cy * 0.52} r={or * 0.08} fill="rgba(255,255,255,0.45)"/>

        {/* Outer ring */}
        <Circle cx={cx} cy={cy} r={or} fill="none"
          stroke="rgba(255,255,255,0.22)" strokeWidth={1.5}/>
      </Svg>
    </Animated.View>
  );
}

// ─── Jelly bean ───────────────────────────────────────────────────────────────
function JellyBean({ x, y, color, rot = 0, delay = 0 }: {
  x: number; y: number; color: string; rot?: number; delay?: number;
}) {
  const ty = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ty, { toValue: -10, duration: 1900 + delay * 280, useNativeDriver: true }),
        Animated.timing(ty, { toValue: 0, duration: 1900 + delay * 280, useNativeDriver: true }),
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: x, top: y, transform: [{ translateY: ty }, { rotate: `${rot}deg` }] }}
    >
      <Svg width={38} height={22}>
        <Ellipse cx={19} cy={11} rx={17} ry={10} fill={color} />
        {/* Highlight */}
        <Ellipse cx={13} cy={7} rx={7} ry={4} fill="rgba(255,255,255,0.42)" />
        {/* Shadow edge */}
        <Ellipse cx={22} cy={15} rx={9} ry={4} fill="rgba(0,0,0,0.12)" />
      </Svg>
    </Animated.View>
  );
}

// ─── Sparkle trail ────────────────────────────────────────────────────────────
function SparkleTrail() {
  const glow = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1300, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.45, duration: 1300, useNativeDriver: true }),
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dots = [
    { x: SW * 0.38, y: SH * 0.78, r: 2.5 },
    { x: SW * 0.44, y: SH * 0.72, r: 3.5 },
    { x: SW * 0.49, y: SH * 0.65, r: 2 },
    { x: SW * 0.54, y: SH * 0.58, r: 4.5 },
    { x: SW * 0.59, y: SH * 0.52, r: 2.5 },
    { x: SW * 0.64, y: SH * 0.45, r: 3 },
    { x: SW * 0.69, y: SH * 0.38, r: 2 },
    { x: SW * 0.73, y: SH * 0.32, r: 4 },
    { x: SW * 0.77, y: SH * 0.26, r: 2.5 },
  ];

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: glow }]} pointerEvents="none">
      <Svg width={SW} height={SH} style={StyleSheet.absoluteFill}>
        {dots.map((d, i) => (
          <React.Fragment key={i}>
            <Circle cx={d.x} cy={d.y} r={d.r + 3} fill="rgba(255,235,150,0.18)" />
            <Circle cx={d.x} cy={d.y} r={d.r} fill="rgba(255,245,180,0.92)" />
          </React.Fragment>
        ))}
      </Svg>
    </Animated.View>
  );
}

// ─── Pink clouds (bottom) ─────────────────────────────────────────────────────
function PinkClouds() {
  const tx = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(tx, { toValue: 10, duration: 4500, useNativeDriver: true }),
        Animated.timing(tx, { toValue: -10, duration: 4500, useNativeDriver: true }),
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const CH = SH * 0.22;

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: CH, transform: [{ translateX: tx }] }}
    >
      <Svg width={SW + 30} height={CH} viewBox={`-15 0 ${SW + 30} ${CH}`}>
        {/* Back layer (slightly darker) */}
        <Circle cx={-30} cy={CH} r={90} fill="#E8A8D0" />
        <Circle cx={60} cy={CH - 18} r={75} fill="#EBB0D8" />
        <Circle cx={145} cy={CH} r={80} fill="#E8A8D0" />
        <Circle cx={SW * 0.48} cy={CH - 10} r={95} fill="#EBB0D8" />
        <Circle cx={SW * 0.72} cy={CH - 5} r={78} fill="#E8A8D0" />
        <Circle cx={SW + 30} cy={CH} r={88} fill="#EBB0D8" />
        <Circle cx={SW - 50} cy={CH - 20} r={70} fill="#E8A8D0" />
        {/* Front layer (lighter pink) */}
        <Circle cx={-10} cy={CH + 5} r={82} fill="#F2BFE2" />
        <Circle cx={90} cy={CH - 8} r={68} fill="#F5C5E5" />
        <Circle cx={SW * 0.35} cy={CH - 2} r={85} fill="#F2BFE2" />
        <Circle cx={SW * 0.62} cy={CH - 12} r={72} fill="#F5C5E5" />
        <Circle cx={SW + 10} cy={CH + 5} r={80} fill="#F2BFE2" />
        {/* Bottom fill bar */}
        <Rect x={-20} y={CH * 0.78} width={SW + 50} height={CH * 0.25} fill="#F2BFE2" />
      </Svg>
    </Animated.View>
  );
}

// ─── Background canvas ────────────────────────────────────────────────────────
function Background() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">

      {/* ── Background image ── */}
      <ExpoImage
        source={require('../assets/images/background.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />

      {/* ── Sparkle trail (diagonal glitter arc) ── */}
      <SparkleTrail />

      {/* ── Lollipops ── */}
      <Lollipop x={SW * 0.58} y={SH * 0.04} size={120} c1="#FFB0CC" c2="#FFF0F5" delay={0} />
      <Lollipop x={-46}       y={SH * 0.52} size={100} c1="#C898F8" c2="#F0D8FF" delay={1} />

      {/* ── Jelly beans ── */}
      <JellyBean x={SW * 0.02} y={SH * 0.36} color="#7EE858" rot={-30} delay={0} />
      <JellyBean x={SW * 0.05} y={SH * 0.50} color="#B858E8" rot={15}  delay={1} />
      <JellyBean x={SW * 0.76} y={SH * 0.10} color="#FF88A8" rot={-15} delay={2} />
      <JellyBean x={SW * 0.79} y={SH * 0.28} color="#60C8F8" rot={28}  delay={0.5} />
      <JellyBean x={SW * 0.74} y={SH * 0.43} color="#FFD050" rot={-18} delay={1.5} />
      <JellyBean x={SW * 0.68} y={SH * 0.58} color="#FF7878" rot={10}  delay={2.5} />
      <JellyBean x={SW * 0.05} y={SH * 0.66} color="#60E8D0" rot={38}  delay={0.8} />
      <JellyBean x={SW * 0.77} y={SH * 0.68} color="#8878F8" rot={-8}  delay={1.2} />

      {/* ── Iridescent bubbles ── */}
      <FloatingBubble x={SW * 0.14} y={SH * 0.08} r={30} delay={0} />
      <FloatingBubble x={SW * 0.34} y={SH * 0.04} r={18} delay={1} />
      <FloatingBubble x={SW * 0.57} y={SH * 0.01} r={22} delay={2} />
      <FloatingBubble x={SW * 0.82} y={SH * 0.07} r={14} delay={0.5} />
      <FloatingBubble x={SW * 0.22} y={SH * 0.20} r={12} delay={1.5} />
      <FloatingBubble x={SW * 0.46} y={SH * 0.17} r={10} delay={2.5} />
      <FloatingBubble x={SW * 0.88} y={SH * 0.19} r={16} delay={0.8} />

      {/* ── Gold candy stars ── */}
      <StarDeco x={SW * 0.12} y={SH * 0.80} size={30} color="#FFD030" delay={0} />
      <StarDeco x={SW * 0.22} y={SH * 0.88} size={22} color="#FFBE18" delay={1} />
      <StarDeco x={SW * 0.78} y={SH * 0.83} size={26} color="#FFD030" delay={2} />
      <StarDeco x={SW * 0.88} y={SH * 0.76} size={18} color="#FFE060" delay={0.5} />
      <StarDeco x={SW * 0.30} y={SH * 0.44} size={13} color="#FFE060" delay={1.8} />

      {/* ── Pink fluffy clouds at bottom ── */}
      <PinkClouds />
    </View>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
function GameLogo() {
  const sc = useRef(new Animated.Value(0.9)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.logoWrap, { transform: [{ scale: sc }], opacity: op }]}>
      {/* Glow ring behind logo */}
      <View style={styles.logoGlow} />

      <View style={styles.logoBox}>
        {/* Top "PUZZLE" text */}
        <View style={styles.logoRow}>
          {['P','U','Z','Z','L','E'].map((ch, i) => (
            <View
              key={i}
              style={[
                styles.logoLetter,
                {
                  backgroundColor: [C.pink, C.purple, C.blue, C.yellow, C.orange, C.green][i],
                  transform: [{ rotate: i % 2 === 0 ? '-3deg' : '3deg' }],
                },
              ]}
            >
              <Text style={styles.logoLetterText}>{ch}</Text>
              <View style={styles.logoLetterShine} />
            </View>
          ))}
        </View>

        {/* "ARENA" subtitle */}
        <View style={styles.arenaRow}>
          <View style={[styles.arenaDash, { backgroundColor: C.yellow }]} />
          <Text style={styles.arenaText}>ARENA</Text>
          <View style={[styles.arenaDash, { backgroundColor: C.yellow }]} />
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Mascot (glossy purple jelly blob with SVG gradients) ────────────────────
function Mascot() {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -11, duration: 820, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0,   duration: 820, useNativeDriver: true }),
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.mascotWrap, { transform: [{ translateY: bounce }] }]}>
      <Svg width={160} height={160}>
        <Defs>
          <Filter id="removeWhiteBg" x="0%" y="0%" width="100%" height="100%">
            <FeColorMatrix
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 0 3"
            />
          </Filter>
        </Defs>
        <SvgImage
          href={require('../assets/images/moscot.png')}
          x="0"
          y="0"
          width="160"
          height="160"
          preserveAspectRatio="xMidYMid meet"
          filter="url(#removeWhiteBg)"
        />
      </Svg>
    </Animated.View>
  );
}

// ─── Offline game card (full-width horizontal) ───────────────────────────────
function OfflineGameCard({ onPress }: { onPress: () => void }) {
  const op = useRef(new Animated.Value(0)).current;
  const tx = useRef(new Animated.Value(-24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 440, useNativeDriver: true }),
      Animated.spring(tx, { toValue: 0, friction: 7, tension: 130, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const GREEN = C.green;

  return (
    <Animated.View style={{ opacity: op, transform: [{ translateX: tx }] }}>
      <AnimatedPressable onPress={onPress} scaleTo={0.96} style={styles.offlineCard}>
        {/* Candy bottom-shadow shell */}
        <View style={[styles.offlineShell, { borderColor: GREEN + '55', shadowColor: GREEN }]}>
          {/* Top color strip */}
          <View style={[styles.cardTopStrip, { backgroundColor: GREEN }]} />

          {/* Glossy shine */}
          <View style={styles.cardShine} />

          <View style={styles.offlineBody}>
            {/* Icon block */}
            <View style={[styles.offlineIconWrap, { backgroundColor: GREEN }]}>
              <Ionicons name="game-controller" size={32} color="#fff" />
              <View style={styles.iconShine} />
            </View>

            {/* Text content */}
            <View style={styles.offlineContent}>
              <View style={styles.offlineMetaRow}>
                <View style={[styles.modeBadge, { backgroundColor: GREEN }]}>
                  <Text style={styles.modeBadgeText}>PRACTICE</Text>
                </View>
                <Text style={[styles.modeSub, { color: 'rgba(255,255,255,0.6)' }]}>12 levels</Text>
              </View>
              <Text style={styles.modeTitle}>Offline</Text>
              <Text style={[styles.modeDesc, { color: 'rgba(255,255,255,0.65)' }]}>
                Word Search · XOX · Bot
              </Text>
            </View>

            {/* Arrow */}
            <View style={[styles.arrowBtn, { backgroundColor: GREEN }]}>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </View>
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

// ─── Online game card (half-width vertical) ───────────────────────────────────
function OnlineGameCard({
  icon,
  title,
  meta,
  color,
  onPress,
  delay = 0,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  meta: string;
  color: string;
  onPress: () => void;
  delay?: number;
}) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 420, delay: delay * 120, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, friction: 7, tension: 130, delay: delay * 120, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.onlineCardOuter, { opacity: op, transform: [{ translateY: ty }] }]}>
      <AnimatedPressable onPress={onPress} scaleTo={0.93} style={styles.onlineCard}>
        <View style={[styles.onlineShell, { borderColor: color + '55', shadowColor: color }]}>
          {/* Top strip */}
          <View style={[styles.cardTopStrip, { backgroundColor: color }]} />

          {/* Glossy shine */}
          <View style={styles.cardShine} />

          <View style={styles.onlineBody}>
            {/* Icon + LIVE badge row */}
            <View style={styles.onlineTopRow}>
              <View style={[styles.onlineIconBox, { backgroundColor: color }]}>
                <Ionicons name={icon} size={24} color="#fff" />
                <View style={styles.iconShine} />
              </View>
              <View style={[styles.liveBadge, { backgroundColor: color }]}>
                <View style={styles.livePulseDot} />
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
            </View>

            {/* Text */}
            <Text style={styles.modeTitle}>{title}</Text>
            <Text style={[styles.modeDesc, { color: 'rgba(255,255,255,0.6)' }]}>{meta}</Text>

            {/* Play button */}
            <View style={[styles.onlinePlayBtn, { backgroundColor: color }]}>
              <Ionicons name="play" size={12} color="#fff" />
              <Text style={styles.onlinePlayText}>PLAY</Text>
              <View style={styles.onlinePlayShine} />
            </View>
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

// ─── Coins pill ───────────────────────────────────────────────────────────────
function CoinsPill({ coins, onPress }: { coins: number; onPress: () => void }) {
  return (
    <AnimatedPressable onPress={onPress} scaleTo={0.93} style={styles.coinsPill}>
      <View style={styles.coinsIconWrap}>
        <Ionicons name="logo-bitcoin" size={14} color="#1A0845" />
      </View>
      <Text style={styles.coinsText}>{coins.toLocaleString()}</Text>
      <Text style={styles.coinsPlus}>+</Text>
    </AnimatedPressable>
  );
}

// ─── Home screen ──────────────────────────────────────────────────────────────
export default function Home() {
  const { state } = useAppState();
  const insets = useSafeAreaInsets();


  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Decorative background */}
      <Background />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: 36 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          {/* Notifications */}
          <AnimatedPressable
            onPress={() => router.push('/friends')}
            style={styles.topIconBtn}
          >
            <Ionicons name="notifications" size={20} color="#fff" />
            <View style={styles.notifDot} />
          </AnimatedPressable>

          {/* Coins */}
          <CoinsPill coins={state.coins} onPress={() => router.push('/coins')} />

          {/* Settings */}
          <AnimatedPressable
            onPress={() => router.push('/settings')}
            style={styles.topIconBtn}
          >
            <Ionicons name="settings-outline" size={20} color="#fff" />
          </AnimatedPressable>
        </View>

        {/* ── Logo ── */}
        <AnimatedEntry from="scale" duration={500}>
          <GameLogo />
        </AnimatedEntry>

        {/* ── Mascot ── */}
        <View style={styles.mascotContainer}>
          <Mascot />
          {/* Sparkle trail below mascot */}
          <View style={styles.mascotSparkles}>
            {['★','✦','★'].map((s, i) => (
              <Text key={i} style={[styles.sparkleChar, { color: [C.yellow, C.pink, C.blue][i], fontSize: [12, 8, 10][i] }]}>{s}</Text>
            ))}
          </View>
        </View>

        {/* ── Section label ── */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionLine, { backgroundColor: C.yellow + '55' }]} />
          <Text style={styles.sectionTitle}>GAME MODES</Text>
          <View style={[styles.sectionLine, { backgroundColor: C.yellow + '55' }]} />
        </View>

        {/* ── Game mode cards ── */}
        <View style={styles.cardsWrap}>
          {/* Full-width offline card */}
          <OfflineGameCard onPress={() => router.push('/offline' as any)} />

          {/* Two-column online cards */}
          <View style={styles.onlineRow}>
            <OnlineGameCard
              icon="flash"
              title="Word Battle"
              meta="4 queued"
              color="#E5452A"
              onPress={() => router.push('/battle')}
              delay={1}
            />
            <OnlineGameCard
              icon="grid"
              title="XOX Online"
              meta="127 online"
              color="#8E6BFF"
              onPress={() => router.push('/xox-battle' as any)}
              delay={2}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg1 },
  scroll: { flex: 1 },
  content: { flexGrow: 1 },

  glowBlob: { position: 'absolute' },

  // ── Top bar ───────────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  topIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.pink,
    borderWidth: 1.5,
    borderColor: C.bg1,
  },
  coinsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.yellow,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    shadowColor: C.yellow,
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 8,
  },
  coinsIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinsText: { fontSize: 14, fontWeight: '900', color: '#1A0845' },
  coinsPlus: { fontSize: 16, fontWeight: '900', color: '#1A0845', marginLeft: -2 },

  // ── Logo ──────────────────────────────────────────────────────────────────────
  logoWrap: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  logoGlow: {
    position: 'absolute',
    width: SW * 0.8,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.purple,
    opacity: 0.2,
    top: '50%',
    marginTop: -10,
  },
  logoBox: { alignItems: 'center', gap: 4 },
  logoRow: { flexDirection: 'row', gap: 5, alignItems: 'flex-end' },
  logoLetter: {
    width: 40,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.25)',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 6,
    overflow: 'hidden',
  },
  logoLetterText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  logoLetterShine: {
    position: 'absolute',
    top: 4,
    left: 6,
    width: '50%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  arenaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  arenaDash: { width: 30, height: 2, borderRadius: 1 },
  arenaText: {
    fontSize: 14,
    fontWeight: '900',
    color: C.yellow,
    letterSpacing: 5,
    textShadowColor: 'rgba(255,215,0,0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  // ── Mascot ────────────────────────────────────────────────────────────────────
  mascotContainer: { alignItems: 'center', marginVertical: 4 },
  mascotWrap: { alignItems: 'center' },
  mascotSparkles: { flexDirection: 'row', gap: 10, marginTop: -4 },
  sparkleChar: { fontWeight: '900' },

  // ── Play button ───────────────────────────────────────────────────────────────
  playBtnOuter: {
    alignItems: 'center',
    marginHorizontal: 30,
    marginBottom: 20,
  },
  playGlowRing: {
    position: 'absolute',
    width: SW - 40,
    height: 78,
    borderRadius: 39,
    backgroundColor: C.pink,
    top: 8,
    shadowColor: C.pink,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 24,
    elevation: 0,
  },
  playBtnPressable: { width: '100%' },
  playBtnShell: {
    width: '100%',
    borderRadius: 36,
    padding: 4,
    backgroundColor: C.pinkDk,
    borderBottomWidth: 5,
    borderBottomColor: 'rgba(0,0,0,0.35)',
    shadowColor: C.pink,
    shadowOpacity: 0.7,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
    elevation: 14,
  },
  playBtnBody: {
    backgroundColor: C.pink,
    borderRadius: 32,
    paddingVertical: 16,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  playBtnShine: {
    position: 'absolute',
    top: 6,
    left: '15%',
    width: '70%',
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  playBtnContent: { alignItems: 'center', gap: 2 },
  playBtnText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  playBtnSub: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.5,
  },

  // ── Section header ────────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 14,
    gap: 12,
  },
  sectionLine: { flex: 1, height: 1.5, borderRadius: 1 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: C.yellow,
    letterSpacing: 2.5,
    textShadowColor: 'rgba(255,215,0,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },

  // ── Game mode cards ───────────────────────────────────────────────────────────
  cardsWrap: { paddingHorizontal: 16, gap: 12 },
  onlineRow: { flexDirection: 'row', gap: 12 },

  // Shared card elements
  cardTopStrip: { width: '100%', height: 4 },
  cardShine: {
    position: 'absolute',
    top: 12,
    left: '12%',
    width: '50%',
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  iconShine: {
    position: 'absolute',
    top: 5,
    left: 8,
    width: 16,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  modeBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.4 },
  modeSub: { fontSize: 11, fontWeight: '600' },
  modeTitle: { fontSize: 20, fontWeight: '900', color: '#fff', lineHeight: 24, marginBottom: 2 },
  modeDesc: { fontSize: 12, fontWeight: '500' },

  // Offline card
  offlineCard: { width: '100%' },
  offlineShell: {
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: 'rgba(110,232,106,0.12)',
    borderBottomWidth: 5,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 12,
    elevation: 8,
  },
  offlineBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  offlineIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 5,
  },
  offlineContent: { flex: 1 },
  offlineMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  arrowBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },

  // Online cards
  onlineCardOuter: { flex: 1 },
  onlineCard: { flex: 1 },
  onlineShell: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderBottomWidth: 5,
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 12,
    elevation: 8,
  },
  onlineBody: { padding: 14 },
  onlineTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  onlineIconBox: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  livePulseDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  liveBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  onlinePlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 14,
    paddingVertical: 11,
    borderRadius: 16,
    overflow: 'hidden',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0,0,0,0.25)',
  },
  onlinePlayText: { fontSize: 13, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  onlinePlayShine: {
    position: 'absolute',
    top: 4,
    left: '20%',
    width: '40%',
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
});
