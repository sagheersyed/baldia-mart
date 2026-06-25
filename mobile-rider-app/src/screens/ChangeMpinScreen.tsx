import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, TextInput, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { authApi } from '../api/api';

const PinInputSimple = ({ value, onValueChange, label, autoFocus }: any) => (
  <View style={styles.inputRow}>
    <Text style={styles.label}>{label}</Text>
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
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Change MPIN</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Text style={styles.desc}>
                    Update your 4-digit security PIN. This will be required for login and confirming orders.
                </Text>

                <PinInputSimple label="CURRENT MPIN" value={oldMpin} onValueChange={setOldMpin} autoFocus={true} />
                <PinInputSimple label="NEW MPIN" value={newMpin} onValueChange={setNewMpin} />
                <PinInputSimple label="CONFIRM NEW MPIN" value={confirmMpin} onValueChange={setConfirmMpin} />

                <TouchableOpacity 
                    style={[styles.btn, (loading || oldMpin.length < 4 || newMpin.length < 4 || confirmMpin.length < 4) && styles.btnDisabled]}
                    onPress={handleChangeMpin}
                    disabled={loading || oldMpin.length < 4 || newMpin.length < 4 || confirmMpin.length < 4}
                >
                  <Text style={styles.btnText}>{loading ? "Updating..." : "Update MPIN"}</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textHeader, marginLeft: 12 },
  content: { padding: 24, flexGrow: 1 },
  desc: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 32 },
  inputRow: { marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 12, marginLeft: 4, letterSpacing: 1 },
  pinWrapper: { flexDirection: 'row', gap: 12 },
  pinBox: { width: 60, height: 60, backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  pinBoxActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '05' },
  pinDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.border },
  pinDotActive: { backgroundColor: theme.colors.primary },
  hiddenInput: { ...StyleSheet.absoluteFillObject, opacity: 0 },
  btn: { backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 40 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
