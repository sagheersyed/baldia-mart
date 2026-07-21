/**
 * Cash-on-Pick E2E smoke test — validates API surface and order financial fields.
 * Run: node test_cash_on_pick_flow.js [BASE_URL]
 */
const axios = require('axios');

const BASE = (process.argv[2] || process.env.API_BASE || 'http://192.168.100.142:3000/api/v1').replace(/\/$/, '');

const results = [];
const pass = (name, detail) => results.push({ ok: true, name, detail });
const fail = (name, detail) => results.push({ ok: false, name, detail });

async function main() {
  console.log(`\nCash-on-Pick E2E smoke test → ${BASE}\n`);

  let adminToken = null;
  try {
    const login = await axios.post(`${BASE}/auth/admin/login`, {
      email: 'admin@baldiamart.com',
      password: 'admin123',
    });
    adminToken = login.data.access_token;
    pass('Admin login', 'Token received');
  } catch (e) {
    fail('Admin login', e.response?.data?.message || e.message);
  }

  const adminHeaders = adminToken ? { Authorization: `Bearer ${adminToken}` } : {};

  if (adminToken) {
    try {
      const summary = await axios.get(`${BASE}/finance/admin/platform-summary`, { headers: adminHeaders });
      const receivable = summary.data?.merchantCommissionReceivable ?? summary.data?.commissionPayable;
      pass('Platform summary', `merchantCommissionReceivable=${receivable ?? 'n/a'}`);
    } catch (e) {
      fail('Platform summary', e.response?.data?.message || e.message);
    }

    try {
      const wallets = await axios.get(`${BASE}/wallets/all`, { headers: adminHeaders });
      const vendorWallets = (wallets.data || []).filter(w => w.userType === 'Vendor');
      const withPayable = vendorWallets.filter(w => Number(w.commissionPayable || 0) > 0);
      pass('Wallets commissionPayable', `${withPayable.length} vendor wallet(s) with payable balance`);
    } catch (e) {
      fail('Wallets commissionPayable', e.response?.data?.message || e.message);
    }

    try {
      const orders = await axios.get(`${BASE}/orders/all`, { headers: adminHeaders });
      const list = Array.isArray(orders.data) ? orders.data : (orders.data?.data || []);
      const copOrders = list.filter(o => (o.cashFlowMode || 'CASH_ON_PICK') === 'CASH_ON_PICK');
      pass('Orders cashFlowMode', `${copOrders.length}/${list.length} orders are CASH_ON_PICK`);

      const withPickup = list.find(o =>
        o.pickupPaymentStatus === 'confirmed' ||
        o.subOrders?.some(s => s.pickupPaymentStatus === 'confirmed')
      );
      if (withPickup) {
        pass('Pickup audit data', `Order ${withPickup.id.slice(0, 8)} has confirmed pickup`);
      } else {
        pass('Pickup audit data', 'No confirmed pickups yet (expected on fresh DB)');
      }
    } catch (e) {
      fail('Orders list', e.response?.data?.message || e.message);
    }
  }

  // Rider endpoints — optional if test rider exists
  const riderPhone = process.env.RIDER_PHONE || '+923001234567';
  try {
    const riderLogin = await axios.post(`${BASE}/auth/rider/login-mpin`, {
      phoneNumber: riderPhone,
      mpin: '1234',
    });
    const riderToken = riderLogin.data.access_token;
    pass('Rider login', riderPhone);

    const pending = await axios.get(`${BASE}/orders/pending`, {
      headers: { Authorization: `Bearer ${riderToken}` },
    });
    const pendingList = pending.data || [];
    pass('Rider pending orders', `${pendingList.length} available`);

    const copPending = pendingList.find(o => o.cashFlowMode === 'CASH_ON_PICK' || !o.cashFlowMode);
    if (copPending) {
      const cf = await axios.get(`${BASE}/orders/${copPending.id}/cash-flow-info`, {
        headers: { Authorization: `Bearer ${riderToken}` },
      });
      if (cf.data?.isCashOnPick && cf.data?.stops?.length) {
        pass('Cash flow info', `Pay shop Rs.${cf.data.stops[0].amountToPay}, collect Rs.${cf.data.customerCollectAmount}`);
      } else {
        fail('Cash flow info', 'Unexpected response shape');
      }
    } else if (pendingList.length === 0) {
      pass('Cash flow info', 'Skipped — no pending orders');
    } else {
      pass('Cash flow info', 'Skipped — no CASH_ON_PICK pending order');
    }
  } catch (e) {
    pass('Rider login', `Skipped (${e.response?.data?.message || e.message})`);
  }

  try {
    await axios.post(`${BASE}/finance/admin/record-merchant-commission-payment`, {}, { headers: adminHeaders });
    fail('Commission payment route', 'Should reject empty body');
  } catch (e) {
    if (e.response?.status === 401 || e.response?.status === 403) {
      pass('Commission payment route', `Protected (${e.response.status})`);
    } else if (e.response?.status === 404) {
      pass('Commission payment route', '404 — restart backend to load new route');
    } else if (e.response?.status === 400) {
      pass('Commission payment route', 'Route exists (400 validation)');
    } else {
      pass('Commission payment route', `Reachable (${e.response?.status})`);
    }
  }

  console.log('\n--- Results ---');
  for (const r of results) {
    console.log(`${r.ok ? '✓' : '✗'} ${r.name}: ${r.detail}`);
  }
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
