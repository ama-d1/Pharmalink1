import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassInput } from '@/components/glass/GlassInput';
import { GlassTheme } from '@/constants/glassTheme';
import { LocationPickerModal } from '@/components/ui/LocationPickerModal';
import { requestDelivery } from '@/services/deliveryService';
import { LocationSuggestion } from '@/services/locationService';

type DeliverySpeed = 'standard' | 'express' | 'priority';

export default function DeliveryScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  
  const [selectedSpeed, setSelectedSpeed] = useState<DeliverySpeed>('standard');
  const [deliveryAddress, setDeliveryAddress] = useState('East Legon, Accra');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const deliveryOptions = [
    {
      id: 'standard' as DeliverySpeed,
      name: 'Standard Delivery',
      time: '2-3 hours',
      price: 5.00,
      icon: 'bicycle',
      description: 'Regular delivery within the city'
    },
    {
      id: 'express' as DeliverySpeed,
      name: 'Express Delivery', 
      time: '45-60 minutes',
      price: 15.00,
      icon: 'car-sport',
      description: 'Fast delivery for urgent needs'
    },
    {
      id: 'priority' as DeliverySpeed,
      name: 'Priority Delivery',
      time: '20-30 minutes',
      price: 25.00,
      icon: 'airplane',
      description: 'Emergency delivery service'
    }
  ];

  const selectedOption = deliveryOptions.find(option => option.id === selectedSpeed);

  const handleDeliveryRequest = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    if (!deliveryAddress.trim()) {
      Alert.alert('Error', 'Please enter your delivery address');
      return;
    }

    if (!orderId) {
      Alert.alert('Error', 'Order ID is missing');
      return;
    }

    setLoading(true);
    try {
      const deliveryData = {
        orderId,
        deliverySpeed: selectedSpeed,
        address: deliveryAddress,
        phoneNumber,
        instructions,
        estimatedFee: selectedOption?.price || 5.00
      };

      const deliveryResponse = await requestDelivery(deliveryData);
      
      Alert.alert(
        'Delivery Requested!',
        `Your ${selectedOption?.name.toLowerCase()} has been requested. Tracking Number: ${deliveryResponse.trackingNumber}. Expected delivery: ${selectedOption?.time}. You'll receive SMS updates on ${phoneNumber}.`,
        [
          { 
            text: 'Track Order', 
            onPress: () => router.replace('/(tabs)') 
          }
        ]
      );

    } catch (error) {
      console.error('Delivery request error:', error);
      Alert.alert('Error', 'Failed to request delivery. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = () => {
    setShowLocationPicker(true);
  };

  const handleLocationSelect = (location: LocationSuggestion) => {
    setDeliveryAddress(location.address);
  };

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={GlassTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Delivery Options</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Delivery Address */}
          <GlassCard style={styles.addressCard}>
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Ionicons name="location" size={20} color={GlassTheme.colors.accent} />
                <Text style={styles.cardTitle}>Delivery Address</Text>
              </View>
              <TouchableOpacity onPress={handleLocationChange} style={styles.changeBtn}>
                <Text style={styles.changeBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.addressText}>{deliveryAddress}</Text>
          </GlassCard>

          {/* Contact Information */}
          <GlassCard style={styles.contactCard}>
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Ionicons name="call" size={20} color={GlassTheme.colors.accent} />
                <Text style={styles.cardTitle}>Contact Information</Text>
              </View>
            </View>
            <GlassInput
              placeholder="Phone number for delivery updates"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              icon="call"
            />
          </GlassCard>

          {/* Delivery Speed Options */}
          <Text style={styles.sectionTitle}>Choose Delivery Speed</Text>
          {deliveryOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              onPress={() => setSelectedSpeed(option.id)}
              style={[
                styles.deliveryOption,
                selectedSpeed === option.id && styles.deliveryOptionSelected
              ]}
            >
              <GlassCard style={styles.deliveryCard}>
                <View style={styles.deliveryContent}>
                  <View style={styles.deliveryLeft}>
                    <View style={[
                      styles.deliveryIcon,
                      selectedSpeed === option.id && styles.deliveryIconSelected
                    ]}>
                      <Ionicons 
                        name={option.icon as any} 
                        size={24} 
                        color={
                          selectedSpeed === option.id 
                            ? GlassTheme.colors.accent 
                            : GlassTheme.colors.primary
                        } 
                      />
                    </View>
                    <View style={styles.deliveryInfo}>
                      <Text style={styles.deliveryName}>{option.name}</Text>
                      <Text style={styles.deliveryTime}>{option.time}</Text>
                      <Text style={styles.deliveryDesc}>{option.description}</Text>
                    </View>
                  </View>
                  <View style={styles.deliveryRight}>
                    <Text style={styles.deliveryPrice}>₵{option.price.toFixed(2)}</Text>
                    <View style={[
                      styles.radioButton,
                      selectedSpeed === option.id && styles.radioButtonSelected
                    ]}>
                      {selectedSpeed === option.id && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))}

          {/* Special Instructions */}
          <GlassCard style={styles.instructionsCard}>
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Ionicons name="document-text" size={20} color={GlassTheme.colors.accent} />
                <Text style={styles.cardTitle}>Special Instructions</Text>
              </View>
            </View>
            <GlassInput
              placeholder="Any special delivery instructions (optional)"
              value={instructions}
              onChangeText={setInstructions}
              multiline
              numberOfLines={3}
              style={styles.instructionsInput}
            />
          </GlassCard>

          {/* Delivery Summary */}
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Delivery Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service</Text>
              <Text style={styles.summaryValue}>{selectedOption?.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Estimated Time</Text>
              <Text style={styles.summaryValue}>{selectedOption?.time}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>₵{selectedOption?.price.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Contact</Text>
              <Text style={styles.summaryValue}>{phoneNumber || 'Not provided'}</Text>
            </View>
          </GlassCard>
        </ScrollView>

        <View style={styles.footer}>
          <GlassButton
            label={`Request ${selectedOption?.name} - ₵${selectedOption?.price.toFixed(2)}`}
            onPress={handleDeliveryRequest}
            loading={loading}
            size="lg"
          />
        </View>

        {/* Location Picker Modal */}
        <LocationPickerModal
          visible={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onSelect={handleLocationSelect}
          currentLocation={deliveryAddress}
          title="Select Delivery Location"
        />
      </SafeAreaView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: GlassTheme.colors.text,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  
  addressCard: {
    marginBottom: 16,
  },
  contactCard: {
    marginBottom: 24,
  },
  instructionsCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GlassTheme.colors.text,
  },
  changeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: GlassTheme.colors.primaryLight,
    borderRadius: 12,
  },
  changeBtnText: {
    color: GlassTheme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  addressText: {
    color: GlassTheme.colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: GlassTheme.colors.text,
    marginBottom: 16,
  },
  
  deliveryOption: {
    marginBottom: 12,
  },
  deliveryOptionSelected: {},
  deliveryCard: {
    padding: 0,
  },
  deliveryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  deliveryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deliveryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(37,99,235,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deliveryIconSelected: {
    backgroundColor: 'rgba(20,184,166,0.3)',
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryName: {
    fontSize: 16,
    fontWeight: '600',
    color: GlassTheme.colors.text,
    marginBottom: 2,
  },
  deliveryTime: {
    fontSize: 14,
    fontWeight: '500',
    color: GlassTheme.colors.accent,
    marginBottom: 2,
  },
  deliveryDesc: {
    fontSize: 12,
    color: GlassTheme.colors.textMuted,
  },
  deliveryRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  deliveryPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: GlassTheme.colors.text,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: GlassTheme.colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: GlassTheme.colors.accent,
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GlassTheme.colors.accent,
  },
  
  instructionsInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  summaryCard: {
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: GlassTheme.colors.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    color: GlassTheme.colors.textMuted,
    fontSize: 14,
  },
  summaryValue: {
    color: GlassTheme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(20px)',
  },
});