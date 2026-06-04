const pool = require('./src/config/db');

pool.query(
  `SELECT id, full_name, email, phone, subject, message, status, reviewed_at, review_notes, created_at
   FROM inquiries
   ORDER BY created_at DESC`,
  [],
  (err, res) => {
    if(err) {
      console.error('Query Error:', err.message);
      console.error('Full error:', err);
    } else {
      console.log('Success! Rows:', res.rows.length);
      if(res.rows.length > 0) {
        console.log('First row:', JSON.stringify(res.rows[0], null, 2));
      }
    }
    pool.end();
  }
);
