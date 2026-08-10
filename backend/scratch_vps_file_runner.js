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

const localFilePath = process.argv[2];
if (!localFilePath) {
  console.error('Please specify a local file to run on the VPS');
  process.exit(1);
}

const fileContent = fs.readFileSync(localFilePath, 'utf8');
const remoteFileName = 'temp_script_' + Date.now() + '.js';
const remotePath = '/root/gemini-app/backend/' + remoteFileName;

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
    
    console.log('SFTP opened. Uploading script...');
    sftp.writeFile(remotePath, fileContent, (errWrite) => {
      if (errWrite) {
        console.error('SFTP write error:', errWrite);
        conn.end();
        process.exit(1);
      }
      
      console.log('Upload complete. Executing script...');
      conn.exec(`cd /root/gemini-app/backend && node ${remoteFileName}`, (err2, stream2) => {
        if (err2) {
          console.error('Exec error during run:', err2);
          conn.end();
          process.exit(1);
        }
        
        stream2.on('close', (code2) => {
          console.log(`Execution finished with code ${code2}. Cleaning up...`);
          conn.exec(`rm ${remotePath}`, () => {
            conn.end();
            process.exit(code2);
          });
        }).on('data', (data) => {
          process.stdout.write(data);
        }).stderr.on('data', (data) => {
          process.stderr.write(data);
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
