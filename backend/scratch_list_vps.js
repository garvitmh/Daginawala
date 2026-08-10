const fs = require('fs');
const path = require('path');

function listDirRecursive(dir, depth = 0) {
    if (depth > 2) return;
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            const indent = '  '.repeat(depth);
            if (stat.isDirectory()) {
                console.log(`${indent}[DIR] ${file}`);
                listDirRecursive(filePath, depth + 1);
            } else {
                console.log(`${indent}[FILE] ${file} (${stat.size} bytes) - Modified: ${stat.mtime}`);
            }
        }
    } catch (e) {
        console.log(`Error reading ${dir}: ${e.message}`);
    }
}

console.log('--- Listing /root/gemini-app ---');
listDirRecursive('/root/gemini-app');
