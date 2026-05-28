require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// Create a test admin token
const token = jwt.sign(
  {
    id: 1,
    email: 'admin@test.com',
    role: 'admin',
    isAdmin: true
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);

console.log(token);
