import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, Switch,
  Pressable, ActivityIndicator, Alert, TextInput, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCmsStore } from '../../store/cmsStore';
import { cmsApi } from '../../api/api';
import { AppText } from '../../components/ui';
import { theme } from '../../theme/theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function StoreProfileScreen({ navigation }: any) {
  const { activeTenant } = useCmsStore();
  const tenantId = activeTenant?.tenantId ?? '';
  const vertical = activeTenant?.type ?? 'mart';

  const color = vertical === 'restaurant'
    ? theme.colors.food
    : vertical === 'pharmacy'
    ? theme.colors.pharma
    : theme.colors.primary;

  const [statusLoading, setStatusLoading] = useState(false);
  const [status, setStatus] = useState(activeTenant?.status || 'active');
  const isClosed = status === 'inactive';

  // Business hours state
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('23:00');
  const [offDays, setOffDays] = useState<string[]>([]);
  const [fridayOpen, setFridayOpen] = useState('');
  const [fridayClose, setFridayClose] = useState('');
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Location state
  const [locationLabel, setLocationLabel] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);

  // Profile data fetching state
  const [profileLoading, setProfileLoading] = useState(true);

  // Change request history state
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [crsLoading, setCrsLoading] = useState(false);

  // Load live store profile from backend
  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const res = await cmsApi.getStoreProfile(tenantId);
      const data = res.data;
      if (data) {
        if (data.openingTime) setOpeningTime(data.openingTime);
        if (data.closingTime) setClosingTime(data.closingTime);
        if (data.offDays) {
          setOffDays(data.offDays.split(',').map((d: string) => d.trim()).filter(Boolean));
        }
        if (data.fridayOpeningTime) setFridayOpen(data.fridayOpeningTime);
        if (data.fridayClosingTime) setFridayClose(data.fridayClosingTime);
        if (data.location) setLocationLabel(data.location);
        if (data.address) setAddress(data.address);
        if (data.latitude) setLatitude(Number(data.latitude));
        if (data.longitude) setLongitude(Number(data.longitude));
        if (data.status) setStatus(data.status);
      }
    } catch (e) {
      console.warn('Failed to load store profile details:', e);
    } finally {
      setProfileLoading(false);
    }
  };

  // Load change requests from backend
  const fetchChangeRequests = async () => {
    setCrsLoading(true);
    try {
      const res = await cmsApi.getChangeRequests(tenantId, { limit: 5 });
      setChangeRequests(res.data?.data || res.data || []);
    } catch (e) {
      console.warn('Failed to load change requests:', e);
    } finally {
      setCrsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (tenantId) {
      fetchProfile();
      fetchChangeRequests();
    }
  }, [tenantId]);

  const toggleStatus = async () => {
    const nextStatus = isClosed ? 'active' : 'inactive';
    setStatusLoading(true);
    try {
      const res = await cmsApi.updateStoreProfile(tenantId, { status: nextStatus });
      setStatus(res.data.status);
      await useCmsStore.getState().loadMemberships();
      Alert.alert('Success', `Store is now ${res.data.status === 'active' ? 'OPEN' : 'CLOSED'}`);
    } catch (e) {
      Alert.alert('Error', 'Failed to update store status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    setOffDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // Detect live GPS location using expo-location
  const getGpsLocation = async () => {
    setFetchingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'GPS permission is required to detect store location.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      Alert.alert('Success', `Coordinates detected:\nLat: ${loc.coords.latitude.toFixed(6)}\nLng: ${loc.coords.longitude.toFixed(6)}`);
    } catch (e) {
      Alert.alert('Error', 'Failed to get GPS location. Make sure location services are turned on.');
    } finally {
      setFetchingGps(false);
    }
  };

  const submitSchedule = async () => {
    if (!openingTime || !closingTime) {
      Alert.alert('Validation', 'Please enter both opening and closing times (HH:MM format).');
      return;
    }
    setScheduleLoading(true);
    try {
      await (cmsApi as any).updateStoreSchedule(tenantId, vertical, {
        openingTime,
        closingTime,
        offDays: offDays.join(','),
        fridayOpeningTime: fridayOpen || undefined,
        fridayClosingTime: fridayClose || undefined,
      });
      Alert.alert(
        'Request Submitted ✓',
        'Your schedule update has been sent to admin for approval. Changes will apply once approved.'
      );
      fetchChangeRequests();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Failed to submit schedule update.';
      Alert.alert('Error', msg);
    } finally {
      setScheduleLoading(false);
    }
  };

  const submitLocation = async () => {
    if (!locationLabel.trim() && !address.trim() && !latitude && !longitude) {
      Alert.alert('Validation', 'Please provide at least a location, address, or GPS coordinates.');
      return;
    }
    setLocationLoading(true);
    try {
      await (cmsApi as any).updateStoreSchedule(tenantId, vertical, {
        location: locationLabel.trim() || undefined,
        address: address.trim() || undefined,
        lat: latitude || undefined,
        lng: longitude || undefined,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
      });
      Alert.alert(
        'Request Submitted ✓',
        'Your location update has been sent to admin for approval. Changes will apply once approved.'
      );
      fetchChangeRequests();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Failed to submit location update.';
      Alert.alert('Error', msg);
    } finally {
      setLocationLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={color} />
        <AppText variant="body" style={{ marginTop: 10 }}>Loading profile details...</AppText>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textHeader} />
        </Pressable>
        <AppText variant="h2">Store Settings</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Store Profile */}
        <View style={styles.section}>
          <AppText variant="overline">Store Profile</AppText>
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <View style={styles.logoContainer}>
                {activeTenant?.logoUrl ? (
                  <Image source={{ uri: activeTenant.logoUrl }} style={styles.logo} />
                ) : (
                  <Ionicons name="storefront-outline" size={32} color={theme.colors.textMuted} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{activeTenant?.name}</AppText>
                <AppText variant="caption" color={theme.colors.textSecondary}>{vertical.toUpperCase()} • {activeTenant?.role}</AppText>
              </View>
            </View>
          </View>
        </View>

        {/* Operational Status */}
        <View style={styles.section}>
          <AppText variant="overline">Operational Status</AppText>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">Accept Orders</AppText>
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  Toggle off to temporarily pause orders
                </AppText>
              </View>
              {statusLoading ? (
                <ActivityIndicator size="small" color={color} />
              ) : (
                <Switch
                  value={!isClosed}
                  onValueChange={toggleStatus}
                  trackColor={{ false: '#CBD5E1', true: color + '80' }}
                  thumbColor={!isClosed ? color : '#F1F5F9'}
                />
              )}
            </View>
          </View>
        </View>

        {/* Business Hours */}
        <View style={styles.section}>
          <AppText variant="overline">Business Hours</AppText>
          <View style={styles.card}>
            <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginBottom: 12 }}>
              Changes require admin approval before taking effect.
            </AppText>

            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={theme.colors.textMuted}>Opening Time (HH:MM)</AppText>
                <TextInput
                  style={styles.timeInput}
                  value={openingTime}
                  onChangeText={setOpeningTime}
                  placeholder="09:00"
                  placeholderTextColor="#CBD5E1"
                  maxLength={5}
                />
              </View>
              <View style={{ width: 16 }} />
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={theme.colors.textMuted}>Closing Time (HH:MM)</AppText>
                <TextInput
                  style={styles.timeInput}
                  value={closingTime}
                  onChangeText={setClosingTime}
                  placeholder="23:00"
                  placeholderTextColor="#CBD5E1"
                  maxLength={5}
                />
              </View>
            </View>

            {/* Friday Half-Day */}
            <AppText variant="caption" color={theme.colors.textMuted} style={{ marginTop: 16, marginBottom: 8 }}>
              Friday Half-Day (leave blank to use standard hours)
            </AppText>
            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={theme.colors.textMuted}>Friday Open</AppText>
                <TextInput
                  style={styles.timeInput}
                  value={fridayOpen}
                  onChangeText={setFridayOpen}
                  placeholder="09:00"
                  placeholderTextColor="#CBD5E1"
                  maxLength={5}
                />
              </View>
              <View style={{ width: 16 }} />
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={theme.colors.textMuted}>Friday Close</AppText>
                <TextInput
                  style={styles.timeInput}
                  value={fridayClose}
                  onChangeText={setFridayClose}
                  placeholder="13:00"
                  placeholderTextColor="#CBD5E1"
                  maxLength={5}
                />
              </View>
            </View>

            {/* Weekly Off Days */}
            <AppText variant="caption" color={theme.colors.textMuted} style={{ marginTop: 16, marginBottom: 8 }}>
              Weekly Off Days
            </AppText>
            <View style={styles.daysRow}>
              {DAYS.map(day => {
                const isOff = offDays.includes(day);
                return (
                  <Pressable
                    key={day}
                    style={[styles.dayChip, isOff && { backgroundColor: color, borderColor: color }]}
                    onPress={() => toggleDay(day)}
                  >
                    <AppText
                      variant="badge"
                      color={isOff ? '#fff' : theme.colors.textSecondary}
                    >
                      {day}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[styles.submitBtn, { backgroundColor: color }, scheduleLoading && styles.disabled]}
              onPress={submitSchedule}
              disabled={scheduleLoading}
            >
              {scheduleLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <AppText variant="bodyStrong" color="#fff">Submit Schedule Request</AppText>
              }
            </Pressable>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <AppText variant="overline">Location Update</AppText>
          <View style={styles.card}>
            <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginBottom: 12 }}>
              All location changes are reviewed by admin before being published.
            </AppText>
            <View style={styles.inputGroup}>
              <AppText variant="caption" color={theme.colors.textMuted}>Location Name</AppText>
              <TextInput
                style={styles.textInput}
                value={locationLabel}
                onChangeText={setLocationLabel}
                placeholder="e.g. Baldia Town Main Market"
                placeholderTextColor="#CBD5E1"
              />
            </View>
            <View style={[styles.inputGroup, { marginTop: 12 }]}>
              <AppText variant="caption" color={theme.colors.textMuted}>Full Address</AppText>
              <TextInput
                style={[styles.textInput, { height: 64, textAlignVertical: 'top' }]}
                value={address}
                onChangeText={setAddress}
                placeholder="Shop #, Street, Area, City"
                placeholderTextColor="#CBD5E1"
                multiline
              />
            </View>

            {/* GPS Coordinates Detection */}
            <View style={{ marginTop: 12 }}>
              <AppText variant="caption" color={theme.colors.textMuted}>GPS Coordinates (Latitude / Longitude)</AppText>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10 }}>
                  <AppText variant="caption" color={theme.colors.textMuted} style={{ fontSize: 9 }}>Latitude</AppText>
                  <AppText variant="body" style={{ fontWeight: 'bold', fontSize: 13 }}>{latitude !== null ? latitude.toFixed(6) : 'Not set'}</AppText>
                </View>
                <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10 }}>
                  <AppText variant="caption" color={theme.colors.textMuted} style={{ fontSize: 9 }}>Longitude</AppText>
                  <AppText variant="body" style={{ fontWeight: 'bold', fontSize: 13 }}>{longitude !== null ? longitude.toFixed(6) : 'Not set'}</AppText>
                </View>
              </View>
              <Pressable
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#0F172A',
                  paddingVertical: 10,
                  borderRadius: 10,
                  marginTop: 8,
                  gap: 6
                }}
                onPress={getGpsLocation}
                disabled={fetchingGps}
              >
                {fetchingGps ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="location-outline" size={16} color="#fff" />
                    <AppText variant="caption" color="#fff" style={{ fontWeight: 'bold' }}>Detect Live GPS Location</AppText>
                  </>
                )}
              </Pressable>
            </View>

            <Pressable
              style={[styles.submitBtn, { backgroundColor: '#4F46E5' }, locationLoading && styles.disabled]}
              onPress={submitLocation}
              disabled={locationLoading}
            >
              {locationLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <AppText variant="bodyStrong" color="#fff">Submit Location Request</AppText>
              }
            </Pressable>
          </View>
        </View>

        {/* Change Request Status Tracker */}
        <View style={styles.section}>
          <AppText variant="overline">Change Request Approvals</AppText>
          <View style={styles.card}>
            {crsLoading ? (
              <ActivityIndicator color={color} size="small" />
            ) : changeRequests.length === 0 ? (
              <AppText variant="caption" color={theme.colors.textMuted} style={{ fontStyle: 'italic' }}>
                No change request submissions found.
              </AppText>
            ) : (
              <View style={{ gap: 12 }}>
                {changeRequests.map((cr: any) => {
                  let statusColor = '#64748B'; 
                  if (cr.status === 'approved' || cr.status === 'published' || cr.status === 'auto_approved') statusColor = '#10B981';
                  if (cr.status === 'rejected') statusColor = '#EF4444';
                  if (cr.status === 'submitted' || cr.status === 'under_review') statusColor = '#3B82F6';

                  return (
                    <View key={cr.id} style={{ borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <AppText variant="caption" color={theme.colors.textSecondary} style={{ fontWeight: 'bold', flex: 1 }}>
                          Update {cr.entityType} ({cr.actionType})
                        </AppText>
                        <View style={{ backgroundColor: statusColor + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                          <AppText variant="caption" color={statusColor} style={{ fontWeight: 'bold', fontSize: 10 }}>
                            {cr.status.toUpperCase()}
                          </AppText>
                        </View>
                      </View>
                      <AppText variant="caption" color={theme.colors.textMuted} style={{ marginTop: 2, fontSize: 10 }}>
                        Submitted: {new Date(cr.createdAt).toLocaleString()}
                      </AppText>
                      {cr.rejectionReason ? (
                        <AppText variant="caption" color="#EF4444" style={{ marginTop: 4, fontStyle: 'italic' }}>
                          Info: {cr.rejectionReason}
                        </AppText>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Withdrawal */}
        <View style={styles.section}>
          <AppText variant="overline">Financials</AppText>
          <Pressable
            style={[styles.card, styles.row]}
            onPress={() => navigation.navigate('Withdrawal')}
          >
            <View style={[styles.iconBadge, { backgroundColor: color + '15' }]}>
              <Ionicons name="cash-outline" size={22} color={color} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="bodyStrong">Request Withdrawal</AppText>
              <AppText variant="caption" color={theme.colors.textSecondary}>
                Withdraw your available balance to your bank account
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        <AppText variant="caption" color={theme.colors.textMuted} style={{ textAlign: 'center', marginTop: 8 }}>
          Version 1.4 • Merchant Portal
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: '#fff', gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { padding: 4 },
  scroll: { padding: 16, gap: 20, paddingBottom: 40 },
  section: { gap: 8 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoContainer: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  logo: { width: '100%', height: '100%' },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end' },
  timeInput: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 4,
    backgroundColor: '#F8FAFC',
  },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  submitBtn: {
    alignItems: 'center', paddingVertical: 12, borderRadius: 12, marginTop: 16,
  },
  disabled: { opacity: 0.6 },
  inputGroup: { gap: 4 },
  textInput: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC',
  },
  iconBadge: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
});
