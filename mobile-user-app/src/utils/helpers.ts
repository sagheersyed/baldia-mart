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

export const isBusinessOpen = (
  openingTime: any,
  closingTime?: string | null | undefined,
  offDays?: string | null | undefined,
  fridayOpeningTime?: string | null | undefined,
  fridayClosingTime?: string | null | undefined
): boolean => {
  let opt = openingTime;
  let clt = closingTime;
  let od = offDays;
  let fot = fridayOpeningTime;
  let fct = fridayClosingTime;

  if (openingTime && typeof openingTime === 'object') {
    opt = openingTime.openingTime ?? openingTime.openingHours;
    clt = openingTime.closingTime;
    od = openingTime.offDays;
    fot = openingTime.fridayOpeningTime;
    fct = openingTime.fridayClosingTime;
  }

  if (!opt && !clt) return true;

  try {
    const now = new Date();
    const currentDay = now.getDay().toString(); // '0' (Sunday) - '6' (Saturday)
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const currentDayName = dayNames[now.getDay()];

    if (od) {
      const offDaysList = String(od).split(',').map(d => d.trim().toLowerCase());
      if (offDaysList.includes(currentDay) || offDaysList.includes(currentDayName)) {
        return false;
      }
    }

    let openTimeStr = opt;
    let closeTimeStr = clt;

    if (currentDay === '5') {
      if (fot) openTimeStr = fot;
      if (fct) closeTimeStr = fct;
    }

    if (!openTimeStr || !closeTimeStr) return true;

    const parseTime = (tStr: string) => {
      const parts = tStr.split(':').map(Number);
      return { h: parts[0] || 0, m: parts[1] || 0 };
    };

    const openTimeParsed = parseTime(openTimeStr);
    const closeTimeParsed = parseTime(closeTimeStr);

    const openDate = new Date(now); openDate.setHours(openTimeParsed.h, openTimeParsed.m, 0, 0);
    const closeDate = new Date(now); closeDate.setHours(closeTimeParsed.h, closeTimeParsed.m, 0, 0);

    if (closeDate < openDate) {
      return now >= openDate || now <= closeDate;
    }
    return now >= openDate && now <= closeDate;
  } catch (e) {
    return true;
  }
};

export const formatPKR = (amount: number | string | undefined | null): string => {
  const parsed = Number(amount);
  if (amount === undefined || amount === null || Number.isNaN(parsed)) {
    return 'Rs. 0';
  }
  return `Rs. ${parsed.toLocaleString()}`;
};

/**
 * Resolves the best available image for a product using the fallback hierarchy:
 *   Product imageUrl → Brand imageUrl → Category imageUrl → defaultImage
 *
 * Works with any product-shaped object (mart product, menu item, medicine, etc.)
 * Compatible with both camelCase (imageUrl) and snake_case (image_url) fields.
 */
export const getProductImage = (
  product: any,
  defaultImage: string = '',
): string => {
  if (!product) return defaultImage;

  const isValidUrl = (v: any): boolean =>
    typeof v === 'string' && v.trim().length > 0;

  // 1. Product's own image
  const productImg =
    product.imageUrl ?? product.image_url ?? product.imageURL ?? null;
  if (isValidUrl(productImg)) return productImg as string;

  // 2. Brand image (brand may be a nested object or just an id)
  const brand = product.brand;
  if (brand && typeof brand === 'object') {
    const brandImg =
      brand.imageUrl ?? brand.image_url ?? brand.logoUrl ?? brand.logo ?? null;
    if (isValidUrl(brandImg)) return brandImg as string;
  }

  // 3. Category image
  const category = product.category;
  if (category && typeof category === 'object') {
    const catImg =
      category.imageUrl ?? category.image_url ?? category.iconUrl ?? null;
    if (isValidUrl(catImg)) return catImg as string;
  }

  // 4. Fallback
  return defaultImage;
};

export const getBusinessCloseReason = (store: any): string => {
  if (!store) return 'Closed';
  try {
    const now = new Date();
    const currentDay = now.getDay().toString();
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const currentDayName = dayNames[now.getDay()];
    const od = store.offDays;

    if (od) {
      const offDaysList = String(od).split(',').map(d => d.trim().toLowerCase());
      if (offDaysList.includes(currentDay) || offDaysList.includes(currentDayName)) {
        const longDaysMap: Record<string, string> = {
          'sun': 'Sunday', 'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday', 'thu': 'Thursday', 'fri': 'Friday', 'sat': 'Saturday',
          '0': 'Sunday', '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday', '4': 'Thursday', '5': 'Friday', '6': 'Saturday'
        };
        const dayLabel = longDaysMap[currentDayName] || currentDayName;
        return `Closed - Scheduled Off Day (${dayLabel})`;
      }
    }

    let openTimeStr = store.openingTime ?? store.openingHours;
    let closeTimeStr = store.closingTime;

    if (currentDay === '5') {
      if (store.fridayOpeningTime) openTimeStr = store.fridayOpeningTime;
      if (store.fridayClosingTime) closeTimeStr = store.fridayClosingTime;
    }

    if (openTimeStr && closeTimeStr) {
      return `Closed - Timings: ${openTimeStr} to ${closeTimeStr}`;
    }
  } catch (e) {}
  return 'Closed';
};

