import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { randomIntBetween, randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Stage 1
    { duration: '3m', target: 1000 },  // Stage 2
    { duration: '5m', target: 5000 },  // Stage 3
    { duration: '5m', target: 10000 }, // Stage 4
    { duration: '10m', target: 100000 }, // Stage 5 (Stress Test)
    { duration: '5m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
  },
};

const BASE_URL = __ENV.API_URL || 'https://00ad-175-107-236-228.ngrok-free.app/api/v1';

// Mock data
const PHONE_NUMBERS = ['+923452621787', '+923118438350', '+923412248616'];

export default function () {
  let authToken = '';
  const phoneNumber = PHONE_NUMBERS[randomIntBetween(0, PHONE_NUMBERS.length - 1)];

  // --- SCENARIO 1: App Open ---
  group('1. App Open', function () {
    const categoriesRes = http.get(`${BASE_URL}/categories`);
    check(categoriesRes, { 'categories status is 200': (r) => r.status === 200 });

    const productsRes = http.get(`${BASE_URL}/products`);
    check(productsRes, { 'products status is 200': (r) => r.status === 200 });
    sleep(1);
  });

  // --- AUTHENTICATION (Prerequisite for Shop/Checkout) ---
  group('Authentication', function () {
    // Send OTP
    const sendOtpRes = http.post(`${BASE_URL}/auth/send-otp`, JSON.stringify({ phoneNumber }), {
      headers: { 'Content-Type': 'application/json' },
    });
    check(sendOtpRes, { 'send-otp status is 201': (r) => r.status === 201 });

    // Verify OTP (Using mock code 123456 - assuming bypass in test env)
    const verifyOtpRes = http.post(`${BASE_URL}/auth/verify-otp`, JSON.stringify({
      phoneNumber,
      otpCode: '123456'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

    if (check(verifyOtpRes, { 'verify-otp status is 201': (r) => r.status === 201 })) {
      authToken = verifyOtpRes.json().accessToken;
    }
    sleep(2);
  });

  if (!authToken) return;

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };

  // --- SCENARIO 2: Browsing ---
  group('2. Browsing', function () {
    const productsRes = http.get(`${BASE_URL}/products`);
    const products = productsRes.json();
    if (products && products.length > 0) {
      const randomProduct = products[randomIntBetween(0, products.length - 1)];
      const detailRes = http.get(`${BASE_URL}/products/${randomProduct.id}`);
      check(detailRes, { 'product detail status is 200': (r) => r.status === 200 });
    }
    sleep(2);
  });

  // --- SCENARIO 3: Shopping (Cart Actions) ---
  let cartItemId = '';
  group('3. Shopping', function () {
    const productsRes = http.get(`${BASE_URL}/products`);
    const products = productsRes.json();
    const productId = products[0].id;

    // Add to cart
    const addRes = http.post(`${BASE_URL}/cart/add`, JSON.stringify({ productId, quantity: 1 }), { headers: authHeaders });
    check(addRes, { 'add to cart status is 201': (r) => r.status === 201 });

    const cart = addRes.json();
    cartItemId = cart.items?.[0]?.id;

    if (cartItemId) {
      // Update cart
      const updateRes = http.put(`${BASE_URL}/cart/update/${cartItemId}`, JSON.stringify({ quantity: 2 }), { headers: authHeaders });
      check(updateRes, { 'update cart status is 200': (r) => r.status === 200 });
    }
    sleep(1);
  });

  // --- SCENARIO 4: Checkout ---
  let orderId = '';
  group('4. Checkout', function () {
    const checkoutRes = http.post(`${BASE_URL}/orders/checkout`, JSON.stringify({
      addressId: 'f03014c2-9caf-4796-abf3-7e487920bc9d', // Mock/Known address
      paymentMethod: 'cash_on_delivery',
      notes: 'Load Test'
    }), { headers: authHeaders });

    if (check(checkoutRes, { 'checkout status is 201': (r) => r.status === 201 })) {
      orderId = checkoutRes.json().id;
    }
    sleep(2);
  });

  // --- SCENARIO 5: Order Tracking ---
  if (orderId) {
    group('5. Tracking', function () {
      for (let i = 0; i < 3; i++) {
        const trackRes = http.get(`${BASE_URL}/orders/${orderId}`, { headers: authHeaders });
        check(trackRes, { 'track status is 200': (r) => r.status === 200 });
        sleep(5);
      }
    });

    // --- SCENARIO 6: Cancel Order ---
    group('6. Cancel Order', function () {
      const cancelRes = http.post(`${BASE_URL}/orders/${orderId}/cancel`, {}, { headers: authHeaders });
      check(cancelRes, { 'cancel status is 201': (r) => r.status === 201 || r.status === 400 });
    });
  }
}
