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
    <View style={[styles.wrapper, { bottom: Math.max(insets.bottom + 0, 0) }]}>
      {TABS.map((tab) => {
        const active = pathname === tab.route || pathname.startsWith(`${tab.route}/`);
        const color  = active ? PINK : GRAY;

        return (
          <View key={tab.route} style={styles.tabItem}>
            <AnimatedPressable
              style={styles.tabBtn}
              soundType="tap"
              onPress={() => router.push(tab.route as any)}
            >
              <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                <Ionicons
                  name={active ? (tab.icon.replace('-outline', '') as any) : tab.icon}
                  size={24}
                  color={color}
                />
              </View>
              <Text style={[styles.label, { color }]} numberOfLines={1}>
                {tab.label}
              </Text>
            </AnimatedPressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    paddingVertical: 14,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 20,
    elevation: 16,
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
  },

  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 2,
  },

  iconWrap: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },

  iconWrapActive: {
    backgroundColor: 'rgba(255,107,179,0.12)',
    borderRadius: 999,
  },

  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});

export default BottomTabBar;
