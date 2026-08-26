const fs = require('fs');
const { exec } = require('child_process');

const envPath = '/root/gemini-app/backend/.env';

try {
    if (!fs.existsSync(envPath)) {
        console.error(`.env file not found at ${envPath}`);
        process.exit(1);
    }

    let content = fs.readFileSync(envPath, 'utf8');
    
    // Replace the SCOPES line
    const target = 'SCOPES=read_products,write_products,read_inventory,write_inventory,read_draft_orders,write_draft_orders';
    const replacement = 'SCOPES=read_products,write_products,read_inventory,write_inventory,read_draft_orders,write_draft_orders,read_themes,write_themes';
    
    if (content.includes(target)) {
        content = content.replace(target, replacement);
        fs.writeFileSync(envPath, content, 'utf8');
        console.log('✅ VPS .env scopes updated successfully!');
    } else if (content.includes(replacement)) {
        console.log('✅ VPS .env scopes are already updated!');
    } else {
        console.error('❌ Could not find expected SCOPES line in .env');
        console.log('Current content:', content);
        process.exit(1);
    }

    // Restart PM2
    console.log('Restarting PM2...');
    exec('pm2 restart all', (error, stdout, stderr) => {
        if (error) {
            console.error('Error restarting PM2:', error);
            process.exit(1);
        }
        console.log(stdout);
        console.log('✅ Server restarted with new scopes!');
        process.exit(0);
    });

} catch (err) {
    console.error('Error:', err);
    process.exit(1);
}
