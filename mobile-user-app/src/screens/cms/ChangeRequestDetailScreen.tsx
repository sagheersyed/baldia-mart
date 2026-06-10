import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCmsStore } from '../../store/cmsStore';
import { cmsApi } from '../../api/api';
import { AppText } from '../../components/ui';
import { theme } from '../../theme/theme';

const STATUS_META: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  draft:         { label: 'Draft',         color: '#64748B', icon: 'document-outline' },
  submitted:     { label: 'Submitted',     color: '#2563EB', icon: 'arrow-up-circle-outline' },
  under_review:  { label: 'Under Review',  color: '#D97706', icon: 'eye-outline' },
  approved:      { label: 'Approved',      color: '#16A34A', icon: 'checkmark-circle-outline' },
  auto_approved: { label: 'Auto Approved', color: '#059669', icon: 'checkmark-done-circle-outline' },
  published:     { label: 'Published',     color: '#16A34A', icon: 'checkmark-circle-outline' },
  rejected:      { label: 'Rejected',      color: '#DC2626', icon: 'close-circle-outline' },
};

const TIMELINE = ['draft', 'submitted', 'under_review', 'published'];

export default function ChangeRequestDetailScreen({ route, navigation }: any) {
  const { crId } = route.params as { crId: string };
  const { activeTenant } = useCmsStore();
  const tenantId = activeTenant?.tenantId ?? '';

  const [cr, setCr]     = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cmsApi.getChangeRequestDetail(tenantId, crId)
      .then(res => setCr(res.data))
      .catch(e => console.warn('[CRDetail]', e))
      .finally(() => setLoading(false));
  }, [crId, tenantId]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!cr) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
          </Pressable>
          <AppText variant="h3">Request Details</AppText>
        </View>
        <View style={styles.loader}>
          <AppText variant="body" color={theme.colors.textMuted}>Could not load request.</AppText>
        </View>
      </SafeAreaView>
    );
  }

  const meta     = STATUS_META[cr.status] ?? STATUS_META.draft;
  const patches: any[] = Array.isArray(cr.patchData) ? cr.patchData : [];
  const date = new Date(cr.createdAt ?? cr.created_at ?? '');
  const dateStr  = isNaN(date.getTime()) ? '—' : date.toLocaleString('en-PK');
  const isRejected = cr.status === 'rejected';
  const isAutoApproved = cr.status === 'auto_approved';
  // auto_approved skips under_review and maps to the published step
  const currentStep = isAutoApproved
    ? TIMELINE.indexOf('published')
    : TIMELINE.indexOf(cr.status);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="h3">Request Details</AppText>
          <AppText variant="caption" color={theme.colors.textMuted}>{cr.id?.slice(0, 8)}…</AppText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.color + '18' }]}>
          <Ionicons name={meta.icon} size={14} color={meta.color} />
          <AppText variant="badge" color={meta.color}>{meta.label}</AppText>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: theme.spacing.lg, gap: 16, paddingBottom: 40 }}>

        {/* Status Timeline */}
        {!isRejected && (
          <View style={styles.section}>
            <AppText variant="overline" style={styles.sectionLabel}>Progress</AppText>
            <View style={styles.timeline}>
              {TIMELINE.map((step, i) => {
                const stepMeta = STATUS_META[step];
                const isDone   = currentStep >= i;
                const isActive = currentStep === i;
                return (
                  <React.Fragment key={step}>
                    <View style={styles.timelineStep}>
                      <View style={[
                        styles.timelineDot,
                        { backgroundColor: isDone ? stepMeta.color : theme.colors.divider },
                        isActive && styles.timelineDotActive,
                      ]}>
                        {isDone && <Ionicons name="checkmark" size={10} color="#fff" />}
                      </View>
                      <AppText
                        variant="caption"
                        color={isDone ? stepMeta.color : theme.colors.textMuted}
                        style={{ textAlign: 'center', marginTop: 4 }}
                      >
                        {stepMeta.label}
                      </AppText>
                    </View>
                    {i < TIMELINE.length - 1 && (
                      <View style={[styles.timelineLine, { backgroundColor: currentStep > i ? theme.colors.primary : theme.colors.divider }]} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        )}

        {/* Rejection banner */}
        {isRejected && cr.rejectionReason && (
          <View style={styles.rejectionBanner}>
            <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong" color="#DC2626">Rejected by Admin</AppText>
              <AppText variant="caption" color="#7F1D1D" style={{ marginTop: 2 }}>{cr.rejectionReason}</AppText>
            </View>
          </View>
        )}

        {/* Meta info */}
        <View style={styles.section}>
          <AppText variant="overline" style={styles.sectionLabel}>Details</AppText>
          <View style={styles.card}>
            {(cr.preChangeSnapshot?.name || cr.patchData?.name) && (
              <MetaRow label="Item Name" value={cr.preChangeSnapshot?.name ?? cr.patchData?.name} />
            )}
            <MetaRow label="Entity Type" value={cr.entityType} />
            <MetaRow label="Action"      value={cr.actionType} />
            <MetaRow label="Submitted"   value={dateStr} />
          </View>
        </View>

        {/* Changes diff */}
        {patches.length > 0 && (
          <View style={styles.section}>
            <AppText variant="overline" style={styles.sectionLabel}>Changes</AppText>
            <View style={styles.diffCard}>
              {patches.map((p: any, i: number) => {
                const field = (p.path ?? '').replace('/', '');
                const isPrice = field === 'price';
                const formatVal = (v: any) => {
                  if (isPrice) return `Rs. ${Number(v).toLocaleString()}`;
                  return String(v);
                };
                return (
                  <View key={i} style={[styles.diffRow, i < patches.length - 1 && styles.diffRowBorder]}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="overline" style={{ fontSize: 9 }}>{field.toUpperCase()}</AppText>
                      <View style={styles.diffValues}>
                        {p.oldValue !== undefined && (
                          <>
                            <View style={styles.oldValueBadge}>
                              <AppText variant="caption" color="#7F1D1D">{formatVal(p.oldValue)}</AppText>
                            </View>
                            <Ionicons name="arrow-forward" size={14} color={theme.colors.textMuted} />
                          </>
                        )}
                        <View style={styles.newValueBadge}>
                          <AppText variant="caption" color="#14532D">{formatVal(p.value)}</AppText>
                        </View>
                      </View>
                    </View>
                    {isPrice && p.oldValue !== undefined && (
                      <View style={styles.pctBadge}>
                        <AppText variant="badge" color={Number(p.value) > Number(p.oldValue) ? '#D97706' : '#16A34A'}>
                          {((Math.abs(Number(p.value) - Number(p.oldValue)) / Number(p.oldValue)) * 100).toFixed(1)}%
                        </AppText>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <AppText variant="caption" color={theme.colors.textMuted}>{label}</AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },
  backBtn: { padding: 4 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },

  section: { gap: 8 },
  sectionLabel: {},

  timeline: { flexDirection: 'row', alignItems: 'flex-start', gap: 0 },
  timelineStep: { alignItems: 'center', width: 68 },
  timelineDot: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineDotActive: { borderWidth: 2.5, borderColor: 'white', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  timelineLine: { flex: 1, height: 2, marginTop: 10 },

  rejectionBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    padding: 14, borderRadius: theme.radius.lg,
    borderLeftWidth: 3, borderLeftColor: '#DC2626',
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.colors.divider,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  metaRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },

  diffCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.colors.divider,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  diffRow: { paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  diffRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  diffValues: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  oldValueBadge: {
    backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  newValueBadge: {
    backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  pctBadge: {
    backgroundColor: '#FEF9C3', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
});
