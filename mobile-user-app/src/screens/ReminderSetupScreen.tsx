import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { remindersApi } from '../api/api';
import AppText from '../components/ui/AppText';
import AppButton from '../components/ui/AppButton';
import { theme } from '../theme/theme';

const FREQUENCIES = [
  { id: 'daily', label: 'Once Daily' },
  { id: 'twice_daily', label: 'Twice Daily' },
  { id: 'thrice_daily', label: 'Thrice Daily' },
  { id: 'weekly', label: 'Once Weekly' },
];

export default function ReminderSetupScreen({ route, navigation }: any) {
  const { medicineName = '', medicineId = null } = route.params || {};

  const [name, setName] = useState(medicineName);
  const [dosage, setDosage] = useState('');
  const [selectedFreq, setSelectedFreq] = useState('daily');
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (!name || !dosage) {
      Alert.alert('Incomplete Info', 'Please provide medicine name and dosage.');
      return;
    }

    try {
      setSubmitting(true);
      const times = selectedFreq === 'twice_daily' ? ["08:00", "20:00"] 
                  : selectedFreq === 'thrice_daily' ? ["08:00", "14:00", "20:00"]
                  : ["08:00"];

      const payload = {
        medicineName: name,
        medicineId,
        dosage,
        frequency: selectedFreq,
        times,
        startDate: new Date(),
      };

      await remindersApi.create(payload);
      
      // Note: In a real app, we would call a utility here to schedule local push notifications
      // e.g. NotificationHelper.scheduleMedicineReminders(payload);

      Alert.alert('Reminder Set!', `We'll remind you to take ${name} according to your schedule.`, [
        { text: 'View All', onPress: () => navigation.navigate('ReminderList') },
        { text: 'Done', onPress: () => navigation.navigate('Home') }
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to save reminder.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <AppText variant="h2">Medicine Reminder</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <AppText variant="title">Medicine Details</AppText>
          <View style={styles.inputGroup}>
            <AppText variant="captionStrong" color={theme.colors.textMuted}>Medicine Name</AppText>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Panadol Extra"
            />
          </View>

          <View style={styles.inputGroup}>
            <AppText variant="captionStrong" color={theme.colors.textMuted}>Dosage</AppText>
            <TextInput
              style={styles.input}
              value={dosage}
              onChangeText={setDosage}
              placeholder="e.g. 1 Tablet or 5ml"
            />
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="title" style={{ marginBottom: 12 }}>How often?</AppText>
          <View style={styles.freqGrid}>
            {FREQUENCIES.map((freq) => (
              <Pressable
                key={freq.id}
                style={[
                  styles.freqBtn,
                  selectedFreq === freq.id && styles.freqBtnActive
                ]}
                onPress={() => setSelectedFreq(freq.id)}
              >
                <AppText
                  variant="bodyStrong"
                  color={selectedFreq === freq.id ? '#fff' : theme.colors.textSecondary}
                >
                  {freq.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="notifications-outline" size={20} color={theme.colors.pharma} />
          <AppText variant="caption" color={theme.colors.textMuted} style={{ flex: 1, marginLeft: 12 }}>
            You will receive push notifications at the scheduled times to remind you of your dose.
          </AppText>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label={submitting ? "Saving..." : "Save Reminder"}
          variant="primary"
          tint={theme.colors.pharma}
          size="lg"
          fullWidth
          disabled={submitting}
          onPress={handleSave}
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
  content: { padding: 16 },
  section: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radius.lg,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputGroup: { marginTop: 16 },
  input: {
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  freqGrid: { gap: 10 },
  freqBtn: {
    padding: 16,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  freqBtnActive: {
    backgroundColor: theme.colors.pharma,
    borderColor: theme.colors.pharma,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.pharmaLight,
    padding: 16,
    borderRadius: theme.radius.md,
  },
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
});
