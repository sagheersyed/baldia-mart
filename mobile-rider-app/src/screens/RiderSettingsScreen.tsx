import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Switch, ScrollView, TouchableOpacity, Text, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme/theme';

const SETTINGS_KEYS = {
  MPIN_ENABLED: '@rider_mpin_enabled',
  GOOGLE_MAPS_DEFAULT: '@rider_google_maps_default',
};

export default function RiderSettingsScreen({ navigation }: any) {
  const [mpinEnabled, setMpinEnabled] = useState(true);
  const [googleMapsDefault, setGoogleMapsDefault] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const mpin = await AsyncStorage.getItem(SETTINGS_KEYS.MPIN_ENABLED);
      const maps = await AsyncStorage.getItem(SETTINGS_KEYS.GOOGLE_MAPS_DEFAULT);
      if (mpin !== null) setMpinEnabled(mpin === 'true');
      if (maps !== null) setGoogleMapsDefault(maps === 'true');
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  const toggleMpin = async (val: boolean) => {
    setMpinEnabled(val);
    await AsyncStorage.setItem(SETTINGS_KEYS.MPIN_ENABLED, String(val));
  };

  const toggleMaps = async (val: boolean) => {
    setGoogleMapsDefault(val);
    await AsyncStorage.setItem(SETTINGS_KEYS.GOOGLE_MAPS_DEFAULT, String(val));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => navigation.goBack()} 
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SECURITY</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>MPIN Login</Text>
              <Text style={styles.rowDesc}>Require MPIN to login to app</Text>
            </View>
            <Switch 
              value={mpinEnabled} 
              onValueChange={toggleMpin}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={Platform.OS === 'ios' ? undefined : '#fff'}
            />
          </View>
          
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => navigation.navigate('ChangeMpin')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Change MPIN</Text>
              <Text style={styles.rowDesc}>Update your security PIN</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PREFERENCES</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Use Google Maps</Text>
              <Text style={styles.rowDesc}>Open navigation in Google Maps by default</Text>
            </View>
            <Switch 
              value={googleMapsDefault} 
              onValueChange={toggleMaps}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={Platform.OS === 'ios' ? undefined : '#fff'}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textHeader, marginLeft: 12 },
  content: { padding: 16 },
  section: { marginBottom: 32 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary, marginBottom: 12, marginLeft: 4, letterSpacing: 1 },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: theme.colors.surface, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8
  },
  rowLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  rowDesc: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  menuItem: {
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: theme.colors.surface, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 8
  }
});
