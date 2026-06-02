const { io } = require("socket.io-client");

const BACKEND = "http://localhost:3000";

console.log("Connecting to", BACKEND);
const socket = io(BACKEND, { transports: ['websocket'] });

socket.on('connect', () => {
  console.log("✅ Connected! Socket ID:", socket.id);
});

socket.on('settings_updated', () => {
  console.log("🔥 settings_updated RECEIVED!");
});

socket.on('connect_error', (err) => {
  console.error("❌ Connection Error:", err.message);
});

socket.on('disconnect', (reason) => {
  console.log("Disconnected:", reason);
});

console.log("Listening for settings_updated... (trigger a settings change in admin panel)");
