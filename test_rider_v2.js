const axios = require('axios');
const phone = '+923' + Math.floor(Math.random() * 900000000).toString().padStart(9, '0');
const BASE_URL = 'https://c2e9-175-107-236-228.ngrok-free.app/api/v1';

async function run() {
    try {
        console.log(`Testing with phone: ${phone}`);
        const reg = await axios.post(`${BASE_URL}/auth/rider/register-mpin`, { phoneNumber: phone, mpin: '1234' });
        console.log('REG RESPONSE:', JSON.stringify(reg.data, null, 2));

        const token = reg.data.access_token;
        const me = await axios.get(`${BASE_URL}/riders/me`, { headers: { Authorization: `Bearer ${token}` } });
        console.log('ME RESPONSE:', JSON.stringify(me.data, null, 2));

        if (me.data.isActive === false) {
            console.log('SUCCESS: New rider is INACTIVE by default.');
        } else {
            console.log('FAILURE: New rider is ACTIVE by default.');
        }

        if (reg.data.rider.hasMpin === true) {
            console.log('SUCCESS: hasMpin flag is true in login response.');
        } else {
            console.log('FAILURE: hasMpin flag is missing or false.');
        }

    } catch (e) {
        console.error('ERR:', e.response?.data || e.message);
    }
}
run();
