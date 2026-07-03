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

const ACTIVE = '#29E0FF';
const INACTIVE = 'rgba(255,255,255,0.62)';

function BottomTabBar() {
  const pathname = usePathname();
  const insets   = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { bottom: Math.max(insets.bottom + 0, 0) }]}>
      {TABS.map((tab) => {
        const active = pathname === tab.route || pathname.startsWith(`${tab.route}/`);
        const color  = active ? ACTIVE : INACTIVE;
        const labelColor = active ? '#07102C' : INACTIVE;

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
              <Text style={[styles.label, active && styles.labelActive, { color: labelColor }]} numberOfLines={1}>
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
    overflow: 'hidden',
    backgroundColor: 'rgba(5,9,28,0.46)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 36,
    paddingVertical: 14,
    paddingHorizontal: 8,
    shadowColor: '#29E0FF',
    shadowOpacity: 0.24,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 22,
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
    backgroundColor: 'rgba(41,224,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(41,224,255,0.38)',
    borderRadius: 999,
  },

  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },

  labelActive: {
    backgroundColor: 'rgba(41,224,255,0.95)',
    overflow: 'hidden',
    textShadowColor: 'rgba(255,255,255,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default BottomTabBar;
