import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { authApi, addressesApi } from '../api/api';

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [address, setAddress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const [userRes, addrRes] = await Promise.all([
        authApi.getMe(),
        addressesApi.getAll()
      ]);
      setUser(userRes.data);
      if (addrRes.data && addrRes.data.length > 0) {
        setAddress(addrRes.data.find((a: any) => a.isDefault) || addrRes.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#FF4500" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
        <TouchableOpacity onPress={fetchProfile}>
          <Text style={{ color: '#FF4500', fontWeight: 'bold' }}>Sync</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.profileBox}>
          <View style={styles.avatar}></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name || 'User'}</Text>
            <Text style={styles.phone}>{user?.email || 'No email set'}</Text>
            {address && (
              <Text style={{ fontSize: 12, color: '#999', marginTop: 5 }}>
                📍 {address.label}: {address.streetAddress}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.menuList}>
          {['My Orders', 'Saved Addresses', 'Payment Methods', 'Notifications', 'Help & Support'].map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.menuItem}>
              <Text style={styles.menuText}>{item}</Text>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.logoutBtn}
          onPress={() => navigation.replace('Login')}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, padding: 20 },
  profileBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 30, backgroundColor: '#fff', padding: 20, borderRadius: 15 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e0e0e0', marginRight: 15 },
  name: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  phone: { color: '#666' },
  menuList: { backgroundColor: '#fff', borderRadius: 15, overflow: 'hidden', marginBottom: 30 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuText: { fontSize: 16, color: '#333' },
  arrow: { color: '#ccc', fontSize: 18 },
  logoutBtn: { backgroundColor: '#fff', padding: 18, borderRadius: 15, alignItems: 'center' },
  logoutText: { color: '#ff3b30', fontSize: 16, fontWeight: 'bold' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
