export const formatRatingCount = (count: number | undefined | null): string => {
  if (!count) return '';
  if (count < 100) return `(${count})`;
  const rounded = Math.floor(count / 100) * 100;
  return `(${rounded}+)`;
};

export const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const isBusinessOpen = (openingTime: string | null | undefined, closingTime: string | null | undefined): boolean => {
  if (!openingTime || !closingTime) return true;
  try {
    const now = new Date();
    const [openH, openM] = openingTime.split(':').map(Number);
    const [closeH, closeM] = closingTime.split(':').map(Number);
    
    const openDate = new Date(now); openDate.setHours(openH, openM, 0, 0);
    const closeDate = new Date(now); closeDate.setHours(closeH, closeM, 0, 0);

    if (closeDate < openDate) {
      // Overnight (e.g. 09:00 - 02:00)
      return now >= openDate || now <= closeDate;
    }
    return now >= openDate && now <= closeDate;
  } catch (e) {
    return true;
  }
};

