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

const localLiquidPath = path.join(__dirname, '..', 'shopify-liquid-templates', 'make-an-offer.liquid');
const localBreakdownPath = path.join(__dirname, '..', 'shopify-liquid-templates', 'gemini-price-breakdown-enhanced.liquid');
const localShopifyBreakdownPath = path.join(__dirname, '..', 'shopify-liquid-templates', 'shopify-price-breakdown.liquid');
const localServicePath = path.join(__dirname, 'dist', 'services', 'shopify.service.js');
const localSearchPath = path.join(__dirname, 'scratch_create_demo_gemstones.js');

const remoteLiquidPath = '/root/gemini-app/shopify-liquid-templates/make-an-offer.liquid';
const remoteBreakdownPath = '/root/gemini-app/shopify-liquid-templates/gemini-price-breakdown-enhanced.liquid';
const remoteShopifyBreakdownPath = '/root/gemini-app/shopify-liquid-templates/shopify-price-breakdown.liquid';
const remoteServicePath = '/root/gemini-app/backend/dist/services/shopify.service.js';
const remoteSearchPath = '/root/gemini-app/backend/scratch_create_demo_gemstones.js';

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
    
    console.log('SFTP opened. Reading local liquid template...');
    const liquidContent = fs.readFileSync(localLiquidPath, 'utf8');
    
    console.log('Uploading liquid template to VPS...');
    sftp.writeFile(remoteLiquidPath, liquidContent, (errWriteLiquid) => {
      if (errWriteLiquid) {
        console.error('SFTP write error for liquid template:', errWriteLiquid);
        conn.end();
        process.exit(1);
      }
      console.log('✅ Liquid template uploaded successfully.');

      console.log('Reading local gemini-price-breakdown-enhanced.liquid...');
      const breakdownContent = fs.readFileSync(localBreakdownPath, 'utf8');
      
      console.log('Uploading gemini-price-breakdown-enhanced.liquid to VPS...');
      sftp.writeFile(remoteBreakdownPath, breakdownContent, (errWriteBreakdown) => {
        if (errWriteBreakdown) {
          console.error('SFTP write error for gemini-price-breakdown-enhanced.liquid:', errWriteBreakdown);
          conn.end();
          process.exit(1);
        }
        console.log('✅ gemini-price-breakdown-enhanced.liquid uploaded successfully.');

        console.log('Reading local shopify-price-breakdown.liquid...');
        const shopifyBreakdownContent = fs.readFileSync(localShopifyBreakdownPath, 'utf8');

        console.log('Uploading shopify-price-breakdown.liquid to VPS...');
        sftp.writeFile(remoteShopifyBreakdownPath, shopifyBreakdownContent, (errWriteShopifyBreakdown) => {
          if (errWriteShopifyBreakdown) {
            console.error('SFTP write error for shopify-price-breakdown.liquid:', errWriteShopifyBreakdown);
            conn.end();
            process.exit(1);
          }
          console.log('✅ shopify-price-breakdown.liquid uploaded successfully.');

          console.log('Reading local shopify.service.js...');
          const serviceContent = fs.readFileSync(localServicePath, 'utf8');
        
        console.log('Uploading shopify.service.js to VPS...');
        sftp.writeFile(remoteServicePath, serviceContent, (errWriteService) => {
          if (errWriteService) {
            console.error('SFTP write error for shopify.service.js:', errWriteService);
            conn.end();
            process.exit(1);
          }
          console.log('✅ shopify.service.js uploaded successfully.');

          console.log('Reading local scratch_create_demo_gemstones.js...');
          const searchContent = fs.readFileSync(localSearchPath, 'utf8');

          console.log('Uploading scratch_create_demo_gemstones.js to VPS...');
          sftp.writeFile(remoteSearchPath, searchContent, (errWriteSearch) => {
            if (errWriteSearch) {
              console.error('SFTP write error for scratch_create_demo_gemstones.js:', errWriteSearch);
              conn.end();
              process.exit(1);
            }
            console.log('✅ scratch_create_demo_gemstones.js uploaded successfully.');

            console.log('Executing pm2 restart on VPS...');
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
          });
        });
        });
      });
    });
  });
});

conn.on('error', (err) => {
  console.error('SSH Connection Error:', err);
  process.exit(1);
});

conn.connect(config);
