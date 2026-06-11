const fs = require('fs');
const code = fs.readFileSync('c:\\Users\\Jose Mario\\OneDrive\\Escritorio\\Nuevo proyecto Saas\\src\\App.jsx', 'utf8');
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('activeTab') || line.includes('currentTab') || line.includes('adminTab') || line.includes('tab ===') || line.includes('activeAdminTab')) {
    if (idx >= 9000 && idx < 19000) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
