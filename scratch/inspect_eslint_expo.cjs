const fs = require('fs');
const path = require('path');
const targetDir = 'c:\\Users\\Jose Mario\\OneDrive\\Escritorio\\Nuevo proyecto Saas\\elevore-mobile\\node_modules\\eslint-config-expo';
try {
  const files = fs.readdirSync(targetDir);
  console.log('Files in eslint-config-expo:', files);
  files.forEach(f => {
    if (f.endsWith('.js')) {
      console.log(`=== ${f} ===`);
      const code = fs.readFileSync(path.join(targetDir, f), 'utf8');
      console.log(code.substring(0, 500)); // Print first 500 chars
    }
  });
} catch (e) {
  console.log(e.message);
}
