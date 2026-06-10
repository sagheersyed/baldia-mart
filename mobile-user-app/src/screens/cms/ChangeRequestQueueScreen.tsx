import React, { useEffect, useState, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, Pressable,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCmsStore } from '../../store/cmsStore';
import { cmsApi } from '../../api/api';
import { AppText } from '../../components/ui';
import { theme } from '../../theme/theme';

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  draft:         { label: 'Draft',          color: '#64748B', bg: '#F1F5F9', icon: 'document-outline' },
  submitted:     { label: 'Submitted',      color: '#2563EB', bg: '#EFF6FF', icon: 'arrow-up-circle-outline' },
  under_review:  { label: 'Under Review',   color: '#D97706', bg: '#FFFBEB', icon: 'eye-outline' },
  approved:      { label: 'Approved',       color: '#16A34A', bg: '#F0FDF4', icon: 'checkmark-circle-outline' },
  auto_approved: { label: 'Auto Approved',  color: '#059669', bg: '#ECFDF5', icon: 'checkmark-done-circle-outline' },
  published:     { label: 'Published',      color: '#16A34A', bg: '#F0FDF4', icon: 'checkmark-circle-outline' },
  rejected:      { label: 'Rejected',       color: '#DC2626', bg: '#FEF2F2', icon: 'close-circle-outline' },
};

const FILTERS = [
  { key: 'all',      label: 'All',      statuses: [] as string[] },
  { key: 'pending',  label: 'Pending',  statuses: ['submitted', 'under_review'] },
  { key: 'approved', label: 'Approved', statuses: ['approved', 'auto_approved', 'published'] },
  { key: 'rejected', label: 'Rejected', statuses: ['rejected'] },
];

export default function ChangeRequestQueueScreen({ route, navigation }: any) {
  const { activeTenant } = useCmsStore();
  const tenantId = activeTenant?.tenantId ?? '';
  const initialFilter = route.params?.filterStatus ?? 'all';

  const [requests, setRequests]   = useState<any[]>([]);
  const [filtered, setFiltered]   = useState<any[]>([]);
  const [activeFilter, setFilter] = useState(initialFilter);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await cmsApi.getChangeRequests(tenantId, { limit: 100 });
      const data: any[] = res.data?.data ?? res.data ?? [];
      setRequests(data);
      applyFilter(data, activeFilter);
    } catch (e) {
      console.warn('[CRQueue] load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantId]);

  const applyFilter = (data: any[], filterKey: string) => {
    const filter = FILTERS.find(f => f.key === filterKey);
    if (!filter || filter.statuses.length === 0) {
      setFiltered(data);
    } else {
      setFiltered(data.filter(r => filter.statuses.includes(r.status)));
    }
  };

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const onFilter = (status: string) => {
    setFilter(status);
    applyFilter(requests, status);
  };

  const renderItem = ({ item }: { item: any }) => {
    const meta = STATUS_META[item.status] ?? STATUS_META.draft;
    const date = new Date(item.createdAt ?? item.created_at ?? '');
    const dateStr = isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
    const timeStr = isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

    // Build a human-readable summary of what changed
    const patches: any[] = Array.isArray(item.patchData) ? item.patchData : [];
    const changeSummary = patches.map((p: any) => {
      const field = p.path?.replace('/', '') ?? '';
      if (field === 'price') return `Price: Rs.${p.oldValue} → Rs.${p.value}`;
      if (field === 'stockQty') return `Stock: ${p.oldValue} → ${p.value}`;
      if (field === 'isAvailable') return `Availability: ${p.value ? 'Live' : 'Hidden'}`;
      return `${field}: ${p.value}`;
    }).join(' · ');

    return (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate('ChangeRequestDetail', { crId: item.id })}
      >
        <View style={[styles.statusBar, { backgroundColor: meta.color }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={12} color={meta.color} />
              <AppText variant="badge" color={meta.color}>{meta.label}</AppText>
            </View>
            <AppText variant="caption" color={theme.colors.textMuted}>{dateStr} · {timeStr}</AppText>
          </View>
          <AppText variant="bodyStrong" style={{ marginTop: 4 }} numberOfLines={1}>
            {item.preChangeSnapshot?.name ?? item.patchData?.name ?? item.entityType} — {item.actionType}
          </AppText>
          {changeSummary ? (
            <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={2} style={{ marginTop: 2 }}>
              {changeSummary}
            </AppText>
          ) : null}
          {item.status === 'rejected' && item.rejectionReason ? (
            <View style={styles.rejectionRow}>
              <Ionicons name="alert-circle-outline" size={13} color="#DC2626" />
              <AppText variant="caption" color="#DC2626" numberOfLines={2}>{item.rejectionReason}</AppText>
            </View>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} style={{ marginTop: 4 }} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="h3">Change Requests</AppText>
          <AppText variant="caption" color={theme.colors.textMuted}>{activeTenant?.name}</AppText>
        </View>
        <AppText variant="caption" color={theme.colors.textMuted}>{filtered.length} items</AppText>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => {
          const count = f.statuses.length > 0
            ? requests.filter(r => f.statuses.includes(r.status)).length
            : requests.length;
          return (
            <Pressable
              key={f.key}
              style={[styles.filterTab, activeFilter === f.key && styles.filterTabActive]}
              onPress={() => onFilter(f.key)}
            >
              <AppText
                variant="caption"
                color={activeFilter === f.key ? theme.colors.primary : theme.colors.textMuted}
                style={{ fontFamily: activeFilter === f.key ? 'Poppins_600SemiBold' : 'Poppins_400Regular' }}
              >
                {f.label} ({count})
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: theme.spacing.lg, gap: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color={theme.colors.textMuted} />
              <AppText variant="body" color={theme.colors.textMuted} align="center" style={{ marginTop: 12 }}>
                No change requests found
              </AppText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },
  backBtn: { padding: 4 },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
    gap: 6,
  },
  filterTab: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: theme.radius.md,
    backgroundColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: theme.colors.primaryLight,
  },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1, borderColor: theme.colors.divider,
    ...theme.shadows.sm,
  },
  statusBar: { width: 4 },
  cardContent: { flex: 1, padding: 14, gap: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  rejectionRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4,
  },
});
