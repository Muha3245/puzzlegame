import { Ionicons } from '@expo/vector-icons';
import { usePathname, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from './AnimatedPressable';

const TABS = [
  { label: 'Profile',  icon: 'person-circle-outline',  route: '/profile'     },
  { label: 'Ranks',    icon: 'trophy-outline',          route: '/leaderboard' },
  { label: 'Home',     icon: 'home-outline',            route: '/home'        },
  { label: 'Friends',  icon: 'people-outline',          route: '/friends'     },
  { label: 'Settings', icon: 'settings-outline',        route: '/settings'    },
] as const;

const PINK = '#FF6BB3';
const GRAY = '#9890A8';

function BottomTabBar() {
  const pathname = usePathname();
  const insets   = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom + 10, 18) }]}>
      <View style={styles.pill}>
        {TABS.map((tab) => {
          const active = pathname === tab.route || pathname.startsWith(`${tab.route}/`);
          const color  = active ? PINK : GRAY;

          return (
            <AnimatedPressable
              key={tab.route}
              style={styles.tabBtn}
              soundType="menuOpen"
              onPress={() => router.push(tab.route as any)}
            >
              <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                <Ionicons
                  name={active ? (tab.icon.replace('-outline', '') as any) : tab.icon}
                  size={23}
                  color={color}
                />
              </View>
              <Text style={[styles.label, { color }]} numberOfLines={1}>
                {tab.label}
              </Text>
              {active && <View style={styles.dot} />}
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingHorizontal: 18,
    paddingTop: 6,
    backgroundColor: 'transparent',
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    paddingVertical: 10,
    paddingHorizontal: 4,
    shadowColor: '#1A0845',
    shadowOpacity: 0.20,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 18,
    elevation: 14,
  },

  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 2,
  },

  iconWrap: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },

  iconWrapActive: {
    backgroundColor: 'rgba(255,107,179,0.12)',
  },

  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: PINK,
    marginTop: 1,
  },
});

export default BottomTabBar;
