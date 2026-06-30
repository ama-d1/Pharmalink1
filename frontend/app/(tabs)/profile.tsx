import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { router } from 'expo-router';

type HealthStat = {
  id: string;
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  percent?: number;
};

type HealthInfoItem = {
  label: string;
  value: string;
  tone?: 'default' | 'danger' | 'success';
};

type SettingsItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  textColor?: string;
};

type QuickAction = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const colors = {
  bg: '#F8FAFC',
  card: '#FFFFFF',

  primary: '#2563EB',
  primarySoft: '#DBEAFE',

  text: '#1F2937',
  muted: '#6B7280',

  border: '#E5E7EB',

  danger: '#EF4444',
  dangerSoft: '#FEE2E2',

  success: '#10B981',
  successSoft: '#DCFCE7',

  purpleSoft: '#EDE9FE',
  greenSoft: '#CCFBF1',
};

const profile = {
  name: 'Ama Dansoa',
  email: 'ama@gmail.com',
  initials: 'AD',
  isPremium: true,
  stats: [
    { id: 'meds', label: 'Medications', value: '3', icon: 'medkit-outline' },
    {
      id: 'adherence',
      label: 'Adherence',
      value: '92%',
      icon: 'checkmark-circle-outline',
      percent: 92,
    },
    { id: 'streak', label: 'Day streak', value: '12', icon: 'flame-outline' },
    {
      id: 'appts',
      label: 'Appointments',
      value: '5',
      icon: 'calendar-outline',
    },
  ] as HealthStat[],
  healthInfo: [
    { label: 'Blood group', value: 'O+', tone: 'default' },
    { label: 'Allergies', value: 'Penicillin', tone: 'danger' },
    { label: 'Condition', value: 'Diabetes', tone: 'default' },
  ] as HealthInfoItem[],
};

const quickActions: QuickAction[] = [
  { id: 'dose', label: 'Log dose', icon: 'add-circle-outline' },
  { id: 'book', label: 'Book', icon: 'calendar-outline' },
  { id: 'report', label: 'Report', icon: 'bar-chart-outline' },
];

const settingsItems: SettingsItem[] = [
  {
    id: 'edit',
    label: 'Edit profile',
    icon: 'person-outline',
    iconBg: colors.primarySoft,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: 'notifications-outline',
    iconBg: colors.greenSoft,
  },
  {
    id: 'privacy',
    label: 'Privacy & security',
    icon: 'shield-checkmark-outline',
    iconBg: colors.purpleSoft,
  },
  {
    id: 'logout',
    label: 'Log out',
    icon: 'log-out-outline',
    iconBg: colors.dangerSoft,
    textColor: colors.danger,
  },
];

function AdherenceRing({ percent }: { percent: number }) {
  const size = 42;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#E5E7EB"
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#2563EB"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

function SectionTitle({
  title,
  actionLabel,
  onActionPress,
}: {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onActionPress} hitSlop={8}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ProfileHeader() {
  return (
    <View style={styles.headerCard}>
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{profile.initials}</Text>
        </View>
        <Pressable style={styles.avatarEditBadge}>
          <Ionicons name="camera-outline" size={14} color={colors.primary} />
        </Pressable>
      </View>

      <Text style={styles.name}>{profile.name}</Text>
      <Text style={styles.email}>{profile.email}</Text>

      {profile.isPremium ? (
        <View style={styles.premiumBadge}>
          <Ionicons name="star" size={12} color={colors.primary} />
          <Text style={styles.premiumText}>Premium member</Text>
        </View>
      ) : null}

      <Text style={styles.greeting}>Good morning, Ama</Text>
    </View>
  );
}

function HealthSummaryGrid() {
  return (
    <View style={styles.sectionBlock}>
      <SectionTitle title="HEALTH SUMMARY" />
      <View style={styles.grid}>
        {profile.stats.map((stat) => (
          <Pressable
            key={stat.id}
            style={({ pressed }) => [
              styles.statCard,
              pressed && styles.pressed,
            ]}
            onPress={() => Alert.alert(stat.label, `Open ${stat.label} screen`)}
            accessibilityRole="button"
            accessibilityLabel={`${stat.value} ${stat.label}`}
          >
            {stat.percent !== undefined ? (
              <AdherenceRing percent={stat.percent} />
            ) : (
              <View style={styles.iconBubble}>
                <Ionicons name={stat.icon} size={18} color={colors.primary} />
              </View>
            )}
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function QuickActionsRow() {
  return (
    <View style={styles.sectionBlock}>
      <SectionTitle title="QUICK ACTIONS" />
      <View style={styles.quickActionsRow}>
        {quickActions.map((action) => (
          <Pressable
            key={action.id}
            style={({ pressed }) => [
              styles.quickAction,
              pressed && styles.pressed,
            ]}
            onPress={() => Alert.alert(action.label, 'Coming soon')}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <Ionicons name={action.icon} size={18} color={colors.primary} />
            <Text style={styles.quickActionText}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function HealthInfoSection() {
  const toneStyles = {
    default: { color: colors.primary },
    danger: { color: colors.danger },
    success: { color: colors.success },
  } as const;

  return (
    <View style={styles.sectionBlock}>
      <SectionTitle
        title="HEALTH INFO"
        actionLabel="Edit"
        onActionPress={() => Alert.alert('Edit', 'Open health info editor')}
      />
      <View style={styles.listCard}>
        {profile.healthInfo.map((item, index) => (
          <View key={item.label}>
            <View style={styles.listRow}>
              <Text style={styles.listLabel}>{item.label}</Text>
              <Text
                style={[
                  styles.listValue,
                  toneStyles[item.tone ?? 'default'],
                ]}
              >
                {item.value}
              </Text>
            </View>
            {index < profile.healthInfo.length - 1 ? (
              <View style={styles.divider} />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function SettingsSection() {
 const handlePress = (item: SettingsItem) => {
  if (item.id === 'logout') {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => {
           console.log('User logged out');
            router.replace('/login');
            console.log('User logged out');
          },
        },
      ]
    );
    return;
  }

  Alert.alert(item.label, 'Coming soon');
};

  return (
    <View style={styles.sectionBlock}>
      <SectionTitle title="SETTINGS" />
      <View style={styles.listCard}>
        {settingsItems.map((item, index) => (
          <View key={item.id}>
            <Pressable
              style={({ pressed }) => [
                styles.settingsRow,
                pressed && styles.pressed,
              ]}
              onPress={() => handlePress(item)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <View
                style={[styles.settingsIconWrap, { backgroundColor: item.iconBg }]}
              >
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={item.textColor ?? colors.text}
                />
              </View>

              <Text
                style={[
                  styles.settingsLabel,
                  item.textColor ? { color: item.textColor } : null,
                ]}
              >
                {item.label}
              </Text>

              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>

            {index < settingsItems.length - 1 ? (
              <View style={styles.divider} />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader />
        <HealthSummaryGrid />
        <QuickActionsRow />
        <HealthInfoSection />
        <SettingsSection />

        <Text style={styles.footerText}>App version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 20,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.muted,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  email: {
    marginTop: 4,
    fontSize: 14,
    color: colors.muted,
  },
  premiumBadge: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  premiumText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  greeting: {
    marginTop: 10,
    fontSize: 13,
    color: colors.muted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickAction: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  listCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  listLabel: {
    fontSize: 15,
    color: colors.text,
  },
  listValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 16,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  pressed: {
    opacity: 0.75,
  },
});