require('dotenv').config();
const pool = require('./src/config/db');

async function testHoldExpiration() {
  const client = await pool.connect();
  
  try {
    const BOOKING_HOLD_MINUTES = Number(process.env.BOOKING_HOLD_MINUTES || 15);
    console.log('BOOKING_HOLD_MINUTES:', BOOKING_HOLD_MINUTES);
    
    // Create a test hold
    const holdResult = await client.query(
      `
      INSERT INTO reservation_holds (
        hold_token,
        guest_email,
        check_in_date,
        check_out_date,
        expires_at,
        status
      )
      VALUES ($1, $2, $3, $4, NOW() + INTERVAL '${BOOKING_HOLD_MINUTES} minutes', 'active')
      RETURNING id, hold_token, expires_at, NOW() as current_time
      `,
      ['test-token-' + Date.now(), 'test@example.com', '2026-06-09', '2026-06-11']
    );
    
    const hold = holdResult.rows[0];
    console.log('\nHold created:');
    console.log('  ID:', hold.id);
    console.log('  Token:', hold.hold_token);
    console.log('  Expires at:', hold.expires_at);
    console.log('  Type:', typeof hold.expires_at);
    console.log('  Current time:', hold.current_time);
    console.log('  Type:', typeof hold.current_time);
    
    const expiresDate = new Date(hold.expires_at);
    const currentDate = new Date(hold.current_time);
    console.log('\nParsed dates:');
    console.log('  Expires:', expiresDate.toISOString());
    console.log('  Current:', currentDate.toISOString());
    console.log('  Comparison (expires <= current):', expiresDate <= currentDate);
    console.log('  Time diff (ms):', expiresDate - currentDate);
    console.log('  Time diff (minutes):', (expiresDate - currentDate) / 1000 / 60);
    
    // Cleanup
    await client.query('DELETE FROM reservation_holds WHERE id = $1', [hold.id]);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testHoldExpiration();
