const fs = require('fs');
const path = require('path');

function findFiles(dir, filter, depth = 0) {
    if (depth > 4) return;
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                if (file !== 'node_modules' && file !== '.git') {
                    findFiles(filePath, filter, depth + 1);
                }
            } else {
                if (filter(file)) {
                    console.log(`Found: ${filePath} (${stat.size} bytes) - Modified: ${stat.mtime}`);
                }
            }
        }
    } catch (e) {}
}

console.log('--- Searching for DB/SQL/BAK/Backup files on VPS ---');
findFiles('/root', (f) => {
    const lower = f.toLowerCase();
    return lower.endsWith('.db') || 
           lower.endsWith('.sqlite') || 
           lower.endsWith('.sqlite3') || 
           lower.endsWith('.sql') || 
           lower.endsWith('.bak') || 
           lower.includes('backup') ||
           lower.includes('dump');
});
