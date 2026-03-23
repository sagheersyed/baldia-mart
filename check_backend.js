const axios = require('axios');
const BASE_URL = 'http://192.168.100.142:3000/api/v1';

async function test() {
  try {
    console.log('--- Testing Auth Status ---');
    const res = await axios.post(`${BASE_URL}/auth/check-status`, {
      phoneNumber: '03000000000',
      role: 'customer'
    });
    console.log('Status Response:', JSON.stringify(res.data, null, 2));
    
    if (res.data.hasOwnProperty('hasMpin')) {
      console.log('SUCCESS: hasMpin field is present in response');
    } else {
      console.log('FAILURE: hasMpin field is MISSING from response');
    }
  } catch (error) {
    console.error('Request failed:', error.message);
    if (error.response) console.log('Error Data:', error.response.data);
  }
}

test();
