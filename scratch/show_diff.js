import { execSync } from 'child_process';
import fs from 'fs';

try {
  const diff = execSync('git diff src/App.jsx', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  fs.writeFileSync('scratch/diff.txt', diff);
  console.log('Diff written to scratch/diff.txt successfully!');
} catch (err) {
  console.error(err);
}
