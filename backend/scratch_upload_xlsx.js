const { Client } = require('ssh2');
const fs = require('fs');

const config = {
  host: '187.127.149.200',
  port: 22,
  username: 'root',
  password: 'Digital@9987',
  readyTimeout: 15000
};

const localPath = 'C:\\Desktop\\Daginawala\\gemini-app\\shopify-liquid-templates\\make-an-offer.liquid';
const remotePath = '/root/gemini-app/shopify-liquid-templates/make-an-offer.liquid';

console.log('Connecting to VPS...');
const conn = new Client();

conn.on('ready', () => {
  console.log('Connected! Opening SFTP...');
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP error:', err);
      conn.end();
      process.exit(1);
    }
    
    console.log('SFTP opened. Reading local xlsx...');
    const fileBuffer = fs.readFileSync(localPath);
    
    console.log('Uploading xlsx to VPS...');
    sftp.writeFile(remotePath, fileBuffer, (errWrite) => {
      if (errWrite) {
        console.error('SFTP write error:', errWrite);
      } else {
        console.log('Upload complete!');
      }
      conn.end();
    });
  });
});

conn.on('error', (err) => {
  console.error('SSH Connection Error:', err);
  process.exit(1);
});

conn.connect(config);
