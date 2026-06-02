// Default placeholder images used when no image is available
export const DEFAULT_IMAGES = {
  medicine: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
  product: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
  restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80',
  brand: 'https://images.unsplash.com/photo-1560472355-536de3962603?auto=format&fit=crop&w=400&q=80',
  category: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=400&q=80',
  pharmacy: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=400&q=80',
  banner: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=800&q=80',
};

export const getDefaultImage = (type: keyof typeof DEFAULT_IMAGES = 'product'): string => DEFAULT_IMAGES[type];
