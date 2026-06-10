
export interface GreetingInfo {
  greeting: string;
  subtitle: string;
}

export function getHeaderGreeting(mode: 'mart' | 'food' | 'pharma' | 'brands' | 'general' = 'general'): GreetingInfo {
  const h = new Date().getHours();
  
  let timeStr = 'evening';
  let genericGreet = 'Good evening';
  
  if (h < 12) {
    timeStr = 'morning';
    genericGreet = 'Good morning';
  } else if (h < 17) {
    timeStr = 'afternoon';
    genericGreet = 'Good afternoon';
  }

  const configs: Record<string, GreetingInfo> = {
    mart: {
      greeting: `${genericGreet}!`,
      subtitle: h < 12 ? 'Fresh groceries for your day ahead.' : h < 17 ? 'Time for some healthy snacks?' : 'Dinner essentials delivered fast.',
    },
    food: {
      greeting: h < 12 ? 'Hungry already?' : h < 17 ? 'Lunch time specials!' : 'Craving something delicious?',
      subtitle: h < 12 ? 'Breakfast favorites are waiting.' : h < 17 ? 'Discover top-rated lunch spots.' : 'Dinner from your favorite restaurants.',
    },
    pharma: {
      greeting: `Stay Healthy!`,
      subtitle: 'Your health, our priority — 24/7 delivery.',
    },
    brands: {
      greeting: 'The Premium Choice',
      subtitle: 'Shop top authentic brands in one place.',
    },
    general: {
      greeting: `${genericGreet},`,
      subtitle: 'Everything you need, delivered in minutes.',
    }
  };

  return configs[mode] || configs.general;
}
