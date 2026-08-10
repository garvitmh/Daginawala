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

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    const localPath = path.join(__dirname, 'check_id.js');
    const remotePath = '/root/gemini-app/backend/check_id.js';
    sftp.writeFile(remotePath, fs.readFileSync(localPath), (errWrite) => {
      if (errWrite) {
        console.error(errWrite);
        conn.end();
        return;
      }
      conn.exec('node /root/gemini-app/backend/check_id.js', (errExec, stream) => {
        if (errExec) {
          console.error(errExec);
          conn.end();
          return;
        }
        stream.on('close', () => {
          conn.end();
        }).on('data', (data) => {
          process.stdout.write(data);
        }).stderr.on('data', (data) => {
          process.stderr.write(data);
        });
      });
    });
  });
});
conn.connect(config);
