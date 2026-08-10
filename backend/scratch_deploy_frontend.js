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

const localDistPath = path.join(__dirname, '..', 'frontend', 'dist');
const remoteDistPath = '/var/www/gemini-app/frontend/dist';

console.log('Connecting to VPS for frontend deploy...');
const conn = new Client();

conn.on('ready', () => {
  console.log('Connected! Opening SFTP...');
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP error:', err);
      conn.end();
      process.exit(1);
    }
    
    function uploadDir(localDir, remoteDir, callback) {
      sftp.mkdir(remoteDir, () => {
        const files = fs.readdirSync(localDir);
        let index = 0;
        
        function next() {
          if (index >= files.length) {
            callback();
            return;
          }
          
          const file = files[index];
          const localFile = path.join(localDir, file);
          const remoteFile = path.join(remoteDir, file).replace(/\\/g, '/');
          const stat = fs.statSync(localFile);
          
          if (stat.isDirectory()) {
            uploadDir(localFile, remoteFile, () => {
              index++;
              next();
            });
          } else {
            console.log(`Uploading ${path.relative(localDistPath, localFile)}...`);
            const data = fs.readFileSync(localFile);
            sftp.writeFile(remoteFile, data, (errWrite) => {
              if (errWrite) {
                console.error(`SFTP write error for ${file}:`, errWrite);
                conn.end();
                process.exit(1);
              }
              index++;
              next();
            });
          }
        }
        
        next();
      });
    }
    
    uploadDir(localDistPath, remoteDistPath, () => {
      console.log('✅ Frontend assets deployed successfully!');
      conn.end();
      process.exit(0);
    });
  });
});

conn.on('error', (err) => {
  console.error('SSH Connection Error:', err);
  process.exit(1);
});

conn.connect(config);
