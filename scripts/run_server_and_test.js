const { spawn } = require('child_process');
const http = require('http');
const jwt = require('jsonwebtoken');

const cwd = process.cwd();
const serverPath = 'server.js';
const SERVER_URL = 'http://127.0.0.1:4000';
const HEALTH = SERVER_URL + '/healthz';

function waitForHealth(timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function poll() {
      http.get(HEALTH, (res) => {
        if (res.statusCode === 200) return resolve(true);
        if (Date.now() - start > timeoutMs) return reject(new Error('timeout'));
        setTimeout(poll, 500);
      }).on('error', () => {
        if (Date.now() - start > timeoutMs) return reject(new Error('timeout'));
        setTimeout(poll, 500);
      });
    })();
  });
}

function httpRequest(opts, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  console.log('Spawning server...');
  const child = spawn(process.execPath, [serverPath], { cwd, env: process.env, stdio: ['ignore','inherit','inherit'] });

  child.on('exit', (code, sig) => {
    console.log('Server exited', code, sig);
  });

  try {
    await waitForHealth(20000);
    console.log('Server healthy');
  } catch (err) {
    console.error('Server did not become healthy:', err.message || err);
    child.kill('SIGTERM');
    process.exit(1);
  }

  // generate test token
  const secret = process.env.JWT_SECRET || 'sekret';
  const token = jwt.sign({ id: 1, email: 'admin@example.com', role: 'admin' }, secret, { expiresIn: '7d' });

  const payload = JSON.stringify({
    emri: 'AutoTest', mbiemri: 'Runner', telefoni: '0700000000', email: 'autotest@example.com',
    marka: 'TestBrand', modeli: 'TestModel', imei: '99999999999999', pajisja: 'Phone', cmimi: 0, llojiPageses: 'Cash', data: '2025-11-13', komente: null
  });

  try {
    console.log('POST /api/contracts/softsave');
    const post = await httpRequest({ hostname: '127.0.0.1', port: 4000, path: '/api/contracts/softsave', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), 'Authorization': 'Bearer ' + token } }, payload);
    console.log('POST status', post.statusCode);
    console.log('POST body', post.body);

    console.log('\nGET /api/contracts/softsave');
    const get = await httpRequest({ hostname: '127.0.0.1', port: 4000, path: '/api/contracts/softsave', method: 'GET', headers: { 'Authorization': 'Bearer ' + token } });
    console.log('GET status', get.statusCode);
    try { console.log('GET body', JSON.parse(get.body)); } catch (e) { console.log('GET body raw', get.body); }
  } catch (err) {
    console.error('Test failed', err);
  } finally {
    console.log('Stopping server...');
    child.kill('SIGTERM');
    process.exit(0);
  }
})();
