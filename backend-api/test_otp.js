const axios = require('axios');

async function testOtp() {
  const phone = '03412248616';
  const baseUrl = 'https://c2e9-175-107-236-228.ngrok-free.app/api/v1';

  try {
    console.log('Sending OTP...');
    const sendRes = await axios.post(`${baseUrl}/auth/send-otp`, { phoneNumber: phone });
    console.log('Send OTP Response:', sendRes.status, sendRes.data);
  } catch (e) {
    console.error('Test failed:', e.response?.status, e.response?.data || e.message);
  }
}

testOtp();
