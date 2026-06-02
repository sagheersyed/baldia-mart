const { execSync } = require('child_process');
const fs = require('fs');
const { Client } = require('pg');

const logFile = 'endurance_metrics.log';
const dbConfig = {
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'baldia_mart'
};

async function getStats() {
  try {
    const dockerStats = execSync('docker stats --no-stream --format "{{.Name}}: CPU {{.CPUPerc}}, Mem {{.MemUsage}}"').toString();
    
    // DB Stats
    let pgConns = 'N/A';
    const client = new Client(dbConfig);
    try {
      await client.connect();
      const res = await client.query('SELECT count(*) FROM pg_stat_activity');
      pgConns = res.rows[0].count;
      await client.end();
    } catch (dbErr) {
      pgConns = `Error: ${dbErr.message}`;
    }

    // Redis Stats
    let redisStats = 'N/A';
    try {
      redisStats = execSync('docker exec baldia_mart_cache redis-cli info stats').toString();
      const match = redisStats.match(/total_commands_processed:(\d+)/);
      if (match) redisStats = `Redis Commands: ${match[1]}`;
    } catch (redisErr) {
      redisStats = `Error: ${redisErr.message}`;
    }
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] \n${dockerStats}PG Connections: ${pgConns}\n${redisStats}\n---\n`;
    
    fs.appendFileSync(logFile, logEntry);
    console.log(`Log updated at ${timestamp}`);
  } catch (err) {
    console.error('Error collecting stats:', err.message);
  }
}

console.log("Starting endurance monitoring (Fixed Windows)...");
setInterval(getStats, 60000); 
getStats();
