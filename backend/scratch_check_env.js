const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load from backend .env
const envPath = path.join(__dirname, '.env');
console.log('Env path exists:', fs.existsSync(envPath));
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    console.log('DATABASE_URL from file:', envConfig.DATABASE_URL);
}
console.log('process.env.DATABASE_URL:', process.env.DATABASE_URL);
