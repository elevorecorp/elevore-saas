const fs = require('fs');
const code = fs.readFileSync('c:\\Users\\Jose Mario\\OneDrive\\Escritorio\\Nuevo proyecto Saas\\src\\App.jsx', 'utf8');
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('localStorage') && line.includes('gemini')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
