import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getActiveMedicationCount, getPendingMedications } from '../../services/medicationService';

const DEMO_USER_ID = '0962a902-bb84-486e-bd9f-d01120045b05';

export default function HomeScreen() {
  const [medicationCount, setMedicationCount] = useState(0);
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      const count = await getActiveMedicationCount(DEMO_USER_ID);
      setMedicationCount(count);
      const meds = await getPendingMedications(DEMO_USER_ID);
      setReminders(meds.slice(0, 3));
    } catch (error) {
      console.log('Could not load home data');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning 👋</Text>
          <Text style={styles.name}>Ama Dansoa</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn}>
          <Ionicons name="notifications-outline" size={22} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* Medication Card */}
      <View style={styles.medCard}>
        <View>
          <Text style={styles.medCardLabel}>Today's Medications</Text>
          <Text style={styles.medCardValue}>{medicationCount} doses</Text>
          <View style={styles.medCardBadge}>
            <Text style={styles.medCardBadgeText}>Next in 2 hours</Text>
          </View>
        </View>
        <Ionicons name="medkit" size={55} color="rgba(255,255,255,0.15)" />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>

          <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIcon, { backgroundColor: '#2563EB' }]}>
              <Ionicons name="cart-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.actionLabel}>Order</Text>
          </TouchableOpacity>

          {/* <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIcon, { backgroundColor: '#14B8A6' }]}>
              <Ionicons name="chatbubble-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.actionLabel}>Chat</Text>
          </TouchableOpacity> */}

          <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIcon, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="location-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.actionLabel}>Pharmacy</Text>
          </TouchableOpacity>

          {/* <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIcon, { backgroundColor: '#8B5CF6' }]}>
              <Ionicons name="people-outline" size={24} color="#fff" />
            </View>
            <Text style={styles.actionLabel}>Community</Text>
          </TouchableOpacity> */}

        </View>
      </View>

      {/* Reminders */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Upcoming Reminders</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {reminders.length === 0 ? (
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}>
            <Text style={{ color: '#6B7280', fontSize: 14 }}>No upcoming reminders</Text>
          </View>
        ) : (
          reminders.map((med: any, index: number) => (
            <View key={med.id} style={styles.reminderCard}>
              <View style={[styles.reminderIcon, { backgroundColor: index === 0 ? '#DBEAFE' : index === 1 ? '#FEF3C7' : '#EDE9FE' }]}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={index === 0 ? '#2563EB' : index === 1 ? '#F59E0B' : '#8B5CF6'}
                />
              </View>
              <View style={styles.reminderInfo}>
                <Text style={styles.reminderName}>{med.name} {med.dosage}</Text>
                <Text style={styles.reminderTime}>{med.reminderTime} · {med.frequency}</Text>
              </View>
              <View style={[styles.reminderBadge, { backgroundColor: med.doseStatus === 'PENDING' ? '#CCFBF1' : '#FEF3C7' }]}>
                <Text style={[styles.reminderBadgeText, { color: med.doseStatus === 'PENDING' ? '#14B8A6' : '#F59E0B' }]}>
                  {med.doseStatus === 'PENDING' ? 'Upcoming' : 'Later'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Health Tip */}
      <View style={styles.section}>
        <View style={styles.tipCard}>
          <Text style={styles.tipLabel}>💡 Health Tip of the Day</Text>
          <Text style={styles.tipText}>
            Drink at least 8 glasses of water daily to help your medications
            work effectively and reduce side effects.
          </Text>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  greeting: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  name: { fontSize: 22, fontWeight: '700', color: '#2563EB', marginTop: 2 },
  notifBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  medCard: { backgroundColor: '#3B82F6', marginHorizontal: 20, borderRadius: 20, padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  medCardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' },
  medCardValue: { color: '#fff', fontSize: 30, fontWeight: '700', marginTop: 4 },
  medCardBadge: { backgroundColor: '#DCFCE7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 10 },
  medCardBadgeText: { color: '#15803D', fontSize: 11, fontWeight: '600' },
  section: { paddingHorizontal: 20, paddingTop: 24, justifyContent: 'center',  gap: 12, marginBottom: 8 }, 
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 14 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,  gap: 8, },
  seeAll: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
  actionsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 14, gap: 24, },
  actionItem: { alignItems: 'center', gap: 8 },
  actionIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  reminderCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  reminderIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reminderInfo: { flex: 1, gap: 3 },
  reminderName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  reminderTime: { fontSize: 12, color: '#6B7280' },
  reminderBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  reminderBadgeText: { fontSize: 11, fontWeight: '600' },
  tipCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 32, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  tipLabel: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  tipText: { fontSize: 13, color: '#374151', lineHeight: 20 },
  
});