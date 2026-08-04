import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassTheme } from '@/constants/glassTheme';

const TAB_CONTENT_HEIGHT = 60;

export default function TabLayout() {
  // FIXED — the bar previously hardcoded `paddingBottom: iOS ? 20 : 8`, which
  // ignores the real bottom inset. On Android with edge-to-edge (the default
  // from Expo SDK 54 / targetSdk 35 onward) the app draws under the gesture
  // navigation bar, so the tab labels sat partly beneath the gesture pill.
  // Reading the actual inset is correct in BOTH modes: it's 0 when the system
  // already insets the window, and the nav-bar height when it doesn't.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          { height: TAB_CONTENT_HEIGHT + insets.bottom, paddingBottom: insets.bottom + 6 },
        ],
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, styles.tabBarBg]} />
        ),
        tabBarActiveTintColor: GlassTheme.colors.primary,
        tabBarInactiveTintColor: GlassTheme.colors.textDim,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          title: 'Meds',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'medkit' : 'medkit-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    paddingTop: 8,
    elevation: 0,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
  },
  tabBarBg: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: GlassTheme.colors.divider,
    ...GlassTheme.shadow.sm,
    // flip shadow upward
    shadowOffset: { width: 0, height: -2 },
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  tabItem: {
    paddingTop: 4,
  },
});
