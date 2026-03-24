import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, FlatList, SafeAreaView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useFavourites } from '../hooks/useFavourites';
import { normalizeUrl } from '../api/api';

const TABS = ['Restaurants', 'Products'] as const;

export default function FavouritesScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'Restaurants' | 'Products'>('Restaurants');
  const { restaurants, products, toggleFavourite, reload } = useFavourites();

  // Reload when screen comes into focus
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const isEmpty = activeTab === 'Restaurants' ? restaurants.length === 0 : products.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Favourites</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'Restaurants' ? '🍽️' : '🛒'} {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isEmpty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{activeTab === 'Restaurants' ? '🍽️' : '🛒'}</Text>
          <Text style={styles.emptyTitle}>No favourites yet</Text>
          <Text style={styles.emptySub}>
            {activeTab === 'Restaurants'
              ? 'Tap the ❤️ on any restaurant to save it here'
              : 'Tap the ❤️ on any product to save it here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeTab === 'Restaurants' ? restaurants : products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const imgUri = normalizeUrl(item.logoUrl || item.imageUrl);
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => {
                  if (activeTab === 'Restaurants') {
                    navigation.navigate('RestaurantDetail', { restaurantId: item.id });
                  }
                }}
              >
                <View style={styles.cardImgWrap}>
                  {imgUri ? (
                    <Image source={{ uri: imgUri }} style={styles.cardImg} resizeMode="cover" />
                  ) : (
                    <View style={styles.cardImgPlaceholder}>
                      <Text style={{ fontSize: 28 }}>{activeTab === 'Restaurants' ? '🍽️' : '📦'}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                  {item.cuisineType && (
                    <Text style={styles.cardSub} numberOfLines={1}>{item.cuisineType}</Text>
                  )}
                  {item.price != null && (
                    <Text style={styles.cardPrice}>Rs {Number(item.price).toFixed(0)}</Text>
                  )}
                  {item.rating != null && item.rating > 0 && (
                    <Text style={styles.cardRating}>⭐ {Number(item.rating).toFixed(1)}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => toggleFavourite(item, activeTab === 'Restaurants' ? 'restaurants' : 'products')}
                  style={styles.heartBtn}
                >
                  <Text style={styles.heartIcon}>❤️</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    elevation: 3,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 22, color: '#333' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },

  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tab: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#FF4500' },
  tabText: { fontSize: 14, fontWeight: '700', color: '#999' },
  tabTextActive: { color: '#FF4500' },

  list: { padding: 16, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 20, marginBottom: 14,
    padding: 14, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
  },
  cardImgWrap: { width: 70, height: 70, borderRadius: 16, overflow: 'hidden', backgroundColor: '#F5F5F5', marginRight: 14 },
  cardImg: { width: '100%', height: '100%' },
  cardImgPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginBottom: 3 },
  cardSub: { fontSize: 13, color: '#888', marginBottom: 3 },
  cardPrice: { fontSize: 14, fontWeight: '700', color: '#FF4500' },
  cardRating: { fontSize: 12, color: '#888', marginTop: 2 },
  heartBtn: { padding: 8 },
  heartIcon: { fontSize: 22 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 16, opacity: 0.4 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 22 },
});
