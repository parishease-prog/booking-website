const pool = require('./src/config/db');

pool.query(
  `SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name='inquiries' 
   ORDER BY ordinal_position`,
  (err, res) => {
    if(err) {
      console.error('Error:', err.message);
    } else {
      console.log('Inquiries table columns:');
      console.log(JSON.stringify(res.rows, null, 2));
    }
    pool.end();
  }
);
