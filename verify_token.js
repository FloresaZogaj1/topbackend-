// verify_token.js - Verify JWT token using backend secret
require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTgsImVtYWlsIjoiYWRtaW5AdG9wbW9iaWxlLmNvbSIsIm5hbWUiOiJBZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc2MjE5MjUwOSwiZXhwIjoxNzYyMjc4OTA5fQ.6IB7qSFxD_uJLZNZYOEGsJkRJwP8gyZujqoFeEJCvo0";

console.log('JWT_SECRET from env:', process.env.JWT_SECRET);
console.log('Fallback secret:', 'sekret');

try {
  // Try with env secret
  const secret = process.env.JWT_SECRET || 'sekret';
  const decoded = jwt.verify(token, secret);
  console.log('✅ Token verified successfully with secret:', secret);
  console.log('Decoded payload:', decoded);
} catch (error) {
  console.error('❌ Token verification failed:', error.message);
  
  // Try with fallback secret
  try {
    const decoded2 = jwt.verify(token, 'sekret');
    console.log('✅ Token verified with fallback secret');
    console.log('Decoded payload:', decoded2);
  } catch (error2) {
    console.error('❌ Token verification also failed with fallback secret:', error2.message);
  }
}