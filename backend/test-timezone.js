require('dotenv').config();
const pool = require('./src/config/db');

async function checkTimezone() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `
      SELECT 
        NOW() as now_time,
        CURRENT_TIMESTAMP as current_timestamp,
        CURRENT_TIMESTAMP AT TIME ZONE 'UTC' as utc_time,
        timezone(NOW()) as now_timezone,
        timezone(CURRENT_TIMESTAMP) as current_timezone,
        EXTRACT(TIMEZONE FROM NOW()) as tz_offset_seconds
      `
    );
    
    const row = result.rows[0];
    console.log('Database time information:');
    console.log('  NOW():', row.now_time);
    console.log('  CURRENT_TIMESTAMP:', row.current_timestamp);
    console.log('  CURRENT_TIMESTAMP AT TIME ZONE UTC:', row.utc_time);
    console.log('  Timezone offset (seconds):', row.tz_offset_seconds);
    
    console.log('\nJavaScript time:');
    console.log('  new Date():', new Date().toISOString());
    console.log('  Date.now():', new Date(Date.now()).toISOString());
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTimezone();
