const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  try {
    const payload = {
      emri: 'Test',
      mbiemri: 'User',
      telefoni: '0700000000',
      email: 'test@example.com',
      marka: 'Apple',
      modeli: 'iPhone SE',
      imei: '123456789012345',
      pajisja: 'iPhone',
      cmimi: 0,
      llojiPageses: 'Cash',
      data: '2025-11-13',
      komente: null
    };

    console.log('POST /api/contracts/softsave ->');
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(JSON.stringify(payload)) };
    if (process.env.AUTH_TOKEN) headers['Authorization'] = `Bearer ${process.env.AUTH_TOKEN}`;
    const post = await request({
      hostname: '127.0.0.1', port: 4000, path: '/api/contracts/softsave', method: 'POST',
      headers
    }, JSON.stringify(payload));
    console.log('POST status:', post.statusCode);
    console.log('POST body:', post.body);

    // wait a moment then GET list
    await new Promise(r => setTimeout(r, 300));

  console.log('\nGET /api/contracts/softsave ->');
  const getHeaders = {};
  if (process.env.AUTH_TOKEN) getHeaders['Authorization'] = `Bearer ${process.env.AUTH_TOKEN}`;
  const get = await request({ hostname: '127.0.0.1', port: 4000, path: '/api/contracts/softsave', method: 'GET', headers: getHeaders });
    console.log('GET status:', get.statusCode);
    try { console.log('GET body:', JSON.parse(get.body)); } catch(e) { console.log('GET body raw:', get.body); }

  } catch (err) {
    console.error('Test failed:', err);
    process.exitCode = 1;
  }
}

run();
