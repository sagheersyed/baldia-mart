import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { ridersApi } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ navigation }: any) {
  const { logout } = useAuth();
  const [rider, setRider] = React.useState<any>(null);
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
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
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Log Out', 
        style: 'destructive', 
        onPress: () => logout()
      }
    ]);
  };

  const showEarnings = () => {
    Alert.alert(
      'Earnings History',
      `Your total lifetime earnings: Rs. ${rider?.totalEarnings || 0}\n\nIndividual order history is coming soon in the next update!`,
      [{ text: 'Dismiss' }]
    );
  };

  const showVehicle = () => {
    Alert.alert(
      'Vehicle Registration',
      `Vehicle Type: ${rider?.vehicleType || 'N/A'}\nVehicle Number: ${rider?.vehicleNumber || 'N/A'}\n\nStatus: Verified and Active`,
      [{ text: 'OK' }]
    );
  };

  const showHelp = () => {
    Alert.alert(
      'Help & Support',
      'Need assistance? Contact our support team:\n\n📞 0315-0258004\n📧 support@baldiamart.pk\n\nWe are available 24/7!',
      [{ text: 'Got it' }]
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FF4500" />
      </View>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rider Profile</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.profileBox}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{rider?.name?.[0] || 'R'}</Text>
          </View>
          <View>
            <Text style={styles.name}>{rider?.name || 'Rider'}</Text>
            <Text style={styles.phone}>{rider?.vehicleType || 'Vehicle'} • {rider?.vehicleNumber || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{stats?.rating || '4.9'}/5</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{stats?.totalDeliveries || 0}</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{stats?.completionRate || 100}%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
        </View>

        <View style={styles.menuList}>
          <TouchableOpacity style={styles.menuItem} onPress={showEarnings}>
            <Text style={styles.menuText}>Earnings History</Text>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={showVehicle}>
            <Text style={styles.menuText}>Vehicle Registration</Text>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={showHelp}>
            <Text style={styles.menuText}>Help & Support</Text>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { padding: 20, backgroundColor: '#1E1E1E' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: { flex: 1, padding: 20 },
  profileBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#fff', padding: 20, borderRadius: 15 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FF450015', marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FF4500', fontWeight: 'bold', fontSize: 24 },
  name: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  phone: { color: '#666' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  statBox: { flex: 1, backgroundColor: '#fff', padding: 15, borderRadius: 12, alignItems: 'center', marginHorizontal: 5 },
  statVal: { fontSize: 18, fontStyle: 'italic', fontWeight: 'bold', color: '#1E1E1E', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#888' },
  menuList: { backgroundColor: '#fff', borderRadius: 15, overflow: 'hidden', marginBottom: 30 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuText: { fontSize: 16, color: '#333' },
  arrow: { color: '#ccc', fontSize: 18 },
  logoutBtn: { backgroundColor: '#fff', padding: 18, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#ff3b30' },
  logoutText: { color: '#ff3b30', fontSize: 16, fontWeight: 'bold' }
});
