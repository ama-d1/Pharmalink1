import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Image,
  Dimensions,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassBackground } from '@/components/glass/GlassBackground';
import { GlassCard } from '@/components/glass/GlassCard';
import { GlassButton } from '@/components/glass/GlassButton';
import { GlassTheme } from '@/constants/glassTheme';
import { useAuth } from '@/context/AuthContext';
import {
  getPharmacyById,
  getPharmacyReviews,
  submitPharmacyReview,
  deletePharmacyReview,
  Pharmacy,
  PharmacyReview,
} from '@/services/pharmacyService';

const { width: screenWidth } = Dimensions.get('window');

type PharmacyHours = {
  [key: string]: { open: string; close: string; closed?: boolean };
};

type DetailedPharmacy = Pharmacy & {
  images?: string[];
  detailedHours?: PharmacyHours;
  facilities?: string[];
  paymentMethods?: string[];
  languages?: string[];
  specialties?: string[];
};

export default function PharmacyDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'info' | 'services' | 'reviews'>('info');

  const [reviews, setReviews] = useState<PharmacyReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [myRatingDraft, setMyRatingDraft] = useState(0);
  const [myCommentDraft, setMyCommentDraft] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (id) {
      loadPharmacyDetails(id);
    }
  }, [id]);

  useEffect(() => {
    if (id && selectedTab === 'reviews') {
      loadReviews(id);
    }
  }, [id, selectedTab]);

  const loadPharmacyDetails = async (pharmacyId: string) => {
    setLoading(true);
    try {
      const pharmacyData = await getPharmacyById(pharmacyId);
      setPharmacy(pharmacyData);
    } catch (error) {
      console.error('Error loading pharmacy details:', error);
      Alert.alert('Error', 'Could not load pharmacy details');
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = useCallback(async (pharmacyId: string) => {
    setReviewsLoading(true);
    try {
      const data = await getPharmacyReviews(pharmacyId);
      setReviews(data);
      const mine = user?.userId ? data.find((r) => r.userId === user.userId) : undefined;
      setMyRatingDraft(mine?.rating ?? 0);
      setMyCommentDraft(mine?.comment ?? '');
    } finally {
      setReviewsLoading(false);
    }
  }, [user?.userId]);

  const myReview = user?.userId ? reviews.find((r) => r.userId === user.userId) : undefined;

  const handleSubmitReview = async () => {
    if (!id || !user?.userId) return;
    if (myRatingDraft < 1) {
      Alert.alert('Add a rating', 'Tap a star to rate this pharmacy before submitting.');
      return;
    }
    setSubmittingReview(true);
    try {
      await submitPharmacyReview(id, myRatingDraft, myCommentDraft.trim());
      await loadReviews(id);
      await loadPharmacyDetails(id); // rating/reviewCount just changed
    } catch (error: any) {
      Alert.alert('Could not submit review', error?.message || 'Something went wrong.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = () => {
    if (!id || !myReview) return;
    Alert.alert('Delete your review?', 'This can\'t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePharmacyReview(id, myReview.id);
            setMyRatingDraft(0);
            setMyCommentDraft('');
            await loadReviews(id);
            await loadPharmacyDetails(id);
          } catch (error: any) {
            Alert.alert('Could not delete review', error?.message || 'Something went wrong.');
          }
        },
      },
    ]);
  };

  const handleCall = () => {
    if (pharmacy?.phone) {
      Linking.openURL(`tel:${pharmacy.phone}`);
    }
  };

  const handleDirections = () => {
    if (pharmacy) {
      const url = `https://maps.google.com/?q=${pharmacy.latitude},${pharmacy.longitude}`;
      Linking.openURL(url);
    }
  };

  const handleEmail = () => {
    if (pharmacy?.email) {
      Linking.openURL(`mailto:${pharmacy.email}`);
    }
  };

  const handleWebsite = () => {
    if (pharmacy?.website) {
      Linking.openURL(pharmacy.website);
    }
  };

  if (loading) {
    return (
      <GlassBackground>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={GlassTheme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Pharmacy Details</Text>
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </GlassBackground>
    );
  }

  if (!pharmacy) {
    return (
      <GlassBackground>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={GlassTheme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Pharmacy Details</Text>
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color={GlassTheme.colors.textMuted} />
            <Text style={styles.errorTitle}>Pharmacy Not Found</Text>
            <Text style={styles.errorText}>The pharmacy you're looking for could not be found.</Text>
            <GlassButton 
              label="Go Back" 
              onPress={() => router.back()} 
              style={styles.backButton}
            />
          </View>
        </SafeAreaView>
      </GlassBackground>
    );
  }

  const tabs = [
    { key: 'info', label: 'Info', icon: 'information-circle' },
    { key: 'services', label: 'Services', icon: 'medical' },
    { key: 'reviews', label: 'Reviews', icon: 'star' }
  ];

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={GlassTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Pharmacy Details</Text>
          <TouchableOpacity onPress={handleCall} style={styles.callBtn}>
            <Ionicons name="call" size={20} color={GlassTheme.colors.accent} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Pharmacy Header */}
          <GlassCard gradient glow style={styles.headerCard}>
            <View style={styles.pharmacyHeader}>
              <View style={styles.pharmacyIcon}>
                <Ionicons name="storefront" size={32} color={GlassTheme.colors.accent} />
              </View>
              <View style={styles.pharmacyInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
                  {pharmacy.verified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={GlassTheme.colors.success} />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.pharmacyAddress}>{pharmacy.address}</Text>
                <Text style={styles.pharmacyRegion}>{pharmacy.city}, {pharmacy.region}</Text>
              </View>
            </View>

            {/* Status and Rating */}
            <View style={styles.statusRow}>
              <View style={[
                styles.statusBadge,
                pharmacy.isOpen ? styles.openBadge : styles.closedBadge
              ]}>
                <Ionicons
                  name={pharmacy.isOpen ? "checkmark-circle" : "close-circle"}
                  size={14}
                  color={pharmacy.isOpen ? GlassTheme.colors.success : GlassTheme.colors.danger}
                />
                <Text style={[
                  styles.statusText,
                  pharmacy.isOpen ? styles.openText : styles.closedText
                ]}>
                  {pharmacy.isOpen ? 'Open Now' : 'Closed'}
                </Text>
              </View>
              
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color={GlassTheme.colors.amber} />
                <Text style={styles.ratingText}>{pharmacy.rating}</Text>
                <Text style={styles.reviewCount}>({pharmacy.reviewCount} reviews)</Text>
              </View>

              {pharmacy.distance && (
                <View style={styles.distanceContainer}>
                  <Ionicons name="location" size={14} color={GlassTheme.colors.accent} />
                  <Text style={styles.distanceText}>{pharmacy.distance}km away</Text>
                </View>
              )}
            </View>
          </GlassCard>

          {/* Quick Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={handleCall} style={styles.actionBtn}>
              <Ionicons name="call" size={20} color={GlassTheme.colors.accent} />
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleDirections} style={styles.actionBtn}>
              <Ionicons name="navigate" size={20} color={GlassTheme.colors.accent} />
              <Text style={styles.actionText}>Directions</Text>
            </TouchableOpacity>
            
            {pharmacy.email && (
              <TouchableOpacity onPress={handleEmail} style={styles.actionBtn}>
                <Ionicons name="mail" size={20} color={GlassTheme.colors.accent} />
                <Text style={styles.actionText}>Email</Text>
              </TouchableOpacity>
            )}
            
            {pharmacy.website && (
              <TouchableOpacity onPress={handleWebsite} style={styles.actionBtn}>
                <Ionicons name="globe" size={20} color={GlassTheme.colors.accent} />
                <Text style={styles.actionText}>Website</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setSelectedTab(tab.key as any)}
                style={[
                  styles.tab,
                  selectedTab === tab.key && styles.activeTab
                ]}
              >
                <Ionicons 
                  name={tab.icon as any} 
                  size={18} 
                  color={selectedTab === tab.key ? GlassTheme.colors.accent : GlassTheme.colors.textMuted} 
                />
                <Text style={[
                  styles.tabText,
                  selectedTab === tab.key && styles.activeTabText
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          {selectedTab === 'info' && (
            <View style={styles.tabContent}>
              {/* Hours */}
              <GlassCard style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Ionicons name="time" size={20} color={GlassTheme.colors.accent} />
                  <Text style={styles.infoTitle}>Opening Hours</Text>
                </View>
                <Text style={styles.hoursText}>{pharmacy.openHours}</Text>
                <Text style={styles.hoursNote}>
                  {pharmacy.isOpen ? 'Currently open' : 'Currently closed'}
                </Text>
              </GlassCard>

              {/* Contact Information */}
              <GlassCard style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Ionicons name="call" size={20} color={GlassTheme.colors.accent} />
                  <Text style={styles.infoTitle}>Contact Information</Text>
                </View>
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={16} color={GlassTheme.colors.textMuted} />
                  <Text style={styles.contactText}>{pharmacy.phone}</Text>
                </View>
                {pharmacy.email && (
                  <View style={styles.contactRow}>
                    <Ionicons name="mail-outline" size={16} color={GlassTheme.colors.textMuted} />
                    <Text style={styles.contactText}>{pharmacy.email}</Text>
                  </View>
                )}
                {pharmacy.website && (
                  <View style={styles.contactRow}>
                    <Ionicons name="globe-outline" size={16} color={GlassTheme.colors.textMuted} />
                    <Text style={styles.contactText}>{pharmacy.website}</Text>
                  </View>
                )}
              </GlassCard>

              {/* About */}
              {pharmacy.description && (
                <GlassCard style={styles.infoCard}>
                  <View style={styles.infoHeader}>
                    <Ionicons name="information-circle" size={20} color={GlassTheme.colors.accent} />
                    <Text style={styles.infoTitle}>About</Text>
                  </View>
                  <Text style={styles.descriptionText}>{pharmacy.description}</Text>
                </GlassCard>
              )}
            </View>
          )}

          {selectedTab === 'services' && (
            <View style={styles.tabContent}>
              <GlassCard style={styles.servicesCard}>
                <View style={styles.infoHeader}>
                  <Ionicons name="medical" size={20} color={GlassTheme.colors.accent} />
                  <Text style={styles.infoTitle}>Available Services</Text>
                </View>
                <View style={styles.servicesGrid}>
                  {pharmacy.services.map((service, index) => (
                    <View key={index} style={styles.serviceItem}>
                      <View style={styles.serviceIcon}>
                        <Ionicons 
                          name={getServiceIcon(service)} 
                          size={18} 
                          color={GlassTheme.colors.accent} 
                        />
                      </View>
                      <Text style={styles.serviceText}>{service}</Text>
                    </View>
                  ))}
                </View>
              </GlassCard>
            </View>
          )}

          {selectedTab === 'reviews' && (
            <View style={styles.tabContent}>
              {/* Rating Overview */}
              <GlassCard style={styles.ratingOverview}>
                <View style={styles.ratingHeader}>
                  <Text style={styles.bigRating}>{pharmacy.rating > 0 ? pharmacy.rating.toFixed(1) : '—'}</Text>
                  <View style={styles.ratingDetails}>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name="star"
                          size={16}
                          color={star <= Math.round(pharmacy.rating) ? GlassTheme.colors.amber : GlassTheme.colors.textMuted}
                        />
                      ))}
                    </View>
                    <Text style={styles.reviewsText}>
                      {pharmacy.reviewCount > 0 ? `Based on ${pharmacy.reviewCount} review${pharmacy.reviewCount === 1 ? '' : 's'}` : 'No reviews yet'}
                    </Text>
                  </View>
                </View>
              </GlassCard>

              {/* Write / edit your own review */}
              <GlassCard style={styles.writeReviewCard}>
                <Text style={styles.infoTitle}>{myReview ? 'Your review' : 'Write a review'}</Text>
                <View style={styles.starPickerRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setMyRatingDraft(star)} hitSlop={6}>
                      <Ionicons
                        name={star <= myRatingDraft ? 'star' : 'star-outline'}
                        size={30}
                        color={GlassTheme.colors.amber}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Share your experience (optional)"
                  placeholderTextColor={GlassTheme.colors.textDim}
                  value={myCommentDraft}
                  onChangeText={setMyCommentDraft}
                  multiline
                  maxLength={1000}
                />
                <View style={styles.reviewFormActions}>
                  <GlassButton
                    label={myReview ? 'Update Review' : 'Submit Review'}
                    onPress={handleSubmitReview}
                    loading={submittingReview}
                    style={{ flex: 1 }}
                  />
                  {myReview && (
                    <TouchableOpacity onPress={handleDeleteReview} style={styles.deleteReviewBtn} hitSlop={6}>
                      <Ionicons name="trash-outline" size={20} color={GlassTheme.colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              </GlassCard>

              {/* Review list */}
              {reviewsLoading ? (
                <ActivityIndicator color={GlassTheme.colors.accent} style={{ marginTop: 12 }} />
              ) : reviews.length === 0 ? (
                <GlassCard style={styles.reviewCard}>
                  <View style={styles.reviewsEmptyIconWrap}>
                    <Ionicons name="chatbubble-ellipses-outline" size={28} color={GlassTheme.colors.primary} />
                  </View>
                  <Text style={styles.reviewsTitle}>No reviews yet</Text>
                  <Text style={styles.reviewsPlaceholder}>
                    Be the first to share your experience with this pharmacy.
                  </Text>
                </GlassCard>
              ) : (
                reviews.map((review) => (
                  <GlassCard key={review.id} style={styles.reviewItemCard}>
                    <View style={styles.reviewItemHeader}>
                      <Text style={styles.reviewAuthor}>
                        {review.userId === user?.userId ? 'You' : review.authorName}
                      </Text>
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name="star"
                            size={12}
                            color={star <= review.rating ? GlassTheme.colors.amber : GlassTheme.colors.textMuted}
                          />
                        ))}
                      </View>
                    </View>
                    {!!review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                    <Text style={styles.reviewDate}>
                      {new Date(review.updatedAt || review.createdAt).toLocaleDateString()}
                    </Text>
                  </GlassCard>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  );
}

// Helper function to get appropriate icons for services
function getServiceIcon(service: string): any {
  const serviceIcons: Record<string, string> = {
    'Prescription': 'receipt',
    'OTC Medications': 'medical',
    'Health Consultation': 'people',
    'Blood Pressure Check': 'heart',
    'Vaccination': 'shield-checkmark',
    'Health Screening': 'analytics',
    'Medical Devices': 'hardware-chip',
    'Traditional Medicine': 'leaf',
    'Student Health': 'school'
  };
  
  return serviceIcons[service] || 'medical';
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    flex: 1,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // FIXED — was 'rgba(20,184,166,0.2)', a teal matching no GlassTheme
    // token (accent is '#0EA5E9') — a leftover from an earlier palette.
    backgroundColor: GlassTheme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: GlassTheme.colors.textMuted,
    fontSize: 16,
  },
  
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorTitle: {
    color: GlassTheme.colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: GlassTheme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    minWidth: 120,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  headerCard: {
    marginBottom: 16,
  },
  pharmacyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  pharmacyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: GlassTheme.colors.accentLight, // FIXED — was the off-palette teal 'rgba(20,184,166,0.2)'
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  pharmacyInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pharmacyName: {
    fontSize: 20,
    fontWeight: '700',
    color: GlassTheme.colors.text,
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: GlassTheme.colors.successLight, // FIXED — hardcoded 'rgba(16, 185, 129, 0.1)'
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    color: GlassTheme.colors.success, // FIXED — hardcoded '#10B981'
    fontSize: 10,
    fontWeight: '600',
  },
  pharmacyAddress: {
    fontSize: 14,
    color: GlassTheme.colors.textMuted,
    marginBottom: 2,
  },
  pharmacyRegion: {
    fontSize: 12,
    color: GlassTheme.colors.textDim,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  openBadge: {
    backgroundColor: GlassTheme.colors.successLight, // FIXED — hardcoded 'rgba(16, 185, 129, 0.1)'
  },
  closedBadge: {
    backgroundColor: GlassTheme.colors.dangerLight, // FIXED — hardcoded 'rgba(239, 68, 68, 0.1)'
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  openText: {
    color: GlassTheme.colors.success, // FIXED — hardcoded '#10B981'
  },
  closedText: {
    color: GlassTheme.colors.danger, // FIXED — hardcoded '#EF4444'
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: GlassTheme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  reviewCount: {
    color: GlassTheme.colors.textMuted,
    fontSize: 12,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    color: GlassTheme.colors.accent,
    fontSize: 12,
    fontWeight: '500',
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    // FIXED — was invisible 'rgba(255,255,255,0.1)' against the flat
    // light background (the exact low-contrast issue FRONTEND_TODO
    // flagged on this screen). surfaceAlt is the real token for a subtle,
    // visible-but-quiet card surface.
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderRadius: 12,
    gap: 8,
  },
  actionText: {
    color: GlassTheme.colors.text,
    fontSize: 12,
    fontWeight: '500',
  },

  tabsContainer: {
    flexDirection: 'row',
    // FIXED — was near-invisible 'rgba(255,255,255,0.05)' against the
    // flat light background. surfaceAlt gives the tab track a real,
    // subtly-visible surface to sit on.
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: GlassTheme.colors.accentLight, // FIXED — was the off-palette teal 'rgba(20,184,166,0.2)'
  },
  tabText: {
    color: GlassTheme.colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: GlassTheme.colors.accent,
  },

  tabContent: {
    gap: 16,
  },
  infoCard: {
    gap: 12,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GlassTheme.colors.text,
  },
  hoursText: {
    fontSize: 18,
    fontWeight: '600',
    color: GlassTheme.colors.text,
  },
  hoursNote: {
    fontSize: 12,
    color: GlassTheme.colors.textMuted,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: GlassTheme.colors.text,
  },
  descriptionText: {
    fontSize: 14,
    color: GlassTheme.colors.textMuted,
    lineHeight: 20,
  },

  servicesCard: {
    gap: 16,
  },
  servicesGrid: {
    gap: 12,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: GlassTheme.colors.surfaceAlt, // FIXED — was near-invisible 'rgba(255,255,255,0.05)'
    borderRadius: 8,
  },
  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GlassTheme.colors.accentLight, // FIXED — was the off-palette teal 'rgba(20,184,166,0.2)'
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceText: {
    fontSize: 14,
    color: GlassTheme.colors.text,
    fontWeight: '500',
  },

  ratingOverview: {
    alignItems: 'center',
    padding: 24,
  },
  ratingHeader: {
    alignItems: 'center',
    gap: 8,
  },
  bigRating: {
    fontSize: 48,
    fontWeight: '700',
    color: GlassTheme.colors.text,
  },
  ratingDetails: {
    alignItems: 'center',
    gap: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  reviewsText: {
    color: GlassTheme.colors.textMuted,
    fontSize: 14,
  },
  reviewCard: {
    gap: 10,
    alignItems: 'center',
    paddingVertical: 24,
  },
  reviewsEmptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GlassTheme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  reviewsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: GlassTheme.colors.text,
    textAlign: 'center',
  },
  reviewsPlaceholder: {
    fontSize: 14,
    color: GlassTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  writeReviewCard: {
    gap: 12,
  },
  starPickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reviewInput: {
    backgroundColor: GlassTheme.colors.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    minHeight: 70,
    fontSize: 14,
    color: GlassTheme.colors.text,
    textAlignVertical: 'top',
  },
  reviewFormActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteReviewBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: GlassTheme.colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  reviewItemCard: {
    gap: 6,
  },
  reviewItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: GlassTheme.colors.text,
  },
  reviewComment: {
    fontSize: 14,
    color: GlassTheme.colors.textMuted,
    lineHeight: 20,
  },
  reviewDate: {
    fontSize: 11,
    color: GlassTheme.colors.textDim,
  },
});