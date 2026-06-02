const { io } = require("socket.io-client");

const socket = io("http://localhost:3000", {
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('Connected!');
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.error('Connection Error:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log('Timeout');
  process.exit(1);
}, 3000);
