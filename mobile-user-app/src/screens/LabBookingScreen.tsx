import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { labApi, addressesApi, authApi } from '../api/api';
import { AppText, AppButton } from '../components/ui';
import { theme } from '../theme/theme';



export default function LabBookingScreen({ route, navigation }: any) {
  const { tests = [] } = route.params;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [address, setAddress] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [patientInfo, setPatientInfo] = useState({ 
    name: '', 
    age: '', 
    gender: 'Male' 
  });

  useEffect(() => {
    fetchSlots();
  }, [selectedDate]);

  const fetchSlots = async () => {
    try {
      setLoadingSlots(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const res = await labApi.getAvailability(dateStr);
      setAvailableSlots(res.data || []);
      if (res.data?.length > 0) {
        setSelectedSlotId(res.data[0].id);
      } else {
        setSelectedSlotId('');
      }
    } catch (e) {
      console.warn('[LabBooking] fetchSlots error:', e);
    } finally {
      setLoadingSlots(false);
    }
  };

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

  useEffect(() => {
    fetchAddress();
  }, []);

  const fetchAddress = async () => {
    try {
      setLoading(true);
      const res = await addressesApi.getAll();
      const def = res.data?.find((a: any) => a.isDefault) || res.data?.[0];
      setAddress(def);
    } catch (e) {
      console.warn('[LabBooking] addr fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const total = tests.reduce((sum: number, t: any) => sum + Number(t.price), 0);

  const handleConfirm = async () => {
    if (!address) {
      Alert.alert('Address Required', 'Please add a collection address first.');
      return;
    }

    if (!selectedSlotId) {
      Alert.alert('No Slots', 'Please select a time slot.');
      return;
    }

    const slot = availableSlots.find(s => s.id === selectedSlotId);

    try {
      setSubmitting(true);
      const payload = {
        testIds: tests.map((t: any) => t.id),
        scheduledDate: selectedDate,
        timeSlot: `${slot.startTime} - ${slot.endTime}`,
        availabilityId: selectedSlotId,
        addressId: address.id,
        paymentMethod: 'cod',
        notes: `Patient: ${patientInfo.name}, Age: ${patientInfo.age}, Gender: ${patientInfo.gender}`,
        patientAge: patientInfo.age,
        patientGender: patientInfo.gender,
      };

      const res = await labApi.createBooking(payload);
      if (res.status === 201 || res.status === 200) {
        Alert.alert('Success!', 'Your lab test booking has been confirmed. A collector will visit you on the scheduled time.', [
          { text: 'View Bookings', onPress: () => navigation.navigate('MyLabBookings') },
          { text: 'Home', onPress: () => navigation.navigate('Home') }
        ]);
      }
    } catch (err: any) {
      Alert.alert('Booking Failed', err.response?.data?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.pharma} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <AppText variant="h2">Review Booking</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Selected Tests */}
        <View style={styles.section}>
          <AppText variant="title">Selected Tests</AppText>
          {tests.map((test: any) => (
            <View key={test.id} style={styles.testItem}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{test.name}</AppText>
                <AppText variant="caption" color={theme.colors.textSecondary}>{test.sampleType} Sample</AppText>
              </View>
              <AppText variant="bodyStrong">Rs. {test.price}</AppText>
            </View>
          ))}
        </View>

        {/* Patient Information */}
        <View style={styles.section}>
          <AppText variant="title" style={{ marginBottom: 12 }}>Patient Information</AppText>
          <View style={{ gap: 12 }}>
            <View>
              <AppText variant="caption" style={{ marginBottom: 4 }}>Patient Name</AppText>
              <TextInput
                style={styles.input}
                value={patientInfo.name}
                onChangeText={(v) => setPatientInfo({ ...patientInfo, name: v })}
                placeholder="Enter patient name"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" style={{ marginBottom: 4 }}>Age</AppText>
                <TextInput
                  style={styles.input}
                  value={patientInfo.age}
                  onChangeText={(v) => setPatientInfo({ ...patientInfo, age: v.replace(/[^0-9]/g, '') })}
                  placeholder="Age"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" style={{ marginBottom: 4 }}>Gender</AppText>
                <View style={styles.genderRow}>
                  {['Male', 'Female'].map(g => (
                    <Pressable
                      key={g}
                      onPress={() => setPatientInfo({ ...patientInfo, gender: g })}
                      style={[
                        styles.genderPill,
                        patientInfo.gender === g && { backgroundColor: theme.colors.pharma, borderColor: theme.colors.pharma }
                      ]}
                    >
                      <AppText variant="captionStrong" color={patientInfo.gender === g ? '#fff' : theme.colors.textSecondary}>
                        {g}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Collection Address */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <AppText variant="title">Collection Address</AppText>
            <Pressable onPress={() => navigation.navigate('SavedAddresses')}>
              <AppText variant="body" color={theme.colors.pharma}>Change</AppText>
            </Pressable>
          </View>
          {address ? (
            <View style={styles.addressBox}>
              <Ionicons name="location-outline" size={20} color={theme.colors.pharma} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText variant="bodyStrong">{address.addressType || 'Home'}</AppText>
                <AppText variant="caption" color={theme.colors.textSecondary}>{address.completeAddress}</AppText>
              </View>
            </View>
          ) : (
            <AppButton label="Add Address" variant="outline" size="sm" onPress={() => navigation.navigate('SavedAddresses')} />
          )}
        </View>

        {/* Time Slot Selection */}
        <View style={styles.section}>
          <AppText variant="title" style={{ marginBottom: 12 }}>Preferred Time Slot</AppText>
          {loadingSlots ? (
            <ActivityIndicator color={theme.colors.pharma} />
          ) : (
            <View style={styles.slotsGrid}>
              {availableSlots.length > 0 ? (
                availableSlots.map((slot) => (
                  <Pressable
                    key={slot.id}
                    style={[
                      styles.slotBtn,
                      selectedSlotId === slot.id && styles.slotBtnActive
                    ]}
                    onPress={() => setSelectedSlotId(slot.id)}
                  >
                    <AppText
                      variant="captionStrong"
                      color={selectedSlotId === slot.id ? '#fff' : theme.colors.textSecondary}
                      style={{ textAlign: 'center' }}
                    >
                      {slot.startTime} - {slot.endTime}
                    </AppText>
                  </Pressable>
                ))
              ) : (
                <AppText variant="caption" color={theme.colors.danger}>No slots available for this date.</AppText>
              )}
            </View>
          )}
        </View>

        {/* Payment Summary */}
        <View style={styles.section}>
          <AppText variant="title" style={{ marginBottom: 12 }}>Order Summary</AppText>
          <View style={styles.row}>
            <AppText variant="body" color={theme.colors.textSecondary}>Test Total</AppText>
            <AppText variant="bodyStrong">Rs. {total}</AppText>
          </View>
          <View style={styles.row}>
            <AppText variant="body" color={theme.colors.textSecondary}>Collection Fee</AppText>
            <AppText variant="bodyStrong" color={theme.colors.success}>FREE</AppText>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <AppText variant="h3">Total Payable</AppText>
            <AppText variant="h2" color={theme.colors.pharma}>Rs. {total}</AppText>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label={submitting ? "Processing..." : "Confirm Booking"}
          variant="primary"
          tint={theme.colors.pharma}
          size="lg"
          fullWidth
          disabled={submitting || !address}
          onPress={handleConfirm}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    backgroundColor: theme.colors.surface,
  },
  backBtn: { padding: 4 },
  content: { padding: 16, paddingBottom: 100 },
  section: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radius.lg,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  testItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotBtn: {
    width: '48%',
    padding: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  slotBtnActive: {
    backgroundColor: theme.colors.pharma,
    borderColor: theme.colors.pharma,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 12 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  input: {
    height: 48,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    height: 48,
    alignItems: 'center',
  },
  genderPill: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
});
