import React, { useState } from 'react';
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
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { processPayment, createOrder } from '@/services/orderService';

type PaymentMethod = 'momo' | 'card' | 'bank';

export default function PaymentScreen() {
  const router = useRouter();
  const { address } = useLocalSearchParams<{ address: string }>();
  const { user } = useAuth();
  const { getCartItems, getCartTotal, clearCart } = useCart();
  
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('momo');
  const [loading, setLoading] = useState(false);
  
  // Mobile Money fields
  const [momoNumber, setMomoNumber] = useState('');
  const [momoProvider, setMomoProvider] = useState<'mtn' | 'vodafone' | 'airtel'>('mtn');
  
  // Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');

  const cartItems = getCartItems();
  const subtotal = getCartTotal();
  const deliveryFee = 5.00;
  const total = subtotal + deliveryFee;

  const paymentMethods = [
    {
      id: 'momo' as PaymentMethod,
      name: 'Mobile Money',
      icon: 'phone-portrait',
      description: 'Pay with MTN, Vodafone, or AirtelTigo'
    },
    {
      id: 'card' as PaymentMethod,
      name: 'Credit/Debit Card',
      icon: 'card',
      description: 'Visa, Mastercard, etc.'
    },
    {
      id: 'bank' as PaymentMethod,
      name: 'Bank Transfer',
      icon: 'business',
      description: 'Direct bank transfer'
    }
  ];

  const momoProviders = [
    { id: 'mtn', name: 'MTN MoMo', color: '#FFCC00' },
    { id: 'vodafone', name: 'Vodafone Cash', color: '#E60000' },
    { id: 'airtel', name: 'AirtelTigo Money', color: '#FF6600' }
  ];

  const handlePayment = async () => {
    if (!user?.userId) {
      Alert.alert('Error', 'Please log in to complete payment');
      return;
    }

    if (cartItems.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }

    // Validate payment method details
    if (selectedPayment === 'momo' && !momoNumber) {
      Alert.alert('Error', 'Please enter your mobile money number');
      return;
    }

    if (selectedPayment === 'card' && (!cardNumber || !expiryDate || !cvv || !cardName)) {
      Alert.alert('Error', 'Please fill in all card details');
      return;
    }

    setLoading(true);

    try {
      // Create order first
      const orderItems = cartItems.map(item => ({
        drugName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
      }));

      const paymentMethodString = selectedPayment === 'momo' 
        ? `Mobile Money (${momoProviders.find(p => p.id === momoProvider)?.name})`
        : selectedPayment === 'card' 
          ? 'Credit/Debit Card'
          : 'Bank Transfer';

      const order = await createOrder(
        user.userId, 
        orderItems, 
        address || 'Default Address', 
        paymentMethodString
      );

      // Process payment
      const paymentData = selectedPayment === 'momo' 
        ? { 
            method: 'momo', 
            phoneNumber: momoNumber, 
            provider: momoProvider,
            amount: total
          }
        : selectedPayment === 'card'
          ? {
              method: 'card',
              cardNumber: cardNumber.replace(/\s/g, ''),
              expiryDate,
              cvv,
              cardholderName: cardName,
              amount: total
            }
          : {
              method: 'bank',
              amount: total
            };

      await processPayment(order.id, paymentData);
      
      // Clear cart and navigate to delivery options
      clearCart();
      Alert.alert(
        'Payment Successful!', 
        `Your payment of ₵${total.toFixed(2)} has been processed successfully.`,
        [
          { 
            text: 'Set Delivery Options', 
            onPress: () => router.push({
              pathname: '/delivery',
              params: { orderId: order.id }
            })
          }
        ]
      );

    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(
        'Payment Failed', 
        'There was an issue processing your payment. Please try again or contact support.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={GlassTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Payment</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Order Summary */}
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items ({cartItems.length})</Text>
              <Text style={styles.summaryValue}>₵{subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>₵{deliveryFee.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₵{total.toFixed(2)}</Text>
            </View>
          </GlassCard>

          {/* Payment Methods */}
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              onPress={() => setSelectedPayment(method.id)}
              style={[
                styles.paymentMethod,
                selectedPayment === method.id && styles.paymentMethodSelected
              ]}
            >
              <View style={styles.paymentMethodContent}>
                <View style={styles.paymentMethodLeft}>
                  <View style={[
                    styles.paymentMethodIcon,
                    selectedPayment === method.id && styles.paymentMethodIconSelected
                  ]}>
                    <Ionicons 
                      name={method.icon as any} 
                      size={20} 
                      color={
                        selectedPayment === method.id 
                          ? GlassTheme.colors.accent 
                          : GlassTheme.colors.primary
                      } 
                    />
                  </View>
                  <View>
                    <Text style={styles.paymentMethodName}>{method.name}</Text>
                    <Text style={styles.paymentMethodDesc}>{method.description}</Text>
                  </View>
                </View>
                <View style={[
                  styles.radioButton,
                  selectedPayment === method.id && styles.radioButtonSelected
                ]}>
                  {selectedPayment === method.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {/* Payment Details */}
          {selectedPayment === 'momo' && (
            <GlassCard style={styles.paymentDetails}>
              <Text style={styles.sectionTitle}>Mobile Money Details</Text>
              
              <Text style={styles.fieldLabel}>Select Provider</Text>
              <View style={styles.providerContainer}>
                {momoProviders.map((provider) => (
                  <TouchableOpacity
                    key={provider.id}
                    onPress={() => setMomoProvider(provider.id as any)}
                    style={[
                      styles.providerBtn,
                      momoProvider === provider.id && styles.providerBtnSelected
                    ]}
                  >
                    <Text style={[
                      styles.providerText,
                      momoProvider === provider.id && styles.providerTextSelected
                    ]}>
                      {provider.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <GlassInput
                label="Mobile Number"
                placeholder="024 123 4567"
                value={momoNumber}
                onChangeText={setMomoNumber}
                keyboardType="phone-pad"
                icon="call"
              />
            </GlassCard>
          )}

          {selectedPayment === 'card' && (
            <GlassCard style={styles.paymentDetails}>
              <Text style={styles.sectionTitle}>Card Details</Text>
              
              <GlassInput
                label="Cardholder Name"
                placeholder="John Doe"
                value={cardName}
                onChangeText={setCardName}
                icon="person"
              />
              
              <GlassInput
                label="Card Number"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChangeText={(value) => setCardNumber(formatCardNumber(value))}
                keyboardType="number-pad"
                maxLength={19}
                icon="card"
              />
              
              <View style={styles.cardRow}>
                <GlassInput
                  label="Expiry Date"
                  placeholder="MM/YY"
                  value={expiryDate}
                  onChangeText={(value) => setExpiryDate(formatExpiryDate(value))}
                  keyboardType="number-pad"
                  maxLength={5}
                  style={styles.cardFieldHalf}
                />
                
                <GlassInput
                  label="CVV"
                  placeholder="123"
                  value={cvv}
                  onChangeText={setCvv}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  style={styles.cardFieldHalf}
                />
              </View>
            </GlassCard>
          )}

          {selectedPayment === 'bank' && (
            <GlassCard style={styles.paymentDetails}>
              <Text style={styles.sectionTitle}>Bank Transfer</Text>
              <Text style={styles.bankInstructions}>
                You will receive bank details after confirming your order. 
                Complete the transfer within 24 hours to secure your order.
              </Text>
            </GlassCard>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <GlassButton
            label={`Pay ₵${total.toFixed(2)}`}
            onPress={handlePayment}
            loading={loading}
            size="lg"
          />
        </View>
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
  
  summaryCard: {
    marginBottom: 24,
  },
  sectionTitle: {
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
  totalRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    marginTop: 4,
  },
  totalLabel: {
    color: GlassTheme.colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  totalValue: {
    color: GlassTheme.colors.accent,
    fontSize: 20,
    fontWeight: '700',
  },
  
  paymentMethod: {
    marginBottom: 12,
  },
  paymentMethodSelected: {
    borderColor: GlassTheme.colors.accent,
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(37,99,235,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentMethodIconSelected: {
    backgroundColor: 'rgba(20,184,166,0.3)',
  },
  paymentMethodName: {
    color: GlassTheme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  paymentMethodDesc: {
    color: GlassTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
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
  
  paymentDetails: {
    marginTop: 16,
  },
  
  fieldLabel: {
    color: GlassTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  providerContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  providerBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  providerBtnSelected: {
    backgroundColor: GlassTheme.colors.accent,
  },
  providerText: {
    color: GlassTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  providerTextSelected: {
    color: 'white',
  },
  
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cardFieldHalf: {
    flex: 1,
  },
  
  bankInstructions: {
    color: GlassTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
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