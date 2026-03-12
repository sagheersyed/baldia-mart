import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, Alert, Pressable
} from 'react-native';
import * as Location from 'expo-location';

interface AddressPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (address: {
    label: string,
    streetAddress: string,
    city: string,
    postalCode: string,
    latitude: number,
    longitude: number
  }) => void;
  initialData?: {
    label?: string;
    streetAddress?: string;
    city?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  };
  title?: string;
}

const LABEL_OPTIONS = ['Home', 'Work', 'Other'];

export default function AddressPickerModal({
  visible,
  onClose,
  onSave,
  initialData,
  title = 'Select Address'
}: AddressPickerModalProps) {
  const [label, setLabel] = useState(initialData?.label || 'Home');
  const [streetAddress, setStreetAddress] = useState(initialData?.streetAddress || '');
  const [city, setCity] = useState(initialData?.city || 'Karachi');
  const [postalCode, setPostalCode] = useState(initialData?.postalCode || '');
  const [coords, setCoords] = useState({ 
    latitude: initialData?.latitude || 0, 
    longitude: initialData?.longitude || 0 
  });
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  // Sync state with props when modal opens or initialData changes
  useEffect(() => {
    if (visible && initialData) {
      setLabel(initialData.label || 'Home');
      setStreetAddress(initialData.streetAddress || '');
      setCity(initialData.city || 'Karachi');
      setPostalCode(initialData.postalCode || '');
      setCoords({
        latitude: initialData.latitude || 0,
        longitude: initialData.longitude || 0
      });
    } else if (visible && !initialData) {
      // Reset for new address
      setLabel('Home');
      setStreetAddress('');
      setCity('Karachi');
      setPostalCode('');
      setCoords({ latitude: 0, longitude: 0 });
    }
  }, [visible, initialData]);

  const handleLocateMe = async () => {
    setLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow location access to auto-fetch your address.');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

      let reverse = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (reverse.length > 0) {
        const addr = reverse[0];
        setStreetAddress(`${addr.name || ''} ${addr.street || ''}`.trim());
        setCity(addr.city || addr.district || 'Karachi');
        setPostalCode(addr.postalCode || '');
      }
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Could not fetch location. Please enter it manually.');
    } finally {
      setLocating(false);
    }
  };

  const handleSave = () => {
    if (!streetAddress.trim()) {
      Alert.alert('Error', 'Please enter a street address');
      return;
    }
    onSave({
      label,
      streetAddress,
      city,
      postalCode,
      latitude: coords.latitude,
      longitude: coords.longitude
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>

          <Text style={styles.label}>Label</Text>
          <View style={styles.labelRow}>
            {LABEL_OPTIONS.map((l) => (
              <TouchableOpacity
                key={l}
                style={[styles.chip, label === l && styles.chipActive]}
                onPress={() => setLabel(l)}
              >
                <Text style={[styles.chipText, label === l && styles.chipTextActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputHeader}>
            <Text style={styles.label}>Street Address *</Text>
            <TouchableOpacity onPress={handleLocateMe} disabled={locating}>
              {locating ? (
                <ActivityIndicator size="small" color="#FF4500" />
              ) : (
                <Text style={styles.locateText}>📍 Auto-Locate</Text>
              )}
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="House #, Street, Block..."
            value={streetAddress}
            onChangeText={setStreetAddress}
            multiline
          />

          <View style={{ flexDirection: 'row', gap: 15 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                placeholder="City"
                value={city}
                onChangeText={setCity}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Postal Code</Text>
              <TextInput
                style={styles.input}
                placeholder="Postal Code"
                value={postalCode}
                onChangeText={setPostalCode}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Address</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40 },
  handle: { width: 40, height: 5, backgroundColor: '#eee', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 8 },
  labelRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#eee' },
  chipActive: { backgroundColor: '#FF4500', borderColor: '#FF4500' },
  chipText: { fontSize: 13, color: '#666', fontWeight: 'bold' },
  chipTextActive: { color: '#fff' },
  inputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  locateText: { color: '#FF4500', fontWeight: 'bold', fontSize: 14 },
  input: {
    height: 50,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 15,
    fontSize: 15,
    marginBottom: 20
  },
  textArea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, height: 55, borderRadius: 15, borderWidth: 1.5, borderColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: 'bold', color: '#666' },
  saveBtn: { flex: 2, height: 55, borderRadius: 15, backgroundColor: '#FF4500', justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: 'bold', color: '#fff' }
});
