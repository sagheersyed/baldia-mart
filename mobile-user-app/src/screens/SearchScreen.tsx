import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { productsApi, menuItemsApi, normalizeUrl } from '../api/api';
import { useCart } from '../context/CartContext';

export default function SearchScreen({ navigation, route }: any) {
  const { mode } = route.params || { mode: 'mart' };
  const { addToCart, martCart, foodCart } = useCart();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length > 2) {
      const delayDebounceFn = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setResults([]);
    }
  }, [query]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = mode === 'mart' 
        ? await productsApi.getAll() 
        : await menuItemsApi.getAll();
        
      const allItems = res.data || [];
      const filtered = allItems.filter((p: any) => 
        p.name.toLowerCase().includes(query.toLowerCase()) || 
        (p.description && p.description.toLowerCase().includes(query.toLowerCase()))
      );
      setResults(filtered);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const cart = mode === 'mart' ? martCart : foodCart;
    const cartQty = cart.find((c: any) => c.id === item.id)?.quantity || 0;

    return (
      <View style={styles.resultItem}>
        <View style={styles.imagePlaceholder}>
          {item.imageUrl ? (
             <Image source={{ uri: normalizeUrl(item.imageUrl) }} style={styles.image} />
          ) : (
             <View style={{ flex: 1, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}>
               <Text style={{ fontSize: 20 }}>{mode === 'mart' ? '📦' : '🍛'}</Text>
             </View>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.price}>Rs. {item.price}</Text>
        </View>
        <TouchableOpacity 
          style={styles.addBtn} 
          onPress={() => addToCart({
            ...item,
            restaurantName: item.restaurant?.name,
            prepTimeMinutes: item.prepTimeMinutes,
            maxQuantityPerOrder: item.maxQuantityPerOrder
          }, mode)}
        >
          <Text style={styles.addBtnText}>{cartQty > 0 ? `${cartQty} in Cart` : '+ Add'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            placeholder={`Search for ${mode === 'mart' ? 'groceries' : 'food'}...`}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FF4500" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            query.length > 2 ? (
              <Text style={styles.emptyText}>No results found for "{query}"</Text>
            ) : (
              <Text style={styles.emptyText}>Type at least 3 characters to search</Text>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 15, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  backBtn: { marginRight: 15, padding: 5 },
  backIcon: { fontSize: 24, color: '#333' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 12, height: 45 },
  searchIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: '#333' },
  list: { padding: 15 },
  resultItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#fff' },
  imagePlaceholder: { width: 60, height: 60, backgroundColor: '#f9f9f9', borderRadius: 8, marginRight: 15, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a' },
  price: { fontSize: 14, color: '#FF4500', marginTop: 4, fontWeight: '700' },
  addBtn: { backgroundColor: '#FFF5F0', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#FFE4D1' },
  addBtnText: { color: '#FF4500', fontSize: 12, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 50, fontSize: 16 },
});
