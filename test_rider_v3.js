const http = require('http');
// Use the phone number from the previous successful registration
const phone = '+923114106131';

const data = JSON.stringify({ phoneNumber: phone, role: 'rider' });

const options = {
  hostname: 'https://384b-175-107-236-228.ngrok-free.app',
  port: 3000,
  path: '/api/v1/auth/check-status',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  },
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('RESPONSE:', body);
    try {
      const json = JSON.parse(body);
      console.log('EXISTS:', json.exists);
      console.log('HAS_MPIN:', json.hasMpin);
    } catch (e) { }
  });
});

req.on('error', (error) => console.error('ERROR:', error.message));
req.write(data);
req.end();
