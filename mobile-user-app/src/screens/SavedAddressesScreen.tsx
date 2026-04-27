import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, Pressable, ActivityIndicator,
  Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { addressesApi } from '../api/api';
import AddressPickerModal from '../components/AddressPickerModal';
import {
  AppText, AppButton, AppIconButton, AppBadge, EmptyState,
} from '../components/ui';
import { theme } from '../theme/theme';

function AddressCard({ addr, onDelete, onSetDefault, onEdit }: any) {
  const isDefault = addr.isDefault;
  const labelKey = (addr.label || '').toLowerCase();
  const icon: keyof typeof Ionicons.glyphMap =
    labelKey === 'work' ? 'business-outline'
      : labelKey === 'home' ? 'home-outline'
        : 'location-outline';

  return (
    <View style={[styles.addrCard, isDefault ? styles.addrCardDefault : null]}>
      <View style={styles.addrTop}>
        <View style={[styles.addrIcon, { backgroundColor: theme.colors.primaryLight }]}>
          <Ionicons name={icon} size={18} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText variant="bodyStrong">{addr.label || 'Address'}</AppText>
            {isDefault ? <AppBadge label="Default" variant="primary" /> : null}
          </View>
          <AppText variant="caption" numberOfLines={3}>
            {addr.streetAddress}
            {addr.city ? `, ${addr.city}` : ''}
            {addr.postalCode ? ` ${addr.postalCode}` : ''}
          </AppText>
        </View>
        <AppIconButton size={32} bg={theme.colors.surfaceMuted} onPress={() => onEdit(addr)}>
          <Ionicons name="create-outline" size={16} color={theme.colors.textPrimary} />
        </AppIconButton>
      </View>

      <View style={styles.addrActions}>
        {!isDefault ? (
          <AppButton
            label="Set as default"
            variant="outline"
            size="sm"
            tint={theme.colors.primary}
            textColor={theme.colors.primary}
            onPress={() => onSetDefault(addr.id)}
            leadingIcon={<Ionicons name="checkmark-circle-outline" size={14} color={theme.colors.primary} />}
            style={{ flex: 1 }}
            fullWidth
          />
        ) : <View style={{ flex: 1 }} />}
        <AppButton
          label="Delete"
          variant="outline"
          size="sm"
          tint={theme.colors.danger}
          textColor={theme.colors.danger}
          onPress={() => onDelete(addr.id)}
          leadingIcon={<Ionicons name="trash-outline" size={14} color={theme.colors.danger} />}
        />
      </View>
    </View>
  );
}

export default function SavedAddressesScreen({ navigation }: any) {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await addressesApi.getAll();
      setAddresses(res.data || []);
    } catch {
      // noop
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const onRefresh = () => { setRefreshing(true); fetchAddresses(); };

  const handleDelete = (id: string) => {
    Alert.alert('Delete address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await addressesApi.delete(id);
            await fetchAddresses();
          } catch {
            Alert.alert('Error', 'Failed to delete address.');
          }
        },
      },
    ]);
  };

  const handleSetDefault = async (id: string) => {
    try {
      await addressesApi.setDefault(id);
      await fetchAddresses();
    } catch {
      Alert.alert('Error', 'Failed to set default address.');
    }
  };

  const handleSaveAddress = async (addrData: any) => {
    try {
      if (editingAddress?.id) {
        await addressesApi.update(editingAddress.id, addrData);
      } else {
        await addressesApi.create({ ...addrData, isDefault: addresses.length === 0 });
      }
      setShowAddModal(false);
      setEditingAddress(null);
      await fetchAddresses();
    } catch {
      Alert.alert('Error', 'Failed to save address.');
    }
  };

  const handleEdit = (addr: any) => {
    setEditingAddress(addr);
    setShowAddModal(true);
  };

  const handleAddNew = () => {
    setEditingAddress(null);
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
        <View style={{ flex: 1 }}>
          <AppText variant="h2">Saved addresses</AppText>
          <AppText variant="caption">{addresses.length} {addresses.length === 1 ? 'address' : 'addresses'} saved</AppText>
        </View>
        <AppButton
          label="+ Add"
          variant="primary"
          size="sm"
          onPress={handleAddNew}
        />
      </View>

      {addresses.length === 0 ? (
        <EmptyState
          icon="location-outline"
          title="No addresses saved"
          subtitle="Add a delivery address to start ordering."
          actionLabel="Add address"
          onAction={handleAddNew}
        />
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
          renderItem={({ item }) => (
            <AddressCard
              addr={item}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
              onEdit={handleEdit}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
        />
      )}

      <AddressPickerModal
        visible={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingAddress(null); }}
        onSave={handleSaveAddress}
        initialData={editingAddress}
        title={editingAddress ? 'Edit address' : 'Add new address'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },

  addrCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1.5, borderColor: theme.colors.divider,
    ...theme.shadows.sm,
  },
  addrCardDefault: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },

  addrTop: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
  addrIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

  addrActions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md },
});
