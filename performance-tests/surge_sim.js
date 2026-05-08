const io = require('socket.io-client');
const axios = require('axios');

const BACKEND_URL = 'http://127.0.0.1:3000';
const WS_URL = 'http://127.0.0.1:3000';

const riderToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMjFlMGQ1MC0yNjc0LTQ4MzItODBlMC01NGFmMjkxNWFiYWEiLCJlbWFpbCI6InJpZGVyQGJhbGRpYS5jb20iLCJyb2xlIjoicmlkZXIiLCJpYXQiOjE3Nzc3OTYxNzIsImV4cCI6MTgwOTMzMjE3Mn0.X-Qv-yBkdgtkW3Hsqv6H8Ygr4k2xw6eAXWHHoUJWP_Y";
const customerToken = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODQzNDE4OC0zZTc5LTRkMjYtYmNkNC1jMTEwOWQ2OWVhODQiLCJlbWFpbCI6InNhZ2hlZXJzeWVkMzMzQGdtYWlsLmNvbSIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTc3Nzc5NjE3MiwiZXhwIjoxODA5MzMyMTcyfQ.ALk0mTdOaoDsZL-4XqTFMKMJ5hyNvAwKHNbK-vJ6Vj4";

async function simulate() {
  console.log("Waiting for backend to be ready...");
  for(let i=0; i<20; i++) {
    try {
      await axios.get(`${BACKEND_URL}/api/v1/health`, { timeout: 2000 });
      console.log("Backend is ready!");
      break;
    } catch (e) {
      console.log(`Retrying (${i+1}/20)...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log("Cleaning cart...");
  await axios.delete(`${BACKEND_URL}/api/v1/cart`, { headers: { Authorization: customerToken }, timeout: 10000 }).catch(() => {});

  console.log("Adding item to cart...");
  try {
    await axios.post(`${BACKEND_URL}/api/v1/cart/add`, {
      productId: "b5f32d91-8f6b-46c0-aad9-84a20dd19be5",
      quantity: 1
    }, { headers: { Authorization: customerToken }, timeout: 10000 });
    console.log("Item added to cart.");
  } catch (err) {
    console.error("Cart Add Failed:", err.response?.status, err.response?.data || err.message);
    process.exit(1);
  }

  console.log("Starting 100 riders...");
  const sockets = Array.from({ length: 100 }).map(() => {
    return io(WS_URL, { auth: { token: riderToken }, transports: ['websocket'] });
  });

  await new Promise(r => setTimeout(r, 2000));

  console.log("Simulating 150 simultaneous orders (Stock is 100)...");
  const startTime = Date.now();
  const orders = Array.from({ length: 150 }).map((_, i) => {
    return axios.post(`${BACKEND_URL}/api/v1/orders/checkout`, {
      addressId: "24ad71e9-1a6c-48ad-9cf2-c30985d5137a",
      paymentMethod: "cash_on_delivery"
    }, { headers: { Authorization: customerToken }, timeout: 60000 }).catch(err => ({ 
      status: err.response?.status || 'TIMEOUT/ERROR',
      data: err.response?.data
    }));
  });

  const results = await Promise.all(orders);
  const duration = Date.now() - startTime;
  
  const success = results.filter(r => r.status === 201).length;
  const outOfStock = results.filter(r => r.status === 400).length;
  const otherErrors = results.filter(r => r.status !== 201 && r.status !== 400).length;
  
  console.log(`--- Surge Results ---`);
  console.log(`Success (Sold): ${success}`);
  console.log(`Out of Stock (Blocked): ${outOfStock}`);
  console.log(`Other Errors: ${otherErrors}`);
  console.log(`Total Duration: ${duration}ms`);
  console.log(`Avg Latency: ${duration / 150}ms`);
  
  process.exit(0);
}

simulate();
