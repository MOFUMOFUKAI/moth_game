const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const target = path.join(root, 'dist');
// Replace only the generated dist directory under this repository.
if (path.dirname(target) !== root) throw new Error('Invalid output directory');
fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target);
for (const entry of ['index.html', 'src', 'css', 'assets']) {
  fs.cpSync(path.join(root, entry), path.join(target, entry), { recursive: true });
}
console.log('Publishable files: ' + target);
