const fs = require('fs');
const code = fs.readFileSync('c:\\Users\\Jose Mario\\OneDrive\\Escritorio\\Nuevo proyecto Saas\\src\\App.jsx', 'utf8');
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (idx >= 16454 && idx < 16910) {
    if (line.includes('.map') || line.includes('Render') || line.includes('Table') || line.includes('agendaView') || line.includes('unassigned') || line.includes('team_assigned')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
