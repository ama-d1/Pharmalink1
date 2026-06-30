import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#0B2545',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          height: 65,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#1A6EBD',
        tabBarInactiveTintColor: '#aaaaaa',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>

      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="medications"
        options={{
          title: 'Medications',
          tabBarIcon: ({ color }) => (
            <Ionicons name="medkit" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => (
            <Ionicons name="chatbubble" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color }) => (
            <Ionicons name="people" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={24} color={color} />
          ),
        }}
      />

    </Tabs>
  );
}