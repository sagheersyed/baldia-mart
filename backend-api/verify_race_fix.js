const http = require('http');
const { Client } = require('pg');

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

async function verifyRaceFix() {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODQzNDE4OC0zZTc5LTRkMjYtYmNkNC1jMTEwOWQ2OWVhODQiLCJlbWFpbCI6InNhZ2hlZXJzeWVkMzMzQGdtYWlsLmNvbSIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTc3NzMwNTQzMiwiZXhwIjoxNzc3OTEwMjMyfQ.6DcAAFUSOeVmlO5gzqwiDyoxzmQxwrngXfSZxBfykag";
  const userId = '68434188-3e79-4d26-bcd4-c1109d69ea84';
  const baseUrl = "127.0.0.1";
  const port = 3000;

  console.log("--- Initializing Race Condition Fix Verification (V2) ---");

  // 1. Get Product & Address
  const productRes = await makeRequest({ hostname: baseUrl, port, path: '/api/v1/products', method: 'GET' });
  const products = JSON.parse(productRes.data);
  const productId = products[0].id;

  const addressRes = await makeRequest({ 
    hostname: baseUrl, port, path: '/api/v1/addresses', method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const addresses = JSON.parse(addressRes.data);
  const addressId = addresses[0].id;

  const client = new Client({ connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/baldia_mart" });
  await client.connect();

  // 2. Cleanup State
  console.log("Cleaning up DB state...");
  await client.query("DELETE FROM cart_items WHERE user_id = $1", [userId]);
  await client.query("UPDATE products SET stock_quantity = 1 WHERE id = $1", [productId]);
  
  // 3. Add to Cart
  console.log("Adding product to cart via API...");
  await makeRequest({
    hostname: baseUrl, port, path: '/api/v1/cart/add', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, JSON.stringify({ productId, quantity: 1 }));

  // Double check cart
  const cartCheck = await client.query("SELECT quantity FROM cart_items WHERE user_id = $1 AND product_id = $2", [userId, productId]);
  console.log("Cart items for user:", cartCheck.rows[0]?.quantity);

  // 4. Fire 100 concurrent checkouts
  console.log("Firing 100 concurrent checkout requests...");
  const options = {
    hostname: baseUrl, port, path: '/api/v1/orders/checkout', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  };
  const payload = JSON.stringify({ addressId, paymentMethod: "cash_on_delivery", notes: "Race fix V2" });

  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(makeRequest(options, payload));
  }

  const results = await Promise.all(promises);
  const successes = results.filter(r => r.status === 201);
  const insufficientStock = results.filter(r => r.data.includes("Insufficient stock"));
  const emptyCart = results.filter(r => r.data.includes("Cart is empty"));
  const others = results.filter(r => r.status !== 201 && !r.data.includes("Insufficient stock") && !r.data.includes("Cart is empty"));

  console.log(`\n--- Verification Results ---`);
  console.log(`Total Requests: 100`);
  console.log(`Successful Orders: ${successes.length}`);
  console.log(`Blocked (Insufficient Stock): ${insufficientStock.length}`);
  console.log(`Blocked (Empty Cart): ${emptyCart.length}`);
  console.log(`Other Failures: ${others.length}`);

  if (successes.length === 1) {
    console.log(`\n✅ PASS: Concurrency handled correctly.`);
  } else {
    console.log(`\n❌ FAIL: Expected 1 success, got ${successes.length}.`);
    if (results.length > 0) console.log("Sample response:", results[0].data);
  }

  await client.end();
}

verifyRaceFix().catch(console.error);
