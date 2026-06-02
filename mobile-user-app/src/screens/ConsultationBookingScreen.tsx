import React, { useState, useEffect, useMemo } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Image, TextInput,
  Dimensions, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { telemedicineApi, authApi, normalizeUrl } from '../api/api';
import { AppText, AppButton } from '../components/ui';
import { theme } from '../theme/theme';

const { width } = Dimensions.get('window');

export default function ConsultationBookingScreen({ route, navigation }: any) {
  const { doctor, clinic } = route.params;

  const [submitting, setSubmitting] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availabilityResults, setAvailabilityResults] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visitType, setVisitType] = useState<'video' | 'physical'>(clinic?.type === 'Video Room' ? 'video' : 'physical');
  
  const [patientInfo, setPatientInfo] = useState({ 
    name: '', 
    age: '', 
    gender: 'Male' 
  });

  // Generate 14 days for the picker
  const dateOptions = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [selectedDate]);

  const fetchSlots = async () => {
    try {
      setLoadingSlots(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const res = await telemedicineApi.getAvailability(doctor.id, dateStr, clinic?.id);
      
      setAvailabilityResults(res.data || []);
      setSelectedSlot(null);
    } catch (e) {
      console.warn('[ConsultationBooking] fetchSlots error:', e);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Group slots by time
  const groupedSlots = useMemo(() => {
    const morning: any[] = [];
    const afternoon: any[] = [];
    const evening: any[] = [];

    availabilityResults.forEach(res => {
      res.slots.forEach((slot: any) => {
        const hour = parseInt(slot.startTime.split(':')[0]);
        if (hour < 12) morning.push(slot);
        else if (hour < 16) afternoon.push(slot);
        else evening.push(slot);
      });
    });

    return { morning, afternoon, evening };
  }, [availabilityResults]);

  // Prefill from profile
  useEffect(() => {
    authApi.getMe().then(res => {
      const u = res.data;
      if (u) {
        setPatientInfo({
          name: u.name || '',
          age: u.age?.toString() || '',
          gender: u.gender || 'Male'
        });
      }
    }).catch(() => {});
  }, []);

  const handleBook = async () => {
    if (!selectedSlot) {
      Alert.alert('Select Time', 'Please choose an available time slot.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        doctorId: doctor.id,
        clinicId: clinic?.id,
        scheduledAt: new Date(selectedDate.toISOString().split('T')[0] + 'T' + selectedSlot.startTime + ':00'),
        timeSlot: `${selectedSlot.startTime} - ${selectedSlot.endTime}`,
        visitType: visitType,
        paymentMethod: 'wallet',
        userNotes: `Patient: ${patientInfo.name}, Age: ${patientInfo.age}, Gender: ${patientInfo.gender}`,
        patientAge: patientInfo.age,
        patientGender: patientInfo.gender,
      };

      const res = await telemedicineApi.bookConsultation(payload);
      if (res.status === 201 || res.status === 200) {
        Alert.alert(
          'Booking Confirmed!', 
          `Your appointment with Dr. ${doctor.name} is scheduled for ${selectedDate.toDateString()} at ${selectedSlot.startTime}.`,
          [{ text: 'View Appointments', onPress: () => navigation.navigate('MyConsultations') }]
        );
      }
    } catch (err: any) {
      Alert.alert('Booking Failed', err.response?.data?.message || 'Unable to process booking.');
    } finally {
      setSubmitting(false);
    }
  };

  const isSameDay = (d1: Date, d2: Date) => 
    d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={26} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitle}>
          <AppText variant="h3">Schedule Appointment</AppText>
          <AppText variant="overline" color={theme.colors.pharma}>{clinic?.name}</AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Date Selection */}
        <View style={styles.dateSection}>
          <AppText variant="title" style={styles.sectionTitle}>Select Date</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
            {dateOptions.map((date, index) => {
              const active = isSameDay(date, selectedDate);
              const day = date.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNum = date.getDate();
              return (
                <Pressable
                  key={index}
                  onPress={() => setSelectedDate(date)}
                  style={[styles.dateCard, active && styles.dateCardActive]}
                >
                  <AppText variant="overline" color={active ? '#fff' : theme.colors.textMuted}>{day}</AppText>
                  <AppText variant="h3" color={active ? '#fff' : theme.colors.textPrimary}>{dayNum}</AppText>
                  {active && <View style={styles.activeDot} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Slot Selection */}
        <View style={styles.section}>
          <AppText variant="title" style={styles.sectionTitle}>Available Slots</AppText>
          {loadingSlots ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator color={theme.colors.pharma} />
              <AppText variant="caption" style={{ marginTop: 8 }}>Fetching slots...</AppText>
            </View>
          ) : (
            <View style={styles.slotsContainer}>
              {/* Morning */}
              <SlotGroup 
                title="Morning" 
                icon="weather-sunny" 
                slots={groupedSlots.morning} 
                selected={selectedSlot} 
                onSelect={setSelectedSlot} 
              />
              {/* Afternoon */}
              <SlotGroup 
                title="Afternoon" 
                icon="weather-partly-cloudy" 
                slots={groupedSlots.afternoon} 
                selected={selectedSlot} 
                onSelect={setSelectedSlot} 
              />
              {/* Evening */}
              <SlotGroup 
                title="Evening" 
                icon="weather-night" 
                slots={groupedSlots.evening} 
                selected={selectedSlot} 
                onSelect={setSelectedSlot} 
              />
              
              {availabilityResults.length === 0 || !availabilityResults.some(r => r.slots.length > 0) ? (
                <View style={styles.noSlots}>
                  <MaterialCommunityIcons name="calendar-remove" size={40} color={theme.colors.border} />
                  <AppText variant="body" color={theme.colors.textMuted} style={{ marginTop: 8 }}>
                    Doctor is not available on this day.
                  </AppText>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Patient Details */}
        <View style={styles.section}>
          <AppText variant="title" style={styles.sectionTitle}>Patient Details</AppText>
          <View style={styles.patientForm}>
            <View style={styles.inputGroup}>
               <AppText variant="overline" color={theme.colors.textMuted} style={styles.inputLabel}>Full Name</AppText>
               <TextInput 
                 style={styles.input} 
                 value={patientInfo.name}
                 onChangeText={v => setPatientInfo({...patientInfo, name: v})}
                 placeholder="Ahmed Ali"
               />
            </View>
            <View style={styles.row}>
               <View style={[styles.inputGroup, { flex: 1 }]}>
                 <AppText variant="overline" color={theme.colors.textMuted} style={styles.inputLabel}>Age</AppText>
                 <TextInput 
                   style={styles.input} 
                   value={patientInfo.age}
                   onChangeText={v => setPatientInfo({...patientInfo, age: v})}
                   keyboardType="numeric"
                   placeholder="25"
                 />
               </View>
               <View style={[styles.inputGroup, { flex: 1 }]}>
                 <AppText variant="overline" color={theme.colors.textMuted} style={styles.inputLabel}>Gender</AppText>
                 <View style={styles.genderBox}>
                    {['Male', 'Female'].map(g => (
                      <Pressable 
                        key={g} 
                        onPress={() => setPatientInfo({...patientInfo, gender: g})}
                        style={[styles.genderPill, patientInfo.gender === g && styles.genderPillActive]}
                      >
                        <AppText variant="captionStrong" color={patientInfo.gender === g ? '#fff' : theme.colors.textSecondary}>{g}</AppText>
                      </Pressable>
                    ))}
                 </View>
               </View>
            </View>
          </View>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <View style={styles.summaryIcon}>
              <Ionicons name="cash-outline" size={20} color={theme.colors.success} />
            </View>
            <View>
              <AppText variant="caption" color={theme.colors.textMuted}>Consultation Fee</AppText>
              <AppText variant="bodyStrong">Rs. {doctor.consultationFee}</AppText>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <View style={styles.summaryIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.pharma} />
            </View>
            <View>
              <AppText variant="caption" color={theme.colors.textMuted}>Platform Fee</AppText>
              <AppText variant="bodyStrong" color={theme.colors.success}>FREE</AppText>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label={submitting ? "Processing..." : `Book Appointment`}
          variant="primary"
          tint={theme.colors.pharma}
          size="lg"
          fullWidth
          disabled={submitting || !selectedSlot}
          onPress={handleBook}
        />
      </View>
    </SafeAreaView>
  );
}

function SlotGroup({ title, icon, slots, selected, onSelect }: any) {
  if (slots.length === 0) return null;
  return (
    <View style={styles.slotGroup}>
      <View style={styles.groupHeader}>
        <MaterialCommunityIcons name={icon} size={18} color={theme.colors.textMuted} />
        <AppText variant="captionStrong" color={theme.colors.textSecondary} style={{ marginLeft: 6 }}>{title}</AppText>
      </View>
      <View style={styles.slotGrid}>
        {slots.map((slot: any) => (
          <Pressable
            key={`${slot.startTime}`}
            onPress={() => onSelect(slot)}
            style={[styles.slotPill, selected?.startTime === slot.startTime && styles.slotPillActive]}
          >
            <AppText 
              variant="captionStrong" 
              color={selected?.startTime === slot.startTime ? '#fff' : theme.colors.textPrimary}
            >
              {slot.startTime}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: { padding: 4 },
  headerTitle: { marginLeft: 12 },
  content: { paddingBottom: 120 },
  section: { padding: 20 },
  sectionTitle: { marginBottom: 16 },
  dateSection: { paddingVertical: 20, backgroundColor: '#fff' },
  dateScroll: { paddingHorizontal: 20, gap: 12 },
  dateCard: {
    width: 60,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateCardActive: {
    backgroundColor: theme.colors.pharma,
    borderColor: theme.colors.pharma,
    elevation: 4,
    shadowColor: theme.colors.pharma,
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
    marginTop: 4,
  },
  loaderBox: { padding: 40, alignItems: 'center' },
  slotsContainer: { gap: 20 },
  slotGroup: { gap: 12 },
  groupHeader: { flexDirection: 'row', alignItems: 'center' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    minWidth: (width - 80) / 3,
    alignItems: 'center',
  },
  slotPillActive: {
    backgroundColor: theme.colors.pharma,
    borderColor: theme.colors.pharma,
  },
  noSlots: { alignItems: 'center', padding: 40 },
  patientForm: { gap: 16 },
  inputGroup: { gap: 6 },
  inputLabel: { marginLeft: 4 },
  input: {
    height: 52,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    fontSize: 15,
  },
  row: { flexDirection: 'row', gap: 12 },
  genderBox: {
    flexDirection: 'row',
    height: 52,
    gap: 8,
  },
  genderPill: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  genderPillActive: {
    backgroundColor: theme.colors.pharma,
    borderColor: theme.colors.pharma,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-around',
  },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryDivider: { width: 1, height: 40, backgroundColor: '#F1F5F9' },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
});
