const fs = require('fs');
const code = fs.readFileSync('c:\\Users\\Jose Mario\\OneDrive\\Escritorio\\Nuevo proyecto Saas\\src\\components\\admin\\HyperDriveTab.jsx', 'utf8');
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('team_assigned') || line.includes('teamAssigned') || line.includes('Assign') || line.includes('Asign')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
