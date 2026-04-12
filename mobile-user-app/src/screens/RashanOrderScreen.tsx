import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
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

type RootStackParamList = {
  Home: undefined;
  MyOrders: undefined;
};
type NavProp = StackNavigationProp<RootStackParamList>;

export default function RashanOrderScreen() {
  const navigation = useNavigation<NavProp>();

  const [bulkListText, setBulkListText] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
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

  const calculatePreview = async () => {
    try {
      const res = await rashanApi.previewFee({ weightTier, floor, placement });
      setPreviewFee(res.data.serviceFee);
    } catch (err) {
      console.log('Preview fee fetch failed', err);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
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
    if (!bulkListText.trim() && !photoUri) {
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
    let finalPhotoUrl = null;

    if (photoUri) {
      finalPhotoUrl = await uploadPhoto(photoUri);
      if (!finalPhotoUrl) {
        setIsLoading(false);
        Alert.alert('Upload Failed', 'Failed to upload the image. Please try again.');
        return;
      }
    }

    try {
      await rashanApi.submitRequest({
        addressId: selectedAddress?.id,
        bulkListText,
        bulkListPhotoUrl: finalPhotoUrl,
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
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#FF4500" />
          <Text style={styles.infoText}>
            Type your grocery list or upload a photo. We source from wholesale markets and deliver via Rickshaw/Suzuki!
          </Text>
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

        <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
          <Ionicons name="camera-outline" size={24} color="#FF4500" />
          <Text style={styles.uploadBtnText}>Upload Photo of List</Text>
        </TouchableOpacity>

        {photoUri && (
          <View style={styles.photoPreviewContainer}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhotoUri(null)}>
              <Ionicons name="close-circle" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>2. Delivery Location</Text>
        
        {isLoadingAddresses ? (
          <ActivityIndicator color="#FF4500" style={{ marginVertical: 20 }} />
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
          <Text style={styles.previewLabel}>Estimated Logistics & Sourcing Fee:</Text>
          <Text style={styles.previewValue}>
            {previewFee ? `Rs. ${previewFee}` : 'Calculating...'}
          </Text>
          <Text style={styles.previewSubtext}>
            (Product costs will be quoted by Admin based on current market rates)
          </Text>
        </View>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Request Quotation</Text>
          )}
        </TouchableOpacity>

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
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  content: {
    padding: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF0E6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#D84315',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    marginTop: 8,
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  orText: {
    textAlign: 'center',
    color: '#8E8E93',
    marginVertical: 12,
    fontWeight: '600',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0E6',
    borderWidth: 1,
    borderColor: '#FF4500',
    borderStyle: 'dashed',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  uploadBtnText: {
    marginLeft: 8,
    color: '#FF4500',
    fontWeight: '600',
    fontSize: 16,
  },
  photoPreviewContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectChip: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  selectChipActive: {
    backgroundColor: '#FF4500',
    borderColor: '#FF4500',
  },
  selectChipText: {
    fontWeight: '600',
    color: '#666',
    fontSize: 13,
  },
  selectChipTextActive: {
    color: '#fff',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  counterBtn: {
    padding: 12,
  },
  counterText: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
  },
  previewBox: {
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  previewLabel: {
    fontSize: 14,
    color: '#666',
  },
  previewValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginVertical: 4,
  },
  previewSubtext: {
    fontSize: 12,
    color: '#8E8E93',
  },
  submitBtn: {
    backgroundColor: '#FF4500',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  addressBox: { 
    backgroundColor: '#fff', 
    padding: 18, 
    borderRadius: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20, 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0'
  },
  addressIcon: { width: 45, height: 45, backgroundColor: '#FFF5F0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  addressLabelSelected: { fontWeight: 'bold', fontSize: 15, color: '#1a1a1a', marginBottom: 2 },
  addressTextSelected: { color: '#888', fontSize: 13 },
  changeBtn: { color: '#FF4500', fontWeight: 'bold', borderLeftWidth: 1, borderLeftColor: '#eee', paddingLeft: 15 },

  // Modal Styles
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 100 },
  addressListContainer: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%', paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1a1a1a' },
  closeBtn: { width: 36, height: 36, backgroundColor: '#f0f0f0', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  addressListScroll: { maxHeight: 400 },
  addressItem: { flexDirection: 'row', flexWrap: 'nowrap', backgroundColor: '#f9f9f9', borderRadius: 20, marginBottom: 15, paddingRight: 15, borderWidth: 1, borderColor: '#f0f0f0' },
  addressItemSelected: { borderColor: '#FF4500', backgroundColor: '#FFF5F0' },
  addressItemInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 15 },
  addressIconItem: { width: 36, height: 36, backgroundColor: '#fff', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  addressItemLabel: { fontWeight: 'bold', fontSize: 15, color: '#1a1a1a', marginBottom: 2 },
  addressItemText: { color: '#888', fontSize: 12, paddingRight: 10 },
  selectedCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FF4500', justifyContent: 'center', alignItems: 'center' },
  editAddressBtn: { paddingVertical: 15, paddingLeft: 10, justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#f0f0f0' },
  editAddressBtnText: { color: '#FF4500', fontWeight: 'bold', fontSize: 13 },
  addNewAddressBtn: { marginTop: 10, backgroundColor: '#fff', borderWidth: 2, borderStyle: 'dashed', borderColor: '#ccc', borderRadius: 20, padding: 18, alignItems: 'center' },
  addNewAddressText: { color: '#666', fontWeight: 'bold', fontSize: 15 },
  zoneWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  zoneWarningText: {
    color: '#C53030',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  landmarkContainer: {
    marginTop: 10,
  },
});
