import React, { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, AppButton, AppIconButton } from '../components/ui';
import { theme } from '../theme/theme';
import { authApi } from '../api/api';

const PinInputSimple = ({ value, onValueChange, label, autoFocus }: any) => (
  <View style={styles.inputRow}>
    <AppText variant="caption" style={styles.label}>{label}</AppText>
    <View style={styles.pinWrapper}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.pinBox, value.length > i && styles.pinBoxActive]}>
          <View style={[styles.pinDot, value.length > i && styles.pinDotActive]} />
        </View>
      ))}
      <TextInput
        style={styles.hiddenInput}
        keyboardType="numeric"
        maxLength={4}
        value={value}
        onChangeText={onValueChange}
        autoFocus={autoFocus}
        secureTextEntry
      />
    </View>
  </View>
);

export default function ChangeMpinScreen({ navigation }: any) {
    const [oldMpin, setOldMpin] = useState('');
    const [newMpin, setNewMpin] = useState('');
    const [confirmMpin, setConfirmMpin] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChangeMpin = async () => {
        if (oldMpin.length !== 4 || newMpin.length !== 4) {
            Alert.alert('Error', 'MPIN must be 4 digits long');
            return;
        }
        if (newMpin !== confirmMpin) {
            Alert.alert('Error', 'New MPIN and Confirm MPIN do not match');
            return;
        }

        setLoading(true);
        try {
            await authApi.changeMpin({ oldMpin, newMpin });
            Alert.alert('Success', 'MPIN changed successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to change MPIN. Please check your current MPIN.';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <AppIconButton 
                    onPress={() => navigation.goBack()}
                >
                  <Ionicons name="arrow-back" size={24} color={theme.colors.textSecondary} />
                </AppIconButton>
                <AppText variant="h2" style={{ marginLeft: 12 }}>Change MPIN</AppText>
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <AppText variant="body" style={styles.desc}>
                    Update your 4-digit security PIN to keep your account safe.
                </AppText>

                <PinInputSimple label="CURRENT MPIN" value={oldMpin} onValueChange={setOldMpin} autoFocus={true} />
                <PinInputSimple label="NEW MPIN" value={newMpin} onValueChange={setNewMpin} />
                <PinInputSimple label="CONFIRM NEW MPIN" value={confirmMpin} onValueChange={setConfirmMpin} />

                <AppButton 
                    label={loading ? "Updating..." : "Update MPIN"} 
                    size="lg" 
                    fullWidth 
                    style={{ marginTop: 40 }}
                    onPress={handleChangeMpin}
                    disabled={loading || oldMpin.length < 4 || newMpin.length < 4 || confirmMpin.length < 4}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  content: { padding: 24, flexGrow: 1 },
  desc: { color: theme.colors.textMuted, marginBottom: 32 },
  inputRow: { marginBottom: 24 },
  label: { marginBottom: 12, marginLeft: 4, fontWeight: '700' },
  pinWrapper: { flexDirection: 'row', gap: 12 },
  pinBox: { width: 60, height: 60, backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.divider, alignItems: 'center', justifyContent: 'center' },
  pinBoxActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '05' },
  pinDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.divider },
  pinDotActive: { backgroundColor: theme.colors.primary },
  hiddenInput: { ...StyleSheet.absoluteFillObject, opacity: 0 },
});
