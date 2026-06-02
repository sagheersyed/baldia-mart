import React, { memo, useCallback, useMemo } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, Image, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { normalizeUrl } from '../../api/api';
import AppText from '../ui/AppText';
import { theme } from '../../theme/theme';
import { useCart } from '../../context/CartContext';
import { useCartStore } from '../../store/cartStore';
import { useFavourites } from '../../hooks/useFavourites';
import ProductCard from './ProductCard';

const { width: SCREEN_W } = Dimensions.get('window');

interface CampaignItem {
  id: string;
  name: string;
  imageUrl?: string | null;
  price?: number | string;
  mrp?: number | string;
  discount?: number | string;
  brand?: { name?: string };
}

interface CampaignEvent {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  section: string;
  tags?: string;
  itemIds?: string[];
  items?: CampaignItem[];
}

interface CampaignStripProps {
  events: CampaignEvent[];
  onPress?: (event: CampaignEvent) => void;
  accent?: string;
}

const CampaignStrip = memo(function CampaignStrip({ events, onPress, accent }: CampaignStripProps) {
  const navigation = useNavigation<any>();
  const { martCart, foodCart, pharmaCart, addToCart, updateQuantity } = useCart();
  const { activeMode, setActiveMode } = useCartStore();
  const { isFavourite, toggleFavourite } = useFavourites();

  if (!events?.length) return null;

  const getProductCartCount = (itemId: string, section: string) => {
    if (section === 'pharma') {
      return pharmaCart.find(i => i.id === itemId)?.quantity || 0;
    }
    const cartList = section === 'food' ? foodCart : martCart;
    return cartList.find(i => i.id === itemId)?.quantity || 0;
  };

  const handleAddToCart = (item: any, section: string) => {
    const mode = section === 'pharma' ? 'pharma' : (section === 'food' ? 'food' : 'mart');
    setActiveMode(mode);
    addToCart(item, mode);
  };

  const handleDecrement = (item: any, section: string) => {
    const mode = section === 'pharma' ? 'pharma' : (section === 'food' ? 'food' : 'mart');
    setActiveMode(mode);
    const count = getProductCartCount(item.id, section);
    updateQuantity(item.id, Math.max(0, count - 1), mode);
  };

  return (
    <View style={styles.container}>
      {events.map((ev) => {
        const section = ev.section || 'mart';
        const isPharma = section === 'pharma';
        const isFood = section === 'food';

        // Define theme parameters based on section
        const sectionAccent = accent || (isPharma ? theme.colors.pharma : (isFood ? theme.colors.food : theme.colors.primary));
        const sectionBg = isPharma ? '#FDF2F8' : (isFood ? '#FFF7ED' : '#F8FAFC'); // blush rose, orange cream, clean slate
        const sectionBorder = isPharma ? '#FCE7F3' : (isFood ? '#FFEDD5' : '#F1F5F9');
        const defaultBannerColors = (isPharma
          ? [theme.colors.pharma, theme.colors.pharmaDark]
          : (isFood ? [theme.colors.food, '#DD6B20'] : [theme.colors.primary, '#E64A19'])) as [string, string];

        const hasItems = ev.items && ev.items.length > 0;
        const bannerImg = normalizeUrl(ev.imageUrl);

        return (
          <View key={ev.id} style={[styles.premiumCampaignBlock, { backgroundColor: sectionBg, borderColor: sectionBorder }]}>
            {/* Campaign Banner Card */}
            <Pressable
              style={styles.premiumCampaignBannerCard}
              onPress={() => onPress ? onPress(ev) : navigation.navigate('EventDetails', { eventId: ev.id })}
            >
              {bannerImg ? (
                <Image source={{ uri: bannerImg }} style={styles.premiumCampaignBannerImg} resizeMode="cover" />
              ) : (
                <LinearGradient
                  colors={defaultBannerColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.premiumCampaignBannerImg}
                >
                  <View style={styles.bannerPlaceholderText}>
                    <AppText variant="title" color="#fff" style={{ fontSize: 18 }}>{ev.title}</AppText>
                    {ev.description && <AppText variant="caption" color="rgba(255,255,255,0.8)" style={{ marginTop: 4 }}>{ev.description}</AppText>}
                  </View>
                </LinearGradient>
              )}
            </Pressable>

            {/* Horizontal Scroll of Products */}
            {hasItems && (
              <View style={styles.premiumCampaignProductsRow}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.premiumCampaignProductsScroll}
                >
                  {ev.items!.map((item: any) => {
                    const count = getProductCartCount(item.id, section);
                    const isFav = isFavourite(item.id, 'products');

                    return (
                      <ProductCard
                        key={item.id}
                        product={item}
                        cartQty={count}
                        variant="horizontal"
                        isFavourite={isFav}
                        onAdd={() => handleAddToCart(item, section)}
                        onIncrement={() => handleAddToCart(item, section)}
                        onDecrement={() => handleDecrement(item, section)}
                        onToggleFavourite={() => toggleFavourite({
                          id: item.id,
                          name: item.name,
                          imageUrl: item.imageUrl,
                          price: Number(item.price || item.mrp || 0),
                          discount: Number(item.discount || 0),
                          brand: item.brand,
                          isPharma: section === 'pharma',
                        }, 'products')}
                        tint={sectionAccent}
                      />
                    );
                  })}

                  {/* View All Button inside Scroll */}
                  <Pressable
                    style={styles.premiumViewAllCard}
                    onPress={() => onPress ? onPress(ev) : navigation.navigate('EventDetails', { eventId: ev.id })}
                  >
                    <View style={[styles.premiumViewAllCircle, { backgroundColor: sectionAccent }]}>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </View>
                    <AppText variant="captionStrong" color={sectionAccent} style={{ marginTop: 6, color: sectionAccent }}>
                      View All
                    </AppText>
                  </Pressable>
                </ScrollView>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
});

export default CampaignStrip;

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  premiumCampaignBlock: {
    marginBottom: 20,
    borderRadius: 0,
    marginHorizontal: 0,
    paddingBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  premiumCampaignBannerCard: {
    width: '100%',
    height: 140,
    overflow: 'hidden',
  },
  premiumCampaignBannerImg: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
  bannerPlaceholderText: {
    padding: 20,
    justifyContent: 'center',
  },
  premiumCampaignProductsRow: {
    marginTop: 12,
  },
  premiumCampaignProductsScroll: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: 'center',
  },
  premiumViewAllCard: {
    width: 90,
    height: 160, // matches standard product card horizontal height
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  premiumViewAllCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
});
