import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, RefreshControl, Modal, TextInput, ScrollView
} from 'react-native';
import { addressesApi } from '../api/api';

const LABEL_OPTIONS = ['Home', 'Work', 'Other'];

function AddressCard({ addr, onDelete, onSetDefault }: any) {
  const isDefault = addr.isDefault;
  return (
    <View style={[styles.addrCard, isDefault && styles.addrCardDefault]}>
      <View style={styles.addrRow}>
        <View style={[styles.labelBadge, { backgroundColor: isDefault ? '#FF4500' : '#F0F0F0' }]}>
          <Text style={[styles.labelText, { color: isDefault ? '#fff' : '#555' }]}>
            {addr.label || 'Address'}
          </Text>
        </View>
        {isDefault && <Text style={styles.defaultTag}>✓ Default</Text>}
      </View>
      <Text style={styles.addrStreet}>{addr.streetAddress}</Text>
      {addr.city && <Text style={styles.addrCity}>{addr.city}{addr.postalCode ? `, ${addr.postalCode}` : ''}</Text>}
      <View style={styles.addrActions}>
        {!isDefault && (
          <TouchableOpacity style={styles.setDefaultBtn} onPress={() => onSetDefault(addr.id)}>
            <Text style={styles.setDefaultText}>Set as Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(addr.id)}>
          <Text style={styles.deleteText}>🗑 Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SavedAddressesScreen({ navigation }: any) {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: 'Home', streetAddress: '', city: 'Karachi', postalCode: '' });
  const [saving, setSaving] = useState(false);

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await addressesApi.getAll();
      setAddresses(res.data || []);
    } catch (e) {
      console.error('Fetch addresses error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const onRefresh = () => { setRefreshing(true); fetchAddresses(); };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await addressesApi.delete(id);
            await fetchAddresses();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete address.');
          }
        }
      }
    ]);
  };

  const handleSetDefault = async (id: string) => {
    try {
      await addressesApi.setDefault(id);
      await fetchAddresses();
    } catch (e) {
      Alert.alert('Error', 'Failed to set default address.');
    }
  };

  const handleAddAddress = async () => {
    if (!newAddr.streetAddress.trim()) {
      Alert.alert('Validation', 'Please enter a street address.');
      return;
    }
    setSaving(true);
    try {
      await addressesApi.create({
        ...newAddr,
        latitude: 24.8607,
        longitude: 67.0011,
        isDefault: addresses.length === 0,
      });
      setShowAddModal(false);
      setNewAddr({ label: 'Home', streetAddress: '', city: 'Karachi', postalCode: '' });
      await fetchAddresses();
    } catch (e) {
      Alert.alert('Error', 'Failed to add address.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#FF4500" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Saved Addresses</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {addresses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyTitle}>No addresses saved</Text>
          <Text style={styles.emptySubtitle}>Add a delivery address to get started.</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => setShowAddModal(true)}>
            <Text style={styles.shopBtnText}>Add Address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF4500" />}
          renderItem={({ item }) => (
            <AddressCard addr={item} onDelete={handleDelete} onSetDefault={handleSetDefault} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add New Address</Text>
            
            <Text style={styles.inputLabel}>Label</Text>
            <View style={styles.labelRow}>
              {LABEL_OPTIONS.map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.labelChip, newAddr.label === l && styles.labelChipActive]}
                  onPress={() => setNewAddr({ ...newAddr, label: l })}
                >
                  <Text style={[styles.labelChipText, newAddr.label === l && styles.labelChipTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Street Address *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. House 12, Block 5, Gulshan-e-Iqbal"
              value={newAddr.streetAddress}
              onChangeText={(v) => setNewAddr({ ...newAddr, streetAddress: v })}
              placeholderTextColor="#bbb"
            />

            <Text style={styles.inputLabel}>City</Text>
            <TextInput
              style={styles.textInput}
              placeholder="City"
              value={newAddr.city}
              onChangeText={(v) => setNewAddr({ ...newAddr, city: v })}
              placeholderTextColor="#bbb"
            />

            <Text style={styles.inputLabel}>Postal Code</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 75500"
              value={newAddr.postalCode}
              keyboardType="numeric"
              onChangeText={(v) => setNewAddr({ ...newAddr, postalCode: v })}
              placeholderTextColor="#bbb"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelModal} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddAddress} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Address</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#F5F5F5' },
  backIcon: { fontSize: 20, color: '#333' },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  addBtn: { backgroundColor: '#FF4500', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  addrCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  addrCardDefault: { borderColor: '#FF4500' },
  addrRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  labelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 8 },
  labelText: { fontSize: 12, fontWeight: '700' },
  defaultTag: { fontSize: 12, color: '#FF4500', fontWeight: '600' },
  addrStreet: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 },
  addrCity: { fontSize: 13, color: '#888' },
  addrActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  setDefaultBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#FF4500' },
  setDefaultText: { color: '#FF4500', fontSize: 12, fontWeight: '700' },
  deleteBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#EF4444' },
  deleteText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#888', textAlign: 'center' },
  shopBtn: { marginTop: 24, backgroundColor: '#FF4500', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  shopBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },
  textInput: {
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1A1A1A', marginBottom: 16, backgroundColor: '#FAFAFA',
  },
  labelRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  labelChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#E0E0E0' },
  labelChipActive: { backgroundColor: '#FF4500', borderColor: '#FF4500' },
  labelChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  labelChipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelModal: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', alignItems: 'center' },
  cancelModalText: { fontSize: 15, fontWeight: '700', color: '#555' },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: '#FF4500', alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
