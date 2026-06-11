const fs = require('fs');
const path = require('path');
const targetDir = 'c:\\Users\\Jose Mario\\OneDrive\\Escritorio\\Nuevo proyecto Saas\\elevore-mobile\\node_modules\\eslint-config-expo\\utils';
try {
  const files = fs.readdirSync(targetDir);
  console.log('Files in eslint-config-expo/utils:', files);
  files.forEach(f => {
    if (f.endsWith('.js')) {
      console.log(`=== ${f} ===`);
      const code = fs.readFileSync(path.join(targetDir, f), 'utf8');
      console.log(code.substring(0, 1000)); // Print first 1000 chars
    }
  });
} catch (e) {
  console.log(e.message);
}
