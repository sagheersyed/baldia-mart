import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ActivityIndicator, Alert, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ridersApi } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ navigation }: any) {
  const { logout } = useAuth();
  const [rider, setRider] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const [profileRes, statsRes] = await Promise.all([
        ridersApi.getMe(),
        ridersApi.getStats()
      ]);
      setRider(profileRes.data);
      setStats(statsRes.data);
    } catch (e) {
      console.error('Fetch profile error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of your session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() }
    ]);
  };

  if (loading) return (
    <View style={styles.centered}><ActivityIndicator size="large" color="#FF4500" /></View>
  );

  const isVerified = rider?.isActive && rider?.isProfileComplete;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* --- Header Section --- */}
        <View style={styles.hero}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTxt}>{rider?.name?.[0]?.toUpperCase() || 'R'}</Text>
            </View>
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
              </View>
            )}
          </View>
          <Text style={styles.userName}>{rider?.name || 'Rider'}</Text>
          <Text style={styles.userPhone}>{rider?.phoneNumber}</Text>
          <View style={styles.statusChip}>
            <View style={[styles.statusDot, { backgroundColor: isVerified ? '#27ae60' : '#e67e22' }]} />
            <Text style={styles.statusTxt}>{isVerified ? 'Verified Account' : 'Pending Verification'}</Text>
          </View>
        </View>

        {/* --- Stats Grid --- */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{stats?.rating?.toFixed(1) || '5.0'}</Text>
            <Text style={styles.statLabel}>⭐ Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{stats?.completionRate || 100}%</Text>
            <Text style={styles.statLabel}>🎯 Success</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{stats?.totalDeliveries || 0}</Text>
            <Text style={styles.statLabel}>📦 Trips</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="bicycle-outline" size={20} color="#666" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.infoLabel}>Vehicle Type</Text>
                <Text style={styles.infoVal}>{rider?.vehicleType || 'Motorcycle'}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="card-outline" size={20} color="#666" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.infoLabel}>Plate Number</Text>
                <Text style={styles.infoVal}>{rider?.vehicleNumber || 'KDL-1234'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Document Status</Text>
          <View style={styles.infoCard}>
            <View style={styles.docRow}>
              <Text style={styles.docLabel}>CNIC Verification</Text>
              <Text style={[styles.docStatus, { color: isVerified ? '#27ae60' : '#e67e22' }]}>
                {isVerified ? 'APPROVED' : 'PENDING'}
              </Text>
            </View>
            <View style={styles.docRow}>
              <Text style={styles.docLabel}>Driving License</Text>
              <Text style={[styles.docStatus, { color: isVerified ? '#27ae60' : '#e67e22' }]}>
                {isVerified ? 'APPROVED' : 'PENDING'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <View style={styles.menuBox}>
            <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('OrderHistory')}>
              <Ionicons name="time-outline" size={22} color="#1E1E1E" />
              <Text style={styles.menuTxt}>Delivery History</Text>
              <Ionicons name="chevron-forward" size={18} color="#CCC" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('Wallet')}>
              <Ionicons name="wallet-outline" size={22} color="#1E1E1E" />
              <Text style={styles.menuTxt}>Earnings & Wallet</Text>
              <Ionicons name="chevron-forward" size={18} color="#CCC" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuBtn} onPress={() => Alert.alert('Support', 'Call us at 0315-0258004')}>
              <Ionicons name="help-circle-outline" size={22} color="#1E1E1E" />
              <Text style={styles.menuTxt}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={18} color="#CCC" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#ff4d4d" />
          <Text style={styles.logoutTxt}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionTxt}>Baldia Mart Rider App v2.4.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  hero: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#fff', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, elevation: 2 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FF450015', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FF450010' },
  avatarTxt: { fontSize: 36, fontWeight: '900', color: '#FF4500' },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#27ae60', borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 24, fontWeight: '800', color: '#1A1A1A' },
  userPhone: { fontSize: 14, color: '#666', marginTop: 4 },
  statusChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F0F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusTxt: { fontSize: 12, fontWeight: '700', color: '#555' },

  statsGrid: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 20, marginTop: -25, borderRadius: 20, padding: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '900', color: '#1A1A1A' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 4, fontWeight: '600' },
  statDivider: { width: 1, height: 30, backgroundColor: '#EEE' },

  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 12, marginLeft: 4 },
  infoCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  infoLabel: { fontSize: 11, color: '#999', fontWeight: '600' },
  infoVal: { fontSize: 15, fontWeight: '700', color: '#333', marginTop: 2 },
  
  docRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  docLabel: { fontSize: 14, color: '#555', fontWeight: '600' },
  docStatus: { fontSize: 11, fontWeight: '900' },

  menuBox: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', elevation: 2 },
  menuBtn: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  menuTxt: { flex: 1, marginLeft: 14, fontSize: 15, fontWeight: '600', color: '#1A1A1A' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginTop: 32, padding: 18, borderRadius: 20, backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#FFDADA' },
  logoutTxt: { marginLeft: 8, fontSize: 16, fontWeight: '700', color: '#ff4d4d' },

  versionTxt: { textAlign: 'center', color: '#CCC', fontSize: 12, marginVertical: 32, fontWeight: '600' },
});
