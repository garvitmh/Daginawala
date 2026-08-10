const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const config = {
  host: '187.127.149.200',
  port: 22,
  username: 'root',
  password: 'Digital@9987',
  readyTimeout: 15000
};

console.log('Connecting to VPS...');
const conn = new Client();

conn.on('ready', () => {
  console.log('Connected! Finding MAKE AN OFFER text in liquid files on VPS...');
  conn.exec('grep -ri "make an offer" /root/gemini-app/shopify-liquid-templates/', (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      return;
    }
    stream.on('close', (code) => {
      console.log(`Finished (exit code ${code})`);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
});

conn.on('error', (err) => {
  console.error('SSH Error:', err);
});

conn.connect(config);
