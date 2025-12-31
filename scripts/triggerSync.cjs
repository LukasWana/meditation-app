/**
 * Jednoduchý skript pro spuštění synchronizace přes HTTP
 */

const https = require('https');

const projectId = 'meditations-audio';
const region = 'us-central1';
const functionName = 'syncAllFiles';

const url = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;

console.log('🚀 Spouštím synchronizaci...');
console.log('📡 Volám:', url);
console.log('');

const postData = JSON.stringify({
  data: {}
});

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  },
  timeout: 600000 // 10 minut
};

const req = https.request(url, options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  console.log('');

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
    process.stdout.write('.');
  });

  res.on('end', () => {
    console.log('');
    console.log('');
    try {
      const result = JSON.parse(data);
      console.log('✅ Odpověď:', JSON.stringify(result, null, 2));
    } catch (e) {
      console.log('📄 Raw odpověď:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Chyba: ${e.message}`);
});

req.on('timeout', () => {
  console.error('⏱️ Timeout - funkce stále běží na serveru');
  req.destroy();
});

req.write(postData);
req.end();
