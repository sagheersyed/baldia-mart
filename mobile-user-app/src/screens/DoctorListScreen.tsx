import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, FlatList, Pressable, ActivityIndicator, Image, 
  TextInput, Dimensions, RefreshControl, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { telemedicineApi, normalizeUrl } from '../api/api';
import AppText from '../components/ui/AppText';
import { theme } from '../theme/theme';

const { width } = Dimensions.get('window');

const SPECIALTIES = [
  { id: 'all', label: 'All Specialists', icon: 'stethoscope' },
  { id: 'General Physician', label: 'General Physician', icon: 'medical-bag' },
  { id: 'Pediatrician', label: 'Pediatrician', icon: 'baby-face-outline' },
  { id: 'Dermatologist', label: 'Dermatologist', icon: 'face-man-profile' },
  { id: 'Gynecologist', label: 'Gynecologist', icon: 'human-female' },
  { id: 'Cardiologist', label: 'Cardiologist', icon: 'heart-pulse' },
];

export default function DoctorListScreen({ navigation }: any) {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDoctors();
  }, [selectedSpecialty]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const res = await telemedicineApi.getDoctors(selectedSpecialty === 'all' ? undefined : selectedSpecialty);
      setDoctors(res.data || []);
    } catch (e) {
      console.warn('[DoctorList] fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDoctors();
    setRefreshing(false);
  };

  const filteredDoctors = doctors.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.specialization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderDoctorItem = ({ item }: { item: any }) => (
    <Pressable
      style={styles.doctorCard}
      onPress={() => navigation.navigate('DoctorDetail', { doctor: item })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.imageWrapper}>
          <Image 
            source={{ uri: normalizeUrl(item.imageUrl) || 'https://via.placeholder.com/150' }} 
            style={styles.doctorImage} 
          />
        </View>

        <View style={styles.doctorDetails}>
          <View style={styles.nameRow}>
            <AppText variant="h3" style={{ fontSize: 18 }}>Dr. {item.name}</AppText>
            <MaterialCommunityIcons name="check-decagram" size={18} color={theme.colors.pharma} />
          </View>
          <AppText variant="captionStrong" color={theme.colors.pharma}>{item.specialization}</AppText>
          <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={2}>
            {item.degree || 'MD (Neurology), MBBS, Diploma in Clinical Neurology'}
          </AppText>
        </View>
      </View>

      {/* Oladoc Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
           <AppText variant="caption" color={theme.colors.textMuted}>Experience</AppText>
           <AppText variant="bodyStrong">{item.experienceYears || '13'} Yrs</AppText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
           <AppText variant="caption" color={theme.colors.textMuted}>Ratings</AppText>
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
             <AppText variant="bodyStrong">{item.rating || '4.7'}</AppText>
             <AppText variant="caption" color={theme.colors.textMuted}>({Math.floor(Math.random() * 500) + 100})</AppText>
           </View>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
           <AppText variant="caption" color={theme.colors.textMuted}>Wait Time</AppText>
           <AppText variant="bodyStrong">{Math.floor(Math.random() * 60) + 15} mins</AppText>
        </View>
      </View>

      {/* Online Consultation Card */}
      <View style={styles.consultCard}>
         <View style={{ flex: 1 }}>
            <View style={styles.consultType}>
               <Ionicons name="videocam-outline" size={18} color={theme.colors.textPrimary} />
               <AppText variant="bodyStrong" style={{ marginLeft: 8 }}>Online Consultation</AppText>
            </View>
            <AppText variant="caption" color={theme.colors.success} style={{ marginTop: 4 }}>
               • Available Today
            </AppText>
         </View>
         <AppText variant="bodyStrong">Rs. {item.consultationFee}</AppText>
      </View>

      <Pressable 
        style={styles.bookBtn}
        onPress={() => navigation.navigate('DoctorDetail', { doctor: item })}
      >
        <AppText variant="bodyStrong" color="#fff">Book Consultation</AppText>
      </Pressable>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Oladoc Style Search Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </Pressable>
          <AppText variant="h2" style={{ marginLeft: 16, flex: 1 }}>Search</AppText>
          <View style={styles.locationBadge}>
             <Ionicons name="location-outline" size={16} color={theme.colors.textPrimary} />
             <AppText variant="captionStrong" style={{ marginLeft: 4 }}>Lahore</AppText>
          </View>
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={theme.colors.textMuted} />
          <TextInput 
            placeholder="Find Doctors, Specialties, Disease and Hos"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Horizontal Specialization Filter */}
      <View style={styles.filterSection}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SPECIALTIES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.specialtyChip,
                selectedSpecialty === item.id && styles.specialtyChipActive,
              ]}
              onPress={() => setSelectedSpecialty(item.id)}
            >
              <AppText
                variant="captionStrong"
                color={selectedSpecialty === item.id ? '#fff' : theme.colors.textSecondary}
              >
                {item.label}
              </AppText>
            </Pressable>
          )}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.pharma} />
        </View>
      ) : (
        <FlatList
          data={filteredDoctors}
          keyExtractor={(item) => item.id}
          renderItem={renderDoctorItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.pharma} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  locationBadge: { flexDirection: 'row', alignItems: 'center' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    height: 54,
    borderRadius: 27,
    paddingHorizontal: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
  },
  searchInput: { flex: 1, fontSize: 15 },
  filterSection: { paddingVertical: 16, backgroundColor: '#fff' },
  specialtyChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  specialtyChipActive: {
    backgroundColor: theme.colors.pharma,
    borderColor: theme.colors.pharma,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 16 },
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
  },
  cardHeader: { flexDirection: 'row', marginBottom: 16 },
  imageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  doctorImage: { width: '100%', height: '100%' },
  doctorDetails: { flex: 1, marginLeft: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F8FAFC',
    marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: '60%', backgroundColor: '#F1F5F9', alignSelf: 'center' },
  consultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
  },
  consultType: { flexDirection: 'row', alignItems: 'center' },
  bookBtn: {
    backgroundColor: '#1E40AF',
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
