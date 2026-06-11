const fs = require('fs');
const code = fs.readFileSync('c:\\Users\\Jose Mario\\OneDrive\\Escritorio\\Nuevo proyecto Saas\\src\\App.jsx', 'utf8');
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes("view === 'admin'") || line.includes('view === "admin"') || line.includes("view === 'dashboard'") || line.includes('view === "dashboard"')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
