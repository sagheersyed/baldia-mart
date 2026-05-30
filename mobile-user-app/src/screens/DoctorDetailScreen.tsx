import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, 
  Dimensions, Share, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { telemedicineApi, normalizeUrl } from '../api/api';
import AppText from '../components/ui/AppText';
import { theme } from '../theme/theme';

const { width } = Dimensions.get('window');

export default function DoctorDetailScreen({ route, navigation }: any) {
  const { doctor } = route.params;
  const [clinics, setClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    try {
      setLoading(true);
      const res = await telemedicineApi.getClinics();
      setClinics(res.data || []);
    } catch (e) {
      console.warn('[DoctorDetail] fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = (clinic: any) => {
    navigation.navigate('ConsultationBooking', { doctor, clinic });
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `Check out Dr. ${doctor.name} (${doctor.specialization}) on Baldia Mart Pharma!`,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header with Background Gradient */}
        <View style={styles.headerBackground}>
          <LinearGradient
            colors={[theme.colors.pharma, theme.colors.pharma + 'DD', '#fff']}
            style={styles.gradient}
          />
          <SafeAreaView edges={['top']} style={styles.navBar}>
            <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            <View style={styles.navActions}>
              <Pressable onPress={onShare} style={styles.iconBtn}>
                <Ionicons name="share-outline" size={22} color="#fff" />
              </Pressable>
              <Pressable style={styles.iconBtn}>
                <Ionicons name="heart-outline" size={22} color="#fff" />
              </Pressable>
            </View>
          </SafeAreaView>

          <View style={styles.profileHeader}>
            <View style={styles.imageContainer}>
              <Image source={{ uri: normalizeUrl(doctor.imageUrl) }} style={styles.doctorImage} />
              <View style={styles.onlineBadge} />
            </View>
            <View style={styles.headerInfo}>
              <View style={styles.nameRow}>
                <AppText variant="h2" color="#fff">Dr. {doctor.name}</AppText>
                <MaterialCommunityIcons name="check-decagram" size={20} color="#fff" />
              </View>
              <AppText variant="bodyStrong" color="#ffffffDD">{doctor.specialization}</AppText>
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <AppText variant="overline" color="#fff">PMC Verified</AppText>
                </View>
                <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <AppText variant="overline" color="#fff">{doctor.experienceYears}+ Years Exp</AppText>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="star" size={20} color="#F59E0B" />
            </View>
            <AppText variant="bodyStrong">{doctor.rating || '4.9'}</AppText>
            <AppText variant="overline" color={theme.colors.textMuted}>Rating</AppText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: theme.colors.pharma + '20' }]}>
              <Ionicons name="people" size={20} color={theme.colors.pharma} />
            </View>
            <AppText variant="bodyStrong">2.5k+</AppText>
            <AppText variant="overline" color={theme.colors.textMuted}>Patients</AppText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: theme.colors.success + '20' }]}>
              <Ionicons name="chatbubble-ellipses" size={20} color={theme.colors.success} />
            </View>
            <AppText variant="bodyStrong">480</AppText>
            <AppText variant="overline" color={theme.colors.textMuted}>Reviews</AppText>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLine} />
            <AppText variant="title">About Doctor</AppText>
          </View>
          <AppText variant="body" color={theme.colors.textSecondary} style={styles.bioText}>
            {doctor.biography || "Dr. " + doctor.name + " is a dedicated medical professional specializing in " + doctor.specialization + ". Known for expert diagnosis and compassionate care."}
          </AppText>
          
          <View style={styles.highlights}>
             <View style={styles.highlightItem}>
               <FontAwesome5 name="graduation-cap" size={14} color={theme.colors.pharma} style={styles.highlightIcon} />
               <AppText variant="caption" color={theme.colors.textSecondary}>{doctor.degree || 'MBBS, Specialization'}</AppText>
             </View>
             <View style={styles.highlightItem}>
               <MaterialCommunityIcons name="translate" size={16} color={theme.colors.pharma} style={styles.highlightIcon} />
               <AppText variant="caption" color={theme.colors.textSecondary}>English, Urdu, Punjabi</AppText>
             </View>
          </View>
        </View>

        {/* Clinics Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLine} />
            <AppText variant="title">Practice Locations</AppText>
          </View>
          
          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.pharma} />
          ) : clinics.length > 0 ? (
            clinics.map((clinic) => (
              <Pressable key={clinic.id} style={styles.clinicCard} onPress={() => handleBook(clinic)}>
                <View style={styles.clinicMain}>
                  <View style={styles.clinicIconBox}>
                    <Ionicons 
                      name={clinic.type === 'Hospital' ? 'business' : (clinic.type === 'Video Room' ? 'videocam' : 'medical')} 
                      size={24} 
                      color={theme.colors.pharma} 
                    />
                  </View>
                  <View style={styles.clinicDetails}>
                    <View style={styles.clinicHeader}>
                      <AppText variant="bodyStrong" style={{ fontSize: 16 }}>{clinic.name}</AppText>
                      <View style={[styles.typeTag, { backgroundColor: clinic.type === 'Video Room' ? '#FFFBEB' : '#F0FDFA' }]}>
                        <AppText variant="overline" color={clinic.type === 'Video Room' ? '#B45309' : '#0F766E'}>
                          {clinic.type === 'Video Room' ? 'ONLINE' : 'ONSITE'}
                        </AppText>
                      </View>
                    </View>
                    <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
                      {clinic.address}
                    </AppText>
                    <View style={styles.clinicPricing}>
                      <AppText variant="bodyStrong" color={theme.colors.pharma}>Rs. {doctor.consultationFee}</AppText>
                      <View style={styles.dot} />
                      <AppText variant="captionStrong" color={theme.colors.success}>Available Today</AppText>
                    </View>
                  </View>
                </View>
                <View style={styles.clinicAction}>
                   <AppText variant="captionStrong" color={theme.colors.pharma}>
                     {clinic.type === 'Video Room' ? 'START VIDEO CONSULTATION' : 'BOOK HOSPITAL VISIT'}
                   </AppText>
                   <Ionicons name="arrow-forward" size={16} color={theme.colors.pharma} />
                </View>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyClinics}>
              <Ionicons name="calendar-outline" size={48} color={theme.colors.border} />
              <AppText variant="caption" color={theme.colors.textMuted} style={{ marginTop: 12 }}>
                No active schedules found for this doctor.
              </AppText>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Booking Summary Bar (Optional but nice) */}
      <View style={styles.stickyFooter}>
         <View>
           <AppText variant="caption" color={theme.colors.textMuted}>Starting from</AppText>
           <AppText variant="h3" color={theme.colors.pharma}>Rs. {doctor.consultationFee}</AppText>
         </View>
         <Pressable style={styles.primaryBookBtn} onPress={() => handleBook(clinics[0])}>
           <AppText variant="bodyStrong" color="#fff">Book Appointment</AppText>
         </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingBottom: 120 },
  headerBackground: {
    height: 280,
    position: 'relative',
    backgroundColor: theme.colors.pharma,
    paddingHorizontal: 20,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  navActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    flexDirection: 'row',
    marginTop: 20,
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
  },
  doctorImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#fff',
  },
  headerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -40,
    borderRadius: 24,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: { alignItems: 'center', gap: 2 },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statDivider: { width: 1, height: 30, backgroundColor: '#E2E8F0' },
  section: {
    padding: 20,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionLine: {
    width: 4,
    height: 18,
    backgroundColor: theme.colors.pharma,
    borderRadius: 2,
  },
  bioText: {
    lineHeight: 22,
  },
  highlights: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  highlightIcon: { marginRight: 8 },
  clinicCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
  },
  clinicMain: { flexDirection: 'row' },
  clinicIconBox: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clinicDetails: { flex: 1, marginLeft: 16 },
  clinicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  clinicPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  clinicAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 4,
  },
  emptyClinics: {
    alignItems: 'center',
    padding: 40,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  primaryBookBtn: {
    backgroundColor: theme.colors.pharma,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    elevation: 4,
    shadowColor: theme.colors.pharma,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
