import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserMedications, updateDoseStatus } from '../../services/medicationService';

const DEMO_USER_ID = '0962a902-bb84-486e-bd9f-d01120045b05';

export default function MedicationsScreen() {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      const data = await getUserMedications(DEMO_USER_ID);
      setMedications(data);
    } catch (error) {
      Alert.alert('Error', 'Could not load medications');
    } finally {
      setLoading(false);
    }
  };

  const handleDoseStatus = async (medicationId: string, status: string) => {
    try {
      await updateDoseStatus(medicationId, status);
      Alert.alert('Success', status === 'TAKEN' ? 'Marked as taken! ✅' : 'Snoozed ⏰');
      fetchMedications();
    } catch (error) {
      Alert.alert('Error', 'Could not update status');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ color: '#888888', marginTop: 12 }}>Loading medications...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>My Medications</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* SUMMARY CARD */}
      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryLabel}>Active Medications</Text>
          <Text style={styles.summaryValue}>{medications.length} Medicines</Text>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeText}>Next dose in 2 hours</Text>
          </View>
        </View>
        <Ionicons name="medical" size={55} color="rgba(255,255,255,0.15)" />
      </View>

      {/* MEDICATIONS LIST */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Medications</Text>

        {medications.length === 0 ? (
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}>
            <Ionicons name="medical-outline" size={48} color="#cccccc" />
            <Text style={{ color: '#888888', fontSize: 15, marginTop: 12 }}>No medications yet</Text>
            <Text style={{ color: '#aaaaaa', fontSize: 13, marginTop: 4 }}>Tap + to add your first medication</Text>
          </View>
        ) : (
          medications.map((med: any) => (
            <View key={med.id} style={styles.medCard}>
              <View style={[styles.medIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="medical-outline" size={20} color="#2563EB" />
              </View>

              <View style={styles.medInfo}>
                <Text style={styles.medName}>{med.name} {med.dosage}</Text>
                <Text style={styles.medTime}>{med.reminderTime} · {med.frequency}</Text>
                {med.instructions ? (
                  <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>📋 {med.instructions}</Text>
                ) : null}
              </View>

              <View style={{
                backgroundColor: med.doseStatus === 'TAKEN' ? '#DCFCE7' : med.doseStatus === 'SNOOZED' ? '#FEF3C7' : '#DBEAFE',
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}>
                <Text style={{
                  color: med.doseStatus === 'TAKEN' ? '#15803D' : med.doseStatus === 'SNOOZED' ? '#D97706' : '#2563EB',
                  fontSize: 11,
                  fontWeight: '600',
                }}>
                  {med.doseStatus === 'TAKEN' ? 'Taken' : med.doseStatus === 'SNOOZED' ? 'Snoozed' : 'Upcoming'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* ACTION BUTTONS */}
      {medications.length > 0 && (
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          {medications.filter((med: any) => med.doseStatus === 'PENDING').map((med: any) => (
            <View key={med.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' }}>
              <Text style={{ fontWeight: '600', color: '#111827', marginBottom: 10 }}>{med.name}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => handleDoseStatus(med.id, 'TAKEN')}
                  style={{ flex: 1, backgroundColor: '#2563EB', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓ Take Now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDoseStatus(med.id, 'SNOOZED')}
                  style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#374151', fontSize: 12, fontWeight: 'bold' }}>⏰ Snooze</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#2563EB' },
  addBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  summaryCard: { backgroundColor: '#3B82F6', marginHorizontal: 20, borderRadius: 20, padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  summaryValue: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 4 },
  summaryBadge: { backgroundColor: '#DCFCE7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 10 },
  summaryBadgeText: { color: '#15803D', fontSize: 11, fontWeight: '600' },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 14 },
  medCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB', gap: 12 },
  medIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  medInfo: { flex: 1 },
  medName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  medTime: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});