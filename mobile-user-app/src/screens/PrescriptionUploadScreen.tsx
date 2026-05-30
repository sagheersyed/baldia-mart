import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, TextInput, Image, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { prescriptionsApi, uploadApi } from '../api/api';
import AppText from '../components/ui/AppText';
import { theme } from '../theme/theme';

const ACCENT = theme.colors.pharma;

export default function PrescriptionUploadScreen({ navigation }: any) {
  const [images, setImages] = useState<string[]>([]);
  const [doctorName, setDoctorName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll access is needed to upload prescriptions.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    });

    if (!result.canceled && result.assets?.length) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, 5));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is needed to take prescription photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      setImages((prev) => [...prev, result.assets[0].uri].slice(0, 5));
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (images.length === 0) {
      Alert.alert('No Image', 'Please upload at least one prescription image.');
      return;
    }

    setUploading(true);
    try {
      // 1. Upload all images to the server
      const uploadPromises = images.map((uri) => uploadApi.uploadFile(uri));
      const uploadResults = await Promise.all(uploadPromises);
      const serverUrls = uploadResults.map((res) => res.data.url);

      // 2. Submit the prescription with server URLs
      await prescriptionsApi.upload({
        imageUrl: serverUrls[0],
        additionalImageUrls: serverUrls.slice(1),
        doctorName: doctorName || undefined,
        patientName: patientName || undefined,
        doctorNotes: notes || undefined,
      });

      Alert.alert(
        'Prescription Submitted ✓',
        'Our pharmacist will review your prescription within 30 minutes. You will be notified once approved.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to upload prescription. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleConsultationRequest = async () => {
    setUploading(true);
    try {
      await prescriptionsApi.requestConsultation({ 
        medicineIds: [], // User will select in the call
        notes: 'Consultation requested via app'
      });
      Alert.alert(
        'Call Requested ✓',
        'Our pharmacist will call you shortly to discuss your requirements.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to request consultation.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <AppText variant="title" style={{ marginLeft: 12 }}>Upload Prescription</AppText>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* ── Info Banner ──────────────────────────────────── */}
        <View style={styles.infoBanner}>
          <Ionicons name="shield-checkmark" size={24} color={ACCENT} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="bodyStrong">Secure & Verified</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>
              Your prescription is reviewed by licensed pharmacists and kept confidential.
            </AppText>
          </View>
        </View>

        {/* ── Image Upload Area ────────────────────────────── */}
        <AppText variant="title" style={{ marginTop: 20, marginBottom: 12 }}>
          Prescription Images
        </AppText>

        <View style={styles.imageGrid}>
          {images.map((uri, idx) => (
            <View key={idx} style={styles.imageThumb}>
              <Image source={{ uri }} style={styles.thumbImg} resizeMode="cover" />
              <Pressable style={styles.removeBtn} onPress={() => removeImage(idx)}>
                <Ionicons name="close-circle" size={22} color="#EF4444" />
              </Pressable>
            </View>
          ))}
          {images.length < 5 && (
            <View style={styles.addImageBtns}>
              <Pressable style={styles.addImageBtn} onPress={pickImage}>
                <Ionicons name="images-outline" size={28} color={ACCENT} />
                <AppText variant="caption" color={ACCENT} style={{ marginTop: 4 }}>Gallery</AppText>
              </Pressable>
              <Pressable style={styles.addImageBtn} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={28} color={ACCENT} />
                <AppText variant="caption" color={ACCENT} style={{ marginTop: 4 }}>Camera</AppText>
              </Pressable>
            </View>
          )}
        </View>

        <AppText variant="caption" color={theme.colors.textMuted} style={{ marginTop: 8 }}>
          Upload up to 5 images. Ensure text is clearly readable.
        </AppText>

        {/* ── Optional Fields ─────────────────────────────── */}
        <AppText variant="title" style={{ marginTop: 24, marginBottom: 12 }}>
          Additional Details (Optional)
        </AppText>

        <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginBottom: 6 }}>
          Doctor Name
        </AppText>
        <TextInput
          style={styles.input}
          placeholder="Dr. Ahmed"
          placeholderTextColor={theme.colors.textMuted}
          value={doctorName}
          onChangeText={setDoctorName}
        />

        <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginTop: 12, marginBottom: 6 }}>
          Patient Name
        </AppText>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={theme.colors.textMuted}
          value={patientName}
          onChangeText={setPatientName}
        />

        <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginTop: 12, marginBottom: 6 }}>
          Notes for Pharmacist
        </AppText>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Any special instructions…"
          placeholderTextColor={theme.colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        {/* ── How it Works ────────────────────────────────── */}
        <View style={styles.stepsBlock}>
          <AppText variant="title" style={{ marginBottom: 16 }}>How it Works</AppText>
          <StepItem num={1} icon="cloud-upload-outline" text="Upload your prescription image" />
          <StepItem num={2} icon="person-outline" text="Our pharmacist reviews & verifies" />
          <StepItem num={3} icon="checkmark-circle-outline" text="You get notified once approved" />
          <StepItem num={4} icon="cart-outline" text="Medicines are added to your cart" />
        </View>

        {/* ── Consultation Option ───────────────────────────── */}
        <View style={styles.consultationCard}>
          <View style={styles.consultHeader}>
            <Ionicons name="call-outline" size={22} color={ACCENT} />
            <AppText variant="bodyStrong" style={{ marginLeft: 10 }}>Don't have a prescription?</AppText>
          </View>
          <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginTop: 8 }}>
            Our licensed pharmacist can call you to discuss your health needs and verify if a prescription is appropriate.
          </AppText>
          <Pressable 
            style={styles.consultBtn} 
            onPress={() => {
              Alert.alert(
                'Request Consultation',
                'A pharmacist will call you on your registered number within 1 hour. Continue?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Yes, Call Me', onPress: handleConsultationRequest }
                ]
              );
            }}
          >
            <AppText variant="bodyStrong" color={ACCENT}>Request Pharmacist Call</AppText>
          </Pressable>
        </View>
      </ScrollView>

      {/* ── Submit Button ──────────────────────────────────── */}
      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.submitBtn, uploading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
              <AppText variant="bodyStrong" color="#fff" style={{ marginLeft: 8 }}>
                Submit Prescription
              </AppText>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function StepItem({ num, icon, text }: { num: number; icon: string; text: string }) {
  return (
    <View style={stepStyles.row}>
      <View style={stepStyles.numCircle}>
        <AppText variant="badge" color={ACCENT}>{num}</AppText>
      </View>
      <Ionicons name={icon as any} size={20} color={ACCENT} style={{ marginHorizontal: 12 }} />
      <AppText variant="body" style={{ flex: 1 }}>{text}</AppText>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  numCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.pharmaLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.pharmaBorder,
  },
});

const ACCENT_LOCAL = theme.colors.pharma;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: theme.colors.pharmaLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.pharmaBorder,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageThumb: {
    width: 100,
    height: 100,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addImageBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  addImageBtn: {
    width: 100,
    height: 100,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.pharmaBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.pharmaLight,
  },
  input: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepsBlock: {
    marginTop: 24,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  submitBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ACCENT_LOCAL,
    paddingVertical: 16,
    borderRadius: theme.radius.lg,
    ...theme.shadows.md,
  },
  consultationCard: {
    marginTop: 20,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.pharmaBorder,
    borderStyle: 'dashed',
  },
  consultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  consultBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.pharmaLight,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.pharmaBorder,
  },
});
