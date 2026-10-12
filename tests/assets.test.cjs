const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { root } = require('./helpers.cjs');

test('runtime and archived media match their recorded content checksums', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/assets-manifest.json'), 'utf8'));
  assert.equal(manifest.length, 59);
  for (const item of manifest) {
    const bytes = fs.readFileSync(path.join(root, item.path));
    assert.equal(bytes.length, item.bytes, item.path);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), item.sha256, item.path);
  }
});

test('HTML, stylesheet and scripts reference files that exist, with exact filename case', () => {
  const files = ['index.html', 'css/style.css', ...['runtime','animation','game','audio','input','ranking'].map(name => 'src/' + name + '.js')];
  function existsExact(relative) {
    const parts = relative.split('/'); let base = root;
    for (const part of parts) { assert.ok(fs.readdirSync(base).includes(part), relative); base = path.join(base, part); }
  }
  for (const file of files) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    if (file.endsWith('.js')) new vm.Script(text, { filename: file });
    for (const match of text.matchAll(/(?:src|href)="([^"]+)"/g)) existsExact(match[1]);
    for (const match of text.matchAll(/(?:\.\.\/)?assets\/[A-Za-z0-9_./-]+\.(?:png|gif|webp|mp3)/g)) {
      existsExact(match[0].replace(/^\.\.\//, ''));
    }
  }
  for (let stage = 1; stage <= 5; stage++) existsExact(`assets/images/env_stage${stage}.webp`);
  for (const size of ['small','big','huge']) for (const color of ['R','G','B']) {
    existsExact(`assets/images/enm_${size === 'huge' ? 'Boss' : size}_${color}_animation.png`);
  }
});
