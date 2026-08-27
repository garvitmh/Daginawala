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

const filesToUpload = [
  {
    local: path.join(__dirname, 'dist', 'services', 'shopify.service.js'),
    remote: '/root/gemini-app/backend/dist/services/shopify.service.js'
  },
  {
    local: path.join(__dirname, 'dist', 'routes', 'offers.routes.js'),
    remote: '/root/gemini-app/backend/dist/routes/offers.routes.js'
  },
  {
    local: path.join(__dirname, 'dist', 'routes', 'products.routes.js'),
    remote: '/root/gemini-app/backend/dist/routes/products.routes.js'
  },
  {
    local: path.join(__dirname, 'dist', 'server-simple.js'),
    remote: '/root/gemini-app/backend/dist/server-simple.js'
  },
  {
    local: path.join(__dirname, 'dist', 'services', 'pricing.service.js'),
    remote: '/root/gemini-app/backend/dist/services/pricing.service.js'
  },
  {
    local: path.join(__dirname, 'dist', 'services', 'email.service.js'),
    remote: '/root/gemini-app/backend/dist/services/email.service.js'
  },
  {
    local: path.join(__dirname, 'prisma', 'schema.prisma'),
    remote: '/root/gemini-app/backend/prisma/schema.prisma'
  },
  {
    local: path.join(__dirname, '..', 'shopify-liquid-templates', 'gemini-price-breakdown-enhanced.liquid'),
    remote: '/root/gemini-app/shopify-liquid-templates/gemini-price-breakdown-enhanced.liquid'
  }
];

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
    
    let uploadIndex = 0;
    
    function uploadNext() {
      if (uploadIndex >= filesToUpload.length) {
        console.log('✅ All files uploaded successfully! Running DB push on VPS...');
        runDbPush();
        return;
      }
      
      const file = filesToUpload[uploadIndex];
      console.log(`Uploading ${path.basename(file.local)}...`);
      const content = fs.readFileSync(file.local);
      
      sftp.writeFile(file.remote, content, (errWrite) => {
        if (errWrite) {
          console.error(`SFTP write error for ${path.basename(file.local)}:`, errWrite);
          conn.end();
          process.exit(1);
        }
        console.log(`✓ ${path.basename(file.local)} uploaded.`);
        uploadIndex++;
        uploadNext();
      });
    }
    
    uploadNext();
    
    function runDbPush() {
      conn.exec('cd /root/gemini-app/backend && npx prisma db push --accept-data-loss', (errExec, stream) => {
        if (errExec) {
          console.error('DB push error:', errExec);
          conn.end();
          process.exit(1);
        }
        
        stream.on('close', (code) => {
          console.log(`✅ DB Push complete (exit code ${code}). Restarting PM2...`);
          restartPM2();
        }).on('data', (data) => {
          process.stdout.write(data);
        }).stderr.on('data', (data) => {
          process.stderr.write(data);
        });
      });
    }
    
    function restartPM2() {
      conn.exec('pm2 restart all', (errExec, stream) => {
        if (errExec) {
          console.error('PM2 restart error:', errExec);
          conn.end();
          process.exit(1);
        }
        
        stream.on('close', (code) => {
          console.log(`✅ Server restarted successfully! (exit code ${code})`);
          conn.end();
          process.exit(code);
        }).on('data', (data) => {
          process.stdout.write(data);
        }).stderr.on('data', (data) => {
          process.stderr.write(data);
        });
      });
    }
  });
});

conn.on('error', (err) => {
  console.error('SSH Connection Error:', err);
  process.exit(1);
});

conn.connect(config);
