import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F0F4FF' }}>

      <View style={{
        backgroundColor: '#0B2545',
        padding: 24,
        paddingTop: 60,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: '#5DC8A4', fontSize: 13, fontWeight: '600' }}>Good morning 👋</Text>
            <Text style={{ color: '#ffffff', fontSize: 24, fontWeight: 'bold', marginTop: 4 }}>
              Ama Dansoa
            </Text>
          </View>
          <TouchableOpacity style={{
            backgroundColor: '#1A6EBD',
            borderRadius: 50,
            padding: 10,
          }}>
            <Ionicons name="notifications-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={{
          backgroundColor: '#1A6EBD',
          borderRadius: 20,
          padding: 20,
          marginTop: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <View>
            <Text style={{ color: '#ffffff', opacity: 0.8, fontSize: 13 }}>Today's Medications</Text>
            <Text style={{ color: '#ffffff', fontSize: 28, fontWeight: 'bold', marginTop: 4 }}>3 doses</Text>
            <View style={{
              backgroundColor: '#5DC8A4',
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 4,
              marginTop: 8,
              alignSelf: 'flex-start',
            }}>
              <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>Next in 2 hours</Text>
            </View>
          </View>
          <Ionicons name="medkit" size={60} color="rgba(255,255,255,0.2)" />
        </View>
      </View>

      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0B2545', marginBottom: 16 }}>
          Quick Actions
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>

          <TouchableOpacity style={{ alignItems: 'center' }}>
            <View style={{ backgroundColor: '#1A6EBD', borderRadius: 20, padding: 18, width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="cart-outline" size={28} color="#ffffff" />
            </View>
            <Text style={{ fontSize: 12, color: '#0B2545', marginTop: 8, fontWeight: '600' }}>Order</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ alignItems: 'center' }}>
            <View style={{ backgroundColor: '#0A9396', borderRadius: 20, padding: 18, width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chatbubble-outline" size={28} color="#ffffff" />
            </View>
            <Text style={{ fontSize: 12, color: '#0B2545', marginTop: 8, fontWeight: '600' }}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ alignItems: 'center' }}>
            <View style={{ backgroundColor: '#F59E0B', borderRadius: 20, padding: 18, width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="location-outline" size={28} color="#ffffff" />
            </View>
            <Text style={{ fontSize: 12, color: '#0B2545', marginTop: 8, fontWeight: '600' }}>Pharmacy</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ alignItems: 'center' }}>
            <View style={{ backgroundColor: '#7C3AED', borderRadius: 20, padding: 18, width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="people-outline" size={28} color="#ffffff" />
            </View>
            <Text style={{ fontSize: 12, color: '#0B2545', marginTop: 8, fontWeight: '600' }}>Community</Text>
          </TouchableOpacity>

        </View>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0B2545', marginBottom: 16 }}>
          Upcoming Reminders
        </Text>

        <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ backgroundColor: '#E8F4FD', borderRadius: 12, padding: 10, marginRight: 14 }}>
            <Ionicons name="time-outline" size={24} color="#1A6EBD" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: 'bold', color: '#0B2545', fontSize: 14 }}>Paracetamol 500mg</Text>
            <Text style={{ color: '#888888', fontSize: 12, marginTop: 2 }}>2:00 PM · 1 tablet</Text>
          </View>
          <View style={{ backgroundColor: '#E8F8F2', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: '#0A9396', fontSize: 11, fontWeight: 'bold' }}>Upcoming</Text>
          </View>
        </View>

        <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ backgroundColor: '#FEF3C7', borderRadius: 12, padding: 10, marginRight: 14 }}>
            <Ionicons name="medical-outline" size={24} color="#F59E0B" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: 'bold', color: '#0B2545', fontSize: 14 }}>Vitamin C 1000mg</Text>
            <Text style={{ color: '#888888', fontSize: 12, marginTop: 2 }}>6:00 PM · 1 tablet</Text>
          </View>
          <View style={{ backgroundColor: '#FEF3C7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: 'bold' }}>Later</Text>
          </View>
        </View>
      </View>

      <View style={{ padding: 20 }}>
        <View style={{ backgroundColor: '#0B2545', borderRadius: 20, padding: 20 }}>
          <Text style={{ color: '#5DC8A4', fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>
            💡 HEALTH TIP OF THE DAY
          </Text>
          <Text style={{ color: '#ffffff', fontSize: 13, lineHeight: 20 }}>
            Drink at least 8 glasses of water daily to help your medications work effectively.
          </Text>
        </View>
      </View>

    </ScrollView>
  );
}