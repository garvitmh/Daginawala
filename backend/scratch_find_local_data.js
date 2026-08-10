const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

function findFiles(dir, depth = 0) {
    if (depth > 3) return;
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                if (!file.includes('node_modules') && !file.includes('AppData') && !file.startsWith('.')) {
                    findFiles(filePath, depth + 1);
                }
            } else if (file.endsWith('.xlsx') || file.endsWith('.csv')) {
                try {
                    const wb = xlsx.readFile(filePath);
                    const sheet = wb.Sheets[wb.SheetNames[0]];
                    const data = xlsx.utils.sheet_to_json(sheet);
                    if (data.length > 0) {
                        const keys = Object.keys(data[0]);
                        const hasMetalWeight = keys.some(k => k.toLowerCase().includes('metal weight') || k.toLowerCase().includes('gold weight'));
                        if (hasMetalWeight) {
                            const nonZeroRows = data.filter(r => r['Metal Weight (g)'] || r['Gold Weight'] || r['weight']);
                            if (nonZeroRows.length > 0) {
                                console.log('FOUND POPULATED FILE:', filePath, 'rows:', data.length, 'non-zero:', nonZeroRows.length);
                            }
                        }
                    }
                } catch (e) {
                    // Ignore parsing errors for non-matching spreadsheets
                }
            }
        }
    } catch (e) {
        // Ignore read errors for system folders
    }
}

console.log('--- Searching for populated Excel files ---');
findFiles('C:/Users/91787');
findFiles('C:/Desktop');
