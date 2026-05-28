import { Ionicons } from '@expo/vector-icons';
import { usePathname, router } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedPressable } from './AnimatedPressable';
import { useAppTheme } from '../lib/appTheme';

const TABS = [
  { label: 'Profile',  icon: 'person-circle-outline',  route: '/profile'     },
  { label: 'Ranks',    icon: 'trophy-outline',          route: '/leaderboard' },
  { label: 'Home',     icon: 'home-outline',            route: '/home'        },
  { label: 'Friends',  icon: 'people-outline',          route: '/friends'     },
  { label: 'Settings', icon: 'settings-outline',        route: '/settings'    },
] as const;

function BottomTabBar() {
  const { C, scheme } = useAppTheme();
  const pathname = usePathname();

  const bg  = scheme === 'dark' ? '#141210' : C.surface;
  const bdr = scheme === 'dark' ? '#2A2520' : C.divider;

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: bg }]}>
      <View style={[styles.tabBar, { backgroundColor: bg, borderTopColor: bdr }]}>
        {TABS.map((tab) => {
          const active = pathname === tab.route || pathname.startsWith(`${tab.route}/`);
          const color  = active ? '#FF7A00' : (scheme === 'dark' ? '#8A8480' : C.muted);

          return (
            <AnimatedPressable
              key={tab.route}
              style={styles.tabBtn}
              onPress={() => router.push(tab.route as any)}
            >
              {active && (
                <View style={[styles.activePill, { backgroundColor: 'rgba(255,122,0,0.12)' }]} />
              )}
              <Ionicons
                name={active ? (tab.icon.replace('-outline', '') as any) : tab.icon}
                size={23}
                color={color}
              />
              <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
                {tab.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { width: '100%' },

  tabBar: {
    width: '100%',
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 6 : 8,
    paddingHorizontal: 6,
  },

  tabBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 3,
    position: 'relative',
  },

  activePill: {
    position: 'absolute',
    top: 0,
    left: 6,
    right: 6,
    bottom: 0,
    borderRadius: 12,
  },

  tabLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    includeFontPadding: false,
    textAlign: 'center',
  },
});

export default BottomTabBar;