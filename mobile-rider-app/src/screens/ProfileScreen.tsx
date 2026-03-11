import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';

export default function ProfileScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rider Profile</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.profileBox}>
          <View style={styles.avatar}></View>
          <View>
            <Text style={styles.name}>Zain Ali</Text>
            <Text style={styles.phone}>Honda CD70 • LXY-1234</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>4.9/5</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>452</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>100%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
        </View>

        <View style={styles.menuList}>
          {['Earnings History', 'Vehicle Registration', 'Help & Support'].map((item, idx) => (
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
  header: { padding: 20, backgroundColor: '#1E1E1E' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: { flex: 1, padding: 20 },
  profileBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#fff', padding: 20, borderRadius: 15 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e0e0e0', marginRight: 15 },
  name: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  phone: { color: '#666' },
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
