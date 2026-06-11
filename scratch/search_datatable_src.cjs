const fs = require('fs');
const path = require('path');
function searchDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      searchDir(filePath);
    } else if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
      const code = fs.readFileSync(filePath, 'utf8');
      if (code.includes('DataTable')) {
        console.log(`Found in: ${filePath}`);
      }
    }
  });
}
searchDir('c:\\Users\\Jose Mario\\OneDrive\\Escritorio\\Nuevo proyecto Saas\\src');
