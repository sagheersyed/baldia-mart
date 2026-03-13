import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api/api';

export default function CompleteProfileScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [vehicleType, setVehicleType] = useState('Bike');
  const [vehicleNumber, setVehicleNumber] = useState('');
  
  const [cnicFront, setCnicFront] = useState<string | null>(null);
  const [cnicBack, setCnicBack] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const pickImage = async (setter: (uri: string) => void) => {
    // Request permission first
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to upload documents.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      setter(result.assets[0].uri);
    }
  };

  const takeSelfie = async (setter: (uri: string) => void) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera permissions to take a selfie.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setter(result.assets[0].uri);
    }
  };

  const uploadToStorageMock = async (uri: string, path: string) => {
    // Mock upload: In a real app, you upload this URI to Firebase or S3 and return the public URL.
    return `mock_url_for_${path}`;
  };

  const handleSubmit = async () => {
    if (!name || !vehicleNumber || !cnicFront || !cnicBack || !selfie) {
      Alert.alert('Missing Fields', 'Please complete all required fields and upload all documents.');
      return;
    }

    setLoading(true);
    try {
      // In reality, you'd trigger 3 parallel uploads here first
      const cnicFrontUrl = await uploadToStorageMock(cnicFront, 'cnic_front');
      const cnicBackUrl = await uploadToStorageMock(cnicBack, 'cnic_back');
      const selfieUrl = await uploadToStorageMock(selfie, 'selfie');

      await api.patch('/riders/me', {
        name,
        vehicleType,
        vehicleNumber,
        cnicFrontUrl,
        cnicBackUrl,
        selfieUrl
      });
      
      // Successfully updated and marked as complete on the backend
      navigation.replace('Main');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to complete profile.');
    } finally {
      setLoading(false);
    }
  };

  const renderImageUploadBox = (label: string, uri: string | null, onPick: () => void, isCamera = false) => (
    <View style={styles.uploadBoxContainer}>
      <Text style={styles.uploadLabel}>{label}</Text>
      <TouchableOpacity style={styles.uploadBox} onPress={onPick}>
        {uri ? (
          <Image source={{ uri }} style={styles.uploadedImage} />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <Text style={styles.uploadIcon}>{isCamera ? '📷' : '📄'}</Text>
            <Text style={styles.uploadPlaceholderText}>{isCamera ? 'Take Photo' : 'Upload Image'}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>We need a few more details to set up your Rider account.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Details</Text>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your Full Name" placeholderTextColor="#aaa" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verification Documents</Text>
            {renderImageUploadBox('Live Selfie', selfie, () => takeSelfie(setSelfie), true)}
            <View style={styles.row}>
              {renderImageUploadBox('CNIC Front', cnicFront, () => pickImage(setCnicFront))}
              <View style={{ width: 15 }} />
              {renderImageUploadBox('CNIC Back', cnicBack, () => pickImage(setCnicBack))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Information</Text>
            <Text style={styles.label}>Vehicle Type</Text>
            <View style={styles.vehicleTypeRow}>
              {['Bike', 'Car', 'Van'].map(type => (
                <TouchableOpacity 
                  key={type} 
                  style={[styles.typeBtn, vehicleType === type && styles.typeBtnActive]}
                  onPress={() => setVehicleType(type)}
                >
                  <Text style={[styles.typeBtnText, vehicleType === type && styles.typeBtnTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Vehicle Registration Number</Text>
            <TextInput style={styles.input} value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="ABC-1234" placeholderTextColor="#aaa" autoCapitalize="characters" />
          </View>

          <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit & Continue</Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Temporary polyfill if SafeAreaView isn't configured at root level
import { SafeAreaView } from 'react-native-safe-area-context';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1E1E1E' },
  container: { flex: 1 },
  scrollContent: { padding: 25, paddingBottom: 50 },
  header: { marginBottom: 30, marginTop: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#aaa', lineHeight: 22 },
  
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#FF4500', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  
  label: { fontSize: 14, fontWeight: '600', color: '#ccc', marginBottom: 8 },
  input: { height: 55, backgroundColor: '#2A2A2A', borderRadius: 12, borderWidth: 1, borderColor: '#333', color: '#fff', paddingHorizontal: 15, fontSize: 16, marginBottom: 15 },
  
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  uploadBoxContainer: { flex: 1, marginBottom: 15 },
  uploadLabel: { fontSize: 13, color: '#ccc', marginBottom: 8, fontWeight: '600' },
  uploadBox: { height: 120, backgroundColor: '#2A2A2A', borderRadius: 12, borderWidth: 1, borderColor: '#444', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  uploadPlaceholder: { alignItems: 'center' },
  uploadIcon: { fontSize: 32, marginBottom: 5 },
  uploadPlaceholderText: { color: '#888', fontSize: 12 },
  uploadedImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  vehicleTypeRow: { flexDirection: 'row', marginBottom: 20 },
  typeBtn: { flex: 1, height: 45, backgroundColor: '#2A2A2A', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: '#333' },
  typeBtnActive: { backgroundColor: '#FF450044', borderColor: '#FF4500' },
  typeBtnText: { color: '#aaa', fontWeight: 'bold' },
  typeBtnTextActive: { color: '#FF4500' },

  submitBtn: { height: 55, backgroundColor: '#FF4500', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
