import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { settingsApi } from '../api/api';

const APP_VERSION = '1.0.0';

const FEATURES = [
  '🛒 Grocery delivery from local mart',
  '🍽️ Food ordering from restaurants',
  '🏬 Shop from top brands',
  '🚴 Real-time rider tracking',
  '⭐ Rate your experience',
  '❤️ Save your favourites',
  '🔔 Order status notifications',
];

const DEFAULT_CONTACT = [
  { icon: '📧', label: 'Email', value: 'support@baldiamart.pk', action: () => Linking.openURL('mailto:support@baldiamart.pk') },
  { icon: '📞', label: 'Phone', value: '+92 300 0000000', action: () => Linking.openURL('tel:+923000000000') },
];

const DEFAULT_SOCIAL = [
  { icon: '📘', label: 'Facebook', url: 'https://facebook.com/baldiamart' },
  { icon: '📸', label: 'Instagram', url: 'https://instagram.com/baldiamart' },
];

const LEGAL = [
  { label: 'Privacy Policy', url: 'https://baldiamart.pk/privacy' },
  { label: 'Terms of Service', url: 'https://baldiamart.pk/terms' },
];

export default function AboutScreen({ navigation }: any) {
  const [contactLinks, setContactLinks] = useState(DEFAULT_CONTACT);
  const [socialLinks, setSocialLinks] = useState(DEFAULT_SOCIAL);

  useFocusEffect(
    useCallback(() => {
      settingsApi.getPublicSettings().then(res => {
        const data = res.data;
        if (data) {
          const email = data.contact_email || 'support@baldiamart.pk';
          const phone = data.contact_phone || '+92 300 0000000';
          const fb = data.social_facebook || 'https://facebook.com/baldiamart';
          const insta = data.social_instagram || 'https://instagram.com/baldiamart';

          setContactLinks([
            { icon: '📧', label: 'Email', value: email, action: () => Linking.openURL(`mailto:${email}`) },
            { icon: '📞', label: 'Phone', value: phone, action: () => Linking.openURL(`tel:${phone}`) },
          ]);
          setSocialLinks([
            { icon: '📘', label: 'Facebook', url: fb },
            { icon: '📸', label: 'Instagram', url: insta },
          ]);
        }
      }).catch(err => console.error('Failed to load settings', err));
    }, [])
  );

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'Could not open link. Please try again.')
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About App</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🛒</Text>
          </View>
          <Text style={styles.appName}>
            <Text style={styles.appNameBold}>Baldia</Text>
            <Text style={styles.appNameAccent}>Mart</Text>
          </Text>
          <Text style={styles.tagline}>Your neighbourhood delivery app</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>Version {APP_VERSION}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What is BaldiaMart?</Text>
          <Text style={styles.description}>
            BaldiaMart is a hyperlocal delivery platform serving your community. Order groceries, meals from top restaurants, and products from your favourite brands — all delivered fast to your doorstep.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          {contactLinks.map((item, i) => (
            <TouchableOpacity key={i} style={styles.row} onPress={item.action} activeOpacity={0.7}>
              <Text style={styles.rowIcon}>{item.icon}</Text>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowValue}>{item.value}</Text>
              </View>
              <Text style={styles.rowChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Social */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Follow Us</Text>
          {socialLinks.map((item, i) => (
            <TouchableOpacity key={i} style={styles.row} onPress={() => openLink(item.url)} activeOpacity={0.7}>
              <Text style={styles.rowIcon}>{item.icon}</Text>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>{item.label}</Text>
              </View>
              <Text style={styles.rowChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          {LEGAL.map((item, i) => (
            <TouchableOpacity key={i} style={styles.row} onPress={() => openLink(item.url)} activeOpacity={0.7}>
              <Text style={styles.rowIcon}>📄</Text>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>{item.label}</Text>
              </View>
              <Text style={styles.rowChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Made with ❤️ in Pakistan • © 2025 BaldiaMart</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0', elevation: 3,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center',
  },
  backArrow: { fontSize: 22, color: '#333' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },

  scroll: { paddingBottom: 40 },

  hero: {
    alignItems: 'center', paddingVertical: 36,
    backgroundColor: '#fff', marginBottom: 12,
  },
  logoCircle: {
    width: 90, height: 90, borderRadius: 30,
    backgroundColor: '#FFF5F0', justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, elevation: 4, shadowColor: '#FF4500', shadowOpacity: 0.2, shadowRadius: 12,
  },
  logoEmoji: { fontSize: 44 },
  appName: { fontSize: 32, marginBottom: 6 },
  appNameBold: { fontWeight: '900', color: '#1A1A1A' },
  appNameAccent: { fontWeight: '900', color: '#FF4500' },
  tagline: { fontSize: 14, color: '#888', fontWeight: '500', marginBottom: 14 },
  versionBadge: {
    backgroundColor: '#FFF5F0', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6,
    borderWidth: 1, borderColor: '#FFD8C4',
  },
  versionText: { color: '#FF4500', fontSize: 13, fontWeight: '700' },

  section: { backgroundColor: '#fff', marginBottom: 12, paddingHorizontal: 20, paddingVertical: 18 },
  sectionTitle: {
    fontSize: 14, fontWeight: '800', color: '#888', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 14,
  },

  description: { fontSize: 15, color: '#444', lineHeight: 24 },

  featureRow: { paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  featureText: { fontSize: 15, color: '#333', fontWeight: '500' },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  rowIcon: { fontSize: 22, marginRight: 16, width: 32, textAlign: 'center' },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  rowValue: { fontSize: 13, color: '#888', marginTop: 2 },
  rowChevron: { fontSize: 22, color: '#CCC', fontWeight: '300' },

  footer: {
    textAlign: 'center', color: '#BBB', fontSize: 13,
    marginTop: 20, paddingHorizontal: 20, lineHeight: 22,
  },
});
