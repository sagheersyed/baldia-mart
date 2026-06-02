import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Image, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { rashanApi, addressesApi, deliveryZonesApi } from '../api/api';
import { ENV } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AddressPickerModal from '../components/AddressPickerModal';
import { useSettings } from '../context/SettingsContext';
import { theme } from '../theme/theme';
import { AppText, AppButton, AppIconButton } from '../components/ui';

type RootStackParamList = {
  Home: undefined;
  MyOrders: undefined;
};
type NavProp = StackNavigationProp<RootStackParamList>;

export default function RashanOrderScreen() {
  const navigation = useNavigation<NavProp>();
  const { settings } = useSettings();

  const [bulkListText, setBulkListText] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [mobileNumber, setMobileNumber] = useState('');
  
  // Address State
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);

  // Modals state
  const [showAddressListModal, setShowAddressListModal] = useState(false);
  const [showAddressPickerModal, setShowAddressPickerModal] = useState(false);
  const [editingAddressData, setEditingAddressData] = useState<any>(null);
  
  const [floor, setFloor] = useState(0);
  const [placement, setPlacement] = useState<'gate' | 'doorstep' | 'inside'>('gate');
  const [weightTier, setWeightTier] = useState<'light' | 'medium' | 'heavy'>('light');
  const [notes, setNotes] = useState('');

  const [previewFee, setPreviewFee] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculable, setIsCalculable] = useState(false);
  const [landmark, setLandmark] = useState('');
  const [isWithinZone, setIsWithinZone] = useState(true);
  const [zoneDistance, setZoneDistance] = useState<number | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      fetchAddresses();
    }, [])
  );

  const fetchAddresses = async () => {
    setIsLoadingAddresses(true);
    try {
      const res = await addressesApi.getAll();
      const addrList = res.data || [];
      setAddresses(addrList);
      if (addrList.length > 0) {
        const found = addrList.find((a: any) => a.id === selectedAddress?.id) || addrList.find((a: any) => a.isDefault) || addrList[0];
        setSelectedAddress(found);
      }
    } catch (err) {
      console.log('Failed to fetch addresses', err);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleUpdateAddress = async (addrData: any) => {
    try {
      if (editingAddressData?.id) {
        await addressesApi.update(editingAddressData.id, addrData);
      } else {
        await addressesApi.create({ ...addrData, isDefault: addresses.length === 0 });
      }
      await fetchAddresses();
      setShowAddressPickerModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save address');
    }
  };

  const handleOpenEdit = (addr?: any) => {
    setEditingAddressData(addr || null);
    setShowAddressListModal(false);
    setTimeout(() => {
      setShowAddressPickerModal(true);
    }, 300);
  };

  const handleSelectAddress = (addr: any) => {
    setSelectedAddress(addr);
    setShowAddressListModal(false);
    if (!mobileNumber) setMobileNumber(addr.phoneNumber || '');
  };

  useEffect(() => {
    // Attempt to calculate preview fee whenever logistics change
    calculatePreview();
  }, [weightTier, floor, placement]);

  useEffect(() => {
    if (selectedAddress) {
      checkZone(selectedAddress.latitude, selectedAddress.longitude);
    }
  }, [selectedAddress]);

  const GPS_DRIFT_BUFFER_KM = 0.5;

  const checkZone = async (lat: number, lng: number) => {
    try {
      const res = await deliveryZonesApi.getActive();
      const zones = res.data;

      // Safety: if admin hasn't set up any zones yet, allow the order
      if (!zones || zones.length === 0) {
        setIsWithinZone(true);
        setZoneDistance(null);
        return;
      }

      let minDistance = Infinity;
      let matched = false;

      for (const zone of zones) {
        const d = calculateDistance(lat, lng, Number(zone.centerLat), Number(zone.centerLng));
        // Apply GPS drift buffer on client-side to match backend tolerance
        const effectiveRadius = Number(zone.radiusKm) + GPS_DRIFT_BUFFER_KM;
        if (d <= effectiveRadius) {
          matched = true;
        }
        minDistance = Math.min(minDistance, d);
      }

      setIsWithinZone(matched);
      setZoneDistance(minDistance);
    } catch (err) {
      // On network error, default to allowing order (fail open)
      console.log('Zone check failed — defaulting to allow', err);
      setIsWithinZone(true);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  /**
   * Calculate a local estimate of the logistics fee based on selections.
   * Falls back to a simple formula if the backend endpoint is unavailable.
   */
  const calculatePreview = async () => {
    // Use live settings from admin if available, else safe defaults
    const baseFee = settings?.rashan_base_fee ?? 750;
    const surchargeM = settings?.rashan_surcharge_medium ?? 200;
    const surchargeH = settings?.rashan_surcharge_heavy ?? 450;
    const floorLow = settings?.rashan_floor_surcharge_low ?? 150;
    const floorHigh = settings?.rashan_floor_surcharge_high ?? 300;
    const placeFee = settings?.rashan_placement_fee ?? 150;

    // Local estimate using live settings values
    let localEstimate = baseFee;
    if (weightTier === 'medium') localEstimate += surchargeM;
    if (weightTier === 'heavy') localEstimate += surchargeH;
    if (floor >= 1 && floor <= 2) localEstimate += floorLow;
    if (floor >= 3) localEstimate += floorHigh;
    if (placement === 'inside') localEstimate += placeFee;

    try {
      const res = await rashanApi.previewFee({ weightTier, floor, placement });
      const fee = res.data?.serviceFee ?? res.data?.fee ?? null;
      setPreviewFee(fee != null ? Number(fee) : localEstimate);
    } catch {
      setPreviewFee(localEstimate);
    }
  };

  const pickImages = async () => {
    if (photoUris.length >= 5) {
      Alert.alert('Limit reached', 'You can upload up to 5 photos.');
      return;
    }
    const remaining = 5 - photoUris.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUris(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 5));
    }
  };

  const removePhoto = (uri: string) => {
    setPhotoUris(prev => prev.filter(u => u !== uri));
  };

  const uploadPhoto = async (uri: string): Promise<string | null> => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: `rashan_${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as any);

      const res = await axios.post(`${ENV.BASE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });
      return res.data.url;
    } catch (err) {
      console.error('Image upload failed', err);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!bulkListText.trim() && photoUris.length === 0) {
      Alert.alert('Missing Info', 'Please type your grocery list or upload a photo of it.');
      return;
    }
    if (!mobileNumber || !selectedAddress) {
      Alert.alert('Missing Info', 'Mobile number and delivery address are required.');
      return;
    }
    if (!isWithinZone) {
      Alert.alert('Outside Service Area', `This location is ${zoneDistance?.toFixed(1)}km away. We currently only deliver within a 5km radius.`);
      return;
    }

    setIsLoading(true);
    let uploadedUrls: string[] = [];

    if (photoUris.length > 0) {
      const results = await Promise.all(photoUris.map(uri => uploadPhoto(uri)));
      uploadedUrls = results.filter((u): u is string => !!u);
      if (uploadedUrls.length < photoUris.length) {
        setIsLoading(false);
        Alert.alert('Upload Failed', 'One or more images failed to upload. Please try again.');
        return;
      }
    }

    try {
      await rashanApi.submitRequest({
        addressId: selectedAddress?.id,
        bulkListText,
        bulkListPhotoUrl: uploadedUrls[0] || null,
        bulkListPhotoUrls: uploadedUrls,
        bulkMobileNumber: mobileNumber,
        bulkStreetAddress: selectedAddress?.streetAddress || '',
        bulkCity: selectedAddress?.city || 'Baldia Town',
        bulkLandmark: selectedAddress?.landmark || '',
        bulkFloor: floor,
        bulkPlacement: placement,
        bulkWeightTier: weightTier,
        bulkAdditionalNotes: notes
      });

      Alert.alert(
        'Request Submitted',
        'Your Monthly Rashan request has been sent! Our team will review it and provide a quotation shortly.',
        [{ text: 'OK', onPress: () => navigation.navigate('MyOrders') }]
      );
    } catch (err: any) {
      Alert.alert('Submission Failed', err.response?.data?.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Monthly Bulk Grocery</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoBox, { backgroundColor: theme.colors.rashanLight }]}>
          <Ionicons name="information-circle" size={24} color={theme.colors.rashan} />
          <AppText variant="caption" style={{ color: theme.colors.rashan, flex: 1, marginLeft: 12 }}>
            Type your grocery list or upload a photo. We source from wholesale markets and deliver via Rickshaw/Suzuki!
          </AppText>
        </View>

        <Text style={styles.sectionTitle}>1. Grocery List</Text>
        <TextInput
          style={styles.textArea}
          placeholder="E.g. 10kg Atta, 5kg Sugar, 16L Dalda..."
          multiline
          numberOfLines={4}
          value={bulkListText}
          onChangeText={setBulkListText}
        />

        <Text style={styles.orText}>— OR —</Text>

        <TouchableOpacity
          style={[styles.uploadBtn, { borderColor: theme.colors.rashan, backgroundColor: theme.colors.rashanLight }, photoUris.length >= 5 && { opacity: 0.5 }]}
          onPress={pickImages}
          disabled={photoUris.length >= 5}
        >
          <Ionicons name="images-outline" size={24} color={theme.colors.rashan} />
          <AppText variant="bodyStrong" style={{ marginLeft: 8, color: theme.colors.rashan }}>
            {photoUris.length === 0
              ? 'Upload Photos of List'
              : `Add More Photos (${photoUris.length}/5)`}
          </AppText>
        </TouchableOpacity>

        {photoUris.length > 0 && (
          <View style={styles.photosGrid}>
            {photoUris.map((uri, idx) => (
              <View key={uri + idx} style={styles.photoThumbWrap}>
                <Image source={{ uri }} style={styles.photoThumb} />
                <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(uri)}>
                  <Ionicons name="close-circle" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>2. Delivery Location</Text>
        
        {isLoadingAddresses ? (
          <ActivityIndicator color={theme.colors.rashan} style={{ marginVertical: 20 }} />
        ) : selectedAddress ? (
          <TouchableOpacity style={styles.addressBox} onPress={() => setShowAddressListModal(true)}>
            <View style={styles.addressIcon}>
              <Text style={{ fontSize: 20 }}>🏠</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabelSelected}>{selectedAddress.label || 'Home'}</Text>
              <Text style={styles.addressTextSelected}>{selectedAddress.streetAddress}</Text>
            </View>
            <Text style={styles.changeBtn}>Change</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.addressBox}
            onPress={() => handleOpenEdit()}
          >
            <View style={[styles.addressIcon, { backgroundColor: '#f0f0f0' }]}>
              <Text style={{ fontSize: 20 }}>📍</Text>
            </View>
            <Text style={{ color: '#1a1a1a', fontWeight: 'bold', flex: 1 }}>No address found. Add one now.</Text>
            <Text style={styles.changeBtn}>Add</Text>
          </TouchableOpacity>
        )}

        {!isWithinZone && selectedAddress && (
          <View style={styles.zoneWarning}>
            <Ionicons name="warning" size={20} color="#C53030" />
            <Text style={styles.zoneWarningText}>
              Outside Service Area ({zoneDistance?.toFixed(1)}km). We only deliver within 5km from our center.
            </Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Contact Number (for delivery) *"
          keyboardType="phone-pad"
          value={mobileNumber}
          onChangeText={setMobileNumber}
        />

        <View style={styles.landmarkContainer}>
          <Text style={styles.label}>Nearest Famous Landmark (For Rider)</Text>
          <TextInput
            style={styles.input}
            placeholder="E.g. Near Shell Petrol Pump, Opposite Civil Hospital"
            value={landmark}
            onChangeText={setLandmark}
          />
        </View>

        <Text style={styles.sectionTitle}>3. Logistics</Text>

        <Text style={styles.label}>Estimated Total Weight</Text>
        <View style={styles.selectorRow}>
          {(['light', 'medium', 'heavy'] as const).map(tier => (
            <TouchableOpacity
              key={tier}
              style={[styles.selectChip, weightTier === tier && styles.selectChipActive]}
              onPress={() => setWeightTier(tier)}
            >
              <Text style={[styles.selectChipText, weightTier === tier && styles.selectChipTextActive]}>
                {tier === 'light' ? '< 20kg' : tier === 'medium' ? '20-50kg' : '50kg+'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Delivery Floor (0 for Ground)</Text>
        <View style={styles.counterRow}>
          <TouchableOpacity
            style={styles.counterBtn}
            onPress={() => setFloor(Math.max(0, floor - 1))}
          >
            <Ionicons name="remove" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.counterText}>{floor}</Text>
          <TouchableOpacity
            style={styles.counterBtn}
            onPress={() => setFloor(Math.min(4, floor + 1))}
          >
            <Ionicons name="add" size={24} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Delivery Placement</Text>
        <View style={styles.selectorRow}>
          {(['gate', 'doorstep', 'inside'] as const).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.selectChip, placement === p && styles.selectChipActive]}
              onPress={() => setPlacement(p)}
            >
              <Text style={[styles.selectChipText, placement === p && styles.selectChipTextActive]}>
                {p === 'inside' ? 'Inside Pantry' : p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[styles.input, { marginTop: 16 }]}
          placeholder="Any special notes?"
          value={notes}
          onChangeText={setNotes}
        />

        <View style={styles.previewBox}>
          <Text style={styles.previewLabel}>Estimated Logistics & Sourcing Fee</Text>
          <Text style={styles.previewValue}>
            {previewFee != null ? `Rs. ${previewFee.toLocaleString()}` : 'Tap a selection above to calculate'}
          </Text>
          <View style={styles.previewBreakRow}>
            <Text style={styles.previewBreakItem}>
              Weight tier: Rs. {
                weightTier === 'light'
                  ? (settings?.rashan_base_fee ?? 750)
                  : weightTier === 'medium'
                    ? (settings?.rashan_base_fee ?? 750) + (settings?.rashan_surcharge_medium ?? 200)
                    : (settings?.rashan_base_fee ?? 750) + (settings?.rashan_surcharge_heavy ?? 450)
              }
            </Text>
            {floor > 0 && (
              <Text style={styles.previewBreakItem}>
                Floor: +Rs. {floor >= 3 ? (settings?.rashan_floor_surcharge_high ?? 300) : (settings?.rashan_floor_surcharge_low ?? 150)}
              </Text>
            )}
            {placement !== 'gate' && (
              <Text style={styles.previewBreakItem}>
                {placement === 'doorstep'
                  ? `Doorstep: +Rs. 0`
                  : `Inside Pantry: +Rs. ${settings?.rashan_placement_fee ?? 150}`}
              </Text>
            )}
          </View>
          <Text style={styles.previewSubtext}>
            Product costs are quoted separately by Admin based on current wholesale market rates.
          </Text>
        </View>

        <AppButton
          label={isLoading ? 'Requesting…' : 'Request Quotation'}
          variant="primary"
          tint={theme.colors.rashan}
          size="lg"
          fullWidth
          onPress={handleSubmit}
          disabled={isLoading}
          loading={isLoading}
          style={{ marginTop: theme.spacing.lg }}
        />

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Address Selection Modal */}
      {showAddressListModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.addressListContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Saved Addresses</Text>
              <TouchableOpacity onPress={() => setShowAddressListModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.addressListScroll} showsVerticalScrollIndicator={false}>
              {addresses.map((addr) => (
                <View key={addr.id} style={[styles.addressItem, selectedAddress?.id === addr.id && styles.addressItemSelected]}>
                  <TouchableOpacity style={styles.addressItemInfo} onPress={() => handleSelectAddress(addr)}>
                    <View style={styles.addressIconItem}>
                      <Text style={{ fontSize: 16 }}>{addr.label === 'Work' ? '🏢' : '🏠'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.addressItemLabel}>{addr.label || 'Other'}</Text>
                      <Text style={styles.addressItemText} numberOfLines={1}>{addr.streetAddress}</Text>
                    </View>
                    {selectedAddress?.id === addr.id && (
                      <View style={styles.selectedCircle}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editAddressBtn} onPress={() => handleOpenEdit(addr)}>
                    <Text style={styles.editAddressBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.addNewAddressBtn} onPress={() => handleOpenEdit()}>
              <Text style={styles.addNewAddressText}>+ Add New Address</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Actual Address Map/Form Modal */}
      <AddressPickerModal
        visible={showAddressPickerModal}
        onClose={() => setShowAddressPickerModal(false)}
        onSave={handleUpdateAddress}
        initialData={editingAddressData}
        title={editingAddressData ? "Edit Address" : "Add New Address"}
        accent={theme.colors.rashan}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFDFD', // Super clean white
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  backButton: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8FAFC',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  content: {
    paddingHorizontal: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4', // Very light green
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1, borderColor: '#DCFCE7',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16,
    marginTop: 8,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 20,
    padding: 20,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    color: '#334155',
  },
  orText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginVertical: 16,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: 18,
    borderRadius: 20,
    marginBottom: 24,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  photoThumbWrap: {
    width: '31%',
    aspectRatio: 1,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 10,
    padding: 2,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    marginBottom: 16,
    color: '#334155',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  selectChip: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  selectChipActive: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
    ...theme.shadows.brand,
    shadowColor: '#16A34A',
  },
  selectChipText: {
    fontWeight: '700',
    color: '#64748B',
    fontSize: 13,
  },
  selectChipTextActive: {
    color: '#fff',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    alignSelf: 'flex-start',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  counterBtn: {
    padding: 14,
  },
  counterText: {
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: 20,
    color: '#1E293B',
  },
  previewBox: {
    backgroundColor: '#F0FDF4',
    padding: 24,
    borderRadius: 24,
    marginTop: 32,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  previewLabel: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  previewValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#16A34A',
    marginBottom: 12,
  },
  previewBreakRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  previewBreakItem: {
    fontSize: 12,
    color: '#166534',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: '700',
  },
  previewSubtext: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 18,
    opacity: 0.7,
  },
  addressBox: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 24, 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 24, 
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  addressIcon: { width: 52, height: 52, backgroundColor: '#F8FAFC', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  addressLabelSelected: { fontWeight: '800', fontSize: 16, color: '#0F172A', marginBottom: 4 },
  addressTextSelected: { color: '#64748B', fontSize: 13, lineHeight: 18 },
  changeBtn: { color: '#16A34A', fontWeight: '800', fontSize: 14, borderLeftWidth: 1.5, borderLeftColor: '#F1F5F9', paddingLeft: 16 },

  zoneWarning: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16,
    marginBottom: 20, borderWidth: 1, borderColor: '#FEE2E2',
  },
  zoneWarningText: { color: '#B91C1C', fontSize: 13, fontWeight: '600', flex: 1 },

  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end', zIndex: 100 },
  addressListContainer: { backgroundColor: '#fff', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 32, maxHeight: '85%', paddingBottom: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  closeBtn: { width: 40, height: 40, backgroundColor: '#F1F5F9', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  addressListScroll: { maxHeight: 400 },
  addressItem: { flexDirection: 'row', flexWrap: 'nowrap', backgroundColor: '#f9f9f9', borderRadius: 20, marginBottom: 15, paddingRight: 15, borderWidth: 1, borderColor: '#f0f0f0' },
  addressItemSelected: { borderColor: '#16A34A', backgroundColor: '#F0FDF4' },
  addressItemInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 15 },
  addressIconItem: { width: 36, height: 36, backgroundColor: '#fff', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15, ...theme.shadows.sm },
  addressItemLabel: { fontWeight: 'bold', fontSize: 15, color: '#0F172A', marginBottom: 2 },
  addressItemText: { color: '#64748B', fontSize: 12, paddingRight: 10 },
  selectedCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#16A34A', justifyContent: 'center', alignItems: 'center' },
  editAddressBtn: { paddingVertical: 15, paddingLeft: 10, justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#F1F5F9' },
  editAddressBtnText: { color: '#16A34A', fontWeight: 'bold', fontSize: 13 },
  addNewAddressBtn: { marginTop: 10, backgroundColor: '#fff', borderWidth: 2, borderStyle: 'dashed', borderColor: '#F1F5F9', borderRadius: 20, padding: 18, alignItems: 'center' },
  addNewAddressText: { color: '#64748B', fontWeight: 'bold', fontSize: 15 },
  landmarkContainer: { marginTop: 10 },
});
