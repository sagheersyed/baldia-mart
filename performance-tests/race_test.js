const http = require('http');

async function makeRequest(options, payload = null) {
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', (e) => resolve({ status: 500, error: e.message }));
    if (payload) req.write(payload);
    req.end();
  });
}

async function runRaceTest() {
  console.log("Starting Race Condition Test...");
  
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODQzNDE4OC0zZTc5LTRkMjYtYmNkNC1jMTEwOWQ2OWVhODQiLCJlbWFpbCI6InNhZ2hlZXJzeWVkMzMzQGdtYWlsLmNvbSIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTc3NzMwNTQzMiwiZXhwIjoxNzc3OTEwMjMyfQ.6DcAAFUSOeVmlO5gzqwiDyoxzmQxwrngXfSZxBfykag";
  const addressId = "f03014c2-9caf-4796-abf3-7e487920bc9d";
  const baseUrl = "127.0.0.1";
  const port = 3000;

  // 1. Get a Product ID
  console.log("Fetching a valid product...");
  const productRes = await makeRequest({ hostname: baseUrl, port, path: '/api/v1/products', method: 'GET' });
  const products = JSON.parse(productRes.data);
  if (!products || products.length === 0) {
    console.error("No products found to test with.");
    return;
  }
  const productId = products[0].id;
  console.log(`Using Product: ${products[0].name} (ID: ${productId})`);

  // 2. Add to Cart
  console.log("Adding product to cart...");
  await makeRequest({
    hostname: baseUrl, port, path: '/api/v1/cart/add', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, JSON.stringify({ productId, quantity: 1 }));

  // 3. Fire 100 concurrent checkout requests
  console.log("Firing 100 concurrent checkout requests...");
  const options = {
    hostname: baseUrl, port, path: '/api/v1/orders/checkout', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  };
  const payload = JSON.stringify({ addressId, paymentMethod: "cash_on_delivery", notes: "Race condition test" });

  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(makeRequest(options, payload));
  }

  const results = await Promise.all(promises);
  const successes = results.filter(r => r.status === 201);
  const failures = results.filter(r => r.status !== 201);

  console.log(`\n--- Race Condition Test Results ---`);
  console.log(`Successful Orders Placed: ${successes.length}`);
  console.log(`Failed Orders: ${failures.length}`);
  
  if (successes.length > 1) {
    console.log(`\n❌ CRITICAL VULNERABILITY: ${successes.length} orders created for one cart checkout!`);
  } else if (successes.length === 1) {
    console.log(`\n✅ Race condition prevented (or only one request won).`);
  } else {
    console.log(`\n⚠️ No orders placed. Check backend logs.`);
  }
}

runRaceTest();
