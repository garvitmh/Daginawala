const { Client } = require('ssh2');

const config = {
  host: '187.127.149.200',
  port: 22,
  username: 'root',
  password: 'Digital@9987',
  readyTimeout: 15000
};

const cmd = process.argv[2];
if (!cmd) {
  console.error('Please specify a command to run');
  process.exit(1);
}

console.log(`Connecting to VPS to run command: "${cmd}"...`);
const conn = new Client();

conn.on('ready', () => {
  console.log('Connected! Executing command...');
  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      process.exit(1);
    }
    
    stream.on('close', (code) => {
      console.log(`Command execution completed with code ${code}.`);
      conn.end();
      process.exit(code);
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
});

conn.on('error', (err) => {
  console.error('SSH Connection Error:', err);
  process.exit(1);
});

conn.connect(config);
