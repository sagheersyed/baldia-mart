const axios = require('axios');

async function testOtp() {
  const phone = '03412248616';
  const baseUrl = ' https://clergyman-envelope-prism.ngrok-free.dev/api/v1';

  try {
    console.log('Sending OTP...');
    const sendRes = await axios.post(`${baseUrl}/auth/send-otp`, { phoneNumber: phone });
    console.log('Send OTP Response:', sendRes.status, sendRes.data);
  } catch (e) {
    console.error('Test failed:', e.response?.status, e.response?.data || e.message);
  }
}

testOtp();
