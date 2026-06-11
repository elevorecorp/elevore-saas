const fs = require('fs');
const code = fs.readFileSync('c:\\Users\\Jose Mario\\OneDrive\\Escritorio\\Nuevo proyecto Saas\\src\\App.jsx', 'utf8');
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (idx >= 1936 && idx < 3000 && line.includes('crewLocation')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
