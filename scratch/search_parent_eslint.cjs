const fs = require('fs');
const path = require('path');
const dirs = [
  'c:\\Users\\Jose Mario\\OneDrive\\Escritorio',
  'c:\\Users\\Jose Mario\\OneDrive',
  'c:\\Users\\Jose Mario'
];
dirs.forEach(dir => {
  console.log(`Checking ${dir}...`);
  try {
    const files = fs.readdirSync(dir);
    files.forEach(f => {
      if (f.includes('eslintrc') || f.includes('eslint.config')) {
        console.log(`  Found: ${path.join(dir, f)}`);
      }
    });
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }
});
