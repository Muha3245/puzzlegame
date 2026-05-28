import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedPressable } from './AnimatedPressable';

function BottomTabBar() {
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.tabBar}>
        <AnimatedPressable style={styles.tabBtn} onPress={() => router.push('/profile')}>
          <Ionicons name="person-circle-outline" size={23} color="#fff" />
          <Text style={styles.tabLabel} numberOfLines={1}>
            Profile
          </Text>
        </AnimatedPressable>

        <AnimatedPressable style={styles.tabBtn} onPress={() => router.push('/leaderboard')}>
          <Ionicons name="trophy-outline" size={23} color="#fff" />
          <Text style={styles.tabLabel} numberOfLines={1}>
            Ranks
          </Text>
        </AnimatedPressable>

        <AnimatedPressable style={styles.tabBtn} onPress={() => router.push('/friends')}>
          <Ionicons name="people-outline" size={23} color="#fff" />
          <Text style={styles.tabLabel} numberOfLines={1}>
            Friends
          </Text>
        </AnimatedPressable>

        <AnimatedPressable style={styles.tabBtn} onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={23} color="#fff" />
          <Text style={styles.tabLabel} numberOfLines={1}>
            Settings
          </Text>
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    width: '100%',
    backgroundColor: '#0b0a0a',
  },

  tabBar: {
    width: '100%',
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#0b0a0a',
    borderTopWidth: 1,
    borderTopColor: '#242222',
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
  },

  tabLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
    includeFontPadding: false,
    textAlign: 'center',
  },
});

export default BottomTabBar;