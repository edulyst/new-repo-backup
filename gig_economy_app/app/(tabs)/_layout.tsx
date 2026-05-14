import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';

import { authColors, authFonts } from '@/constants/auth-theme';

// ─── Android: Enhanced Tabs with Professional Styling ──────────────────────────
function AndroidTabs() {
  type IconName = keyof typeof Ionicons.glyphMap;

  function TabIcon({
    name,
    focused,
    color,
  }: {
    name: IconName;
    focused: boolean;
    color: string;
  }) {
    return <Ionicons name={name} size={26} color={color} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: authColors.accent,
        tabBarInactiveTintColor: authColors.placeholder,
        tabBarStyle: {
          backgroundColor: authColors.surface,
          borderTopColor: 'rgba(212,168,75,0.15)',
          borderTopWidth: 1,
          height: Platform.OS === 'android' ? 72 : 62,
          paddingBottom: Platform.OS === 'android' ? 12 : 8,
          paddingTop: 10,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontFamily: authFonts.semiBold,
          fontSize: 11,
          marginTop: 2,
          letterSpacing: 0.2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'search' : 'search-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'person-circle' : 'person-circle-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'mail' : 'mail-outline'} focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

// ─── iOS: Native Tabs with SF Symbols ────────────────────────────────────────
function IOSTabs() {
  return (
    <NativeTabs
      tintColor={authColors.accent}
      labelStyle={{
        color: authColors.textSecondary,
        fontFamily: authFonts.semiBold,
        fontSize: 9,
      }}
      backgroundColor={authColors.background}
      titlePositionAdjustment={{ horizontal: 0, vertical: 18 }}
    >
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="schedule">
        <Icon sf={{ default: 'calendar', selected: 'calendar' }} />
        <Label>Schedule</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <Icon sf={{ default: 'magnifyingglass', selected: 'magnifyingglass' }} />
        <Label>Search</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: 'person.circle', selected: 'person.circle.fill' }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages">
        <Icon sf={{ default: 'envelope', selected: 'envelope.fill' }} />
        <Label>Messages</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

// ─── Main Layout ───────────────────────────────────────────────────────────────
export default function TabLayout() {
  if (Platform.OS === 'ios') {
    return <IOSTabs />;
  }
  return <AndroidTabs />;
}
