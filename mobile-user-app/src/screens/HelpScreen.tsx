import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Linking, Alert
} from 'react-native';

const FAQ = [
  { q: 'How do I track my order?', a: 'Go to My Orders and tap "Track Order" to see real-time updates.' },
  { q: 'What is the delivery time?', a: 'We deliver within 30–60 minutes depending on your location within the delivery zone.' },
  { q: 'Can I cancel my order?', a: 'You can cancel an order while it is in "Pending" status. Go to My Orders and tap Cancel.' },
  { q: 'Do you deliver to my area?', a: 'We currently deliver within a 50km radius. Enter your address at checkout to verify.' },
  { q: 'What payment methods do you accept?', a: 'We currently accept Cash on Delivery (COD) and card payments at checkout.' },
  { q: 'How do I change my delivery address?', a: 'Tap "Saved Addresses" in your profile to add or modify your delivery locations.' },
];

const CONTACT = [
  { icon: '📞', label: 'Call Support', value: '+92 21 111 222 333', action: () => Linking.openURL('tel:+922111222333') },
  { icon: '💬', label: 'WhatsApp', value: '+92 316 0007564', action: () => Linking.openURL('https://wa.me/03160007564') },
  { icon: '✉️', label: 'Email Us', value: 'support@baldiamart.pk', action: () => Linking.openURL('mailto:support@baldiamart.pk') },
];

function FAQItem({ item }: any) {
  const [open, setOpen] = React.useState(false);
  return (
    <TouchableOpacity style={styles.faqItem} onPress={() => setOpen(!open)} activeOpacity={0.8}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQ}>{item.q}</Text>
        <Text style={[styles.faqChevron, open && { transform: [{ rotate: '90deg' }] }]}>›</Text>
      </View>
      {open && <Text style={styles.faqA}>{item.a}</Text>}
    </TouchableOpacity>
  );
}

export default function HelpScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Quick Contact */}
        <Text style={styles.sectionTitle}>Contact Us</Text>
        <View style={styles.contactCard}>
          {CONTACT.map((c, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.contactRow, i < CONTACT.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }]}
              onPress={c.action}
              activeOpacity={0.7}
            >
              <View style={styles.contactIconBox}>
                <Text style={styles.contactIcon}>{c.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactLabel}>{c.label}</Text>
                <Text style={styles.contactValue}>{c.value}</Text>
              </View>
              <Text style={styles.contactArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQ */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Frequently Asked Questions</Text>
        <View style={styles.faqCard}>
          {FAQ.map((item, i) => <FAQItem key={i} item={item} />)}
        </View>

        {/* App Info */}
        <View style={styles.appInfoCard}>
          <Text style={styles.appInfoTitle}>🛒 Baldia Mart</Text>
          <Text style={styles.appInfoSub}>Hyperlocal delivery made easy</Text>
          <Text style={styles.appInfoVersion}>Version 1.0.0 · Karachi, Pakistan</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#F5F5F5' },
  backIcon: { fontSize: 20, color: '#333' },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  contactCard: {
    backgroundColor: '#fff', borderRadius: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  contactIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF5F0', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  contactIcon: { fontSize: 20 },
  contactLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  contactValue: { fontSize: 12, color: '#888', marginTop: 2 },
  contactArrow: { fontSize: 22, color: '#CCC' },
  faqCard: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  faqItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1A1A', lineHeight: 20, marginRight: 8 },
  faqChevron: { fontSize: 22, color: '#CCC', fontWeight: '300' },
  faqA: { fontSize: 13, color: '#666', lineHeight: 20, marginTop: 10 },
  appInfoCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginTop: 24,
    alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  appInfoTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  appInfoSub: { fontSize: 13, color: '#888', marginTop: 4 },
  appInfoVersion: { fontSize: 12, color: '#CCC', marginTop: 8 },
});
