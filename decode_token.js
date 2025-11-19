// decode_token.js - Decode JWT token to see payload
const jwt = require('jsonwebtoken');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTgsImVtYWlsIjoiYWRtaW5AdG9wbW9iaWxlLmNvbSIsIm5hbWUiOiJBZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc2MjE5MjUwOSwiZXhwIjoxNzYyMjc4OTA5fQ.6IB7qSFxD_uJLZNZYOEGsJkRJwP8gyZujqoFeEJCvo0";

try {
  const decoded = jwt.decode(token);
  console.log('Token payload:', decoded);
} catch (error) {
  console.error('Error decoding token:', error);
}