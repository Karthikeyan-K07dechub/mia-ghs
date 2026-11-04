const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const assert = require('assert');

const directory = path.join(__dirname, 'handoff', 'mia-ghs');
const read = name => fs.readFileSync(path.join(directory, name), 'utf8');
const html = read('mia-ghs.html');
const css = read('mia-ghs.css');
const script = read('mia-ghs.js');
const manifest = JSON.parse(read('manifest.json'));

assert(!/<\/?(?:html|head|body|main|footer)\b/i.test(html), 'Fragment contains document chrome');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(ids.length, new Set(ids).size, 'Duplicate fragment IDs');
assert(ids.every(id => id.startsWith('mia-ghs-')), 'Unprefixed ID');
for (const match of html.matchAll(/\b(?:aria-labelledby|aria-describedby|aria-controls|for)="([^"]+)"/g)) {
  for (const id of match[1].split(/\s+/)) assert(ids.includes(id), `Unresolved reference: ${id}`);
}
for (const match of html.matchAll(/href="#([^"]+)"/g)) assert(ids.includes(match[1]), `Unresolved anchor: ${match[1]}`);
for (const match of html.matchAll(/class="([^"]+)"/g)) {
  for (const name of match[1].split(/\s+/)) assert(name.startsWith('ghs-') || name === 'mia-ghs-landing', `Generic class: ${name}`);
}
for (const line of css.split('\n')) {
  if (!line.includes('{') || /^\s*(?:@|\/\*)/.test(line)) continue;
  const selectors = line.slice(0, line.indexOf('{')).trim();
  assert(selectors.split(',').every(selector => selector.trim().startsWith('#mia-ghs-landing') || selector.trim().startsWith(':where(#mia-ghs-landing)')), `Unscoped CSS: ${selectors}`);
}
assert(!/^\s*(?:body|:root|\*)\s*\{/m.test(css), 'Global document reset');
assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length, 'Unbalanced CSS');
new vm.Script(script);
// The embedding script must be harmless on other pages and when reloaded.
vm.runInNewContext(script, {document: {getElementById: () => null}});
vm.runInNewContext(script, {document: {getElementById: () => ({dataset: {miaGhsInitialized: 'true'}})}});
assert(!script.includes('document.querySelector('));
assert(!script.includes('document.querySelectorAll('));
for (const match of script.matchAll(/getPageElement\('([^']+)'\)/g)) assert(ids.includes('mia-ghs-' + match[1]), `Unresolved script ID: ${match[1]}`);
for (const match of script.matchAll(/setAttribute\('aria-labelledby', '([^']+)'\)/g)) assert(ids.includes(match[1]), `Unresolved dynamic ARIA: ${match[1]}`);
assert(script.includes('const enrolSuccessPreview = false;'));
assert(script.includes('const contactSuccessPreview = false;'));
assert(/class="ghs-button ghs-connect" type="submit" disabled/.test(html));
assert(/class="ghs-button" type="submit" disabled>Connect Now!/.test(html));
const head = read('head-snippet.html');
assert.equal((head.match(/<title>/g) || []).length, 1);
assert.equal((head.match(/name="description"/g) || []).length, 1);
assert.equal((head.match(/rel="canonical"/g) || []).length, 1);
for (const match of html.matchAll(/<a\b[^>]*href="https?:\/\/[^>]+>/g)) {
  assert(match[0].includes('target="_blank"'));
  assert(match[0].includes('rel="noopener noreferrer"'));
}
const hash = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
for (const [name, expected] of Object.entries(manifest.sourceSHA256)) assert.equal(hash(path.join(__dirname, name)), expected, `Working source changed: ${name}`);
for (const asset of manifest.assets) assert.equal(hash(path.join(directory, asset)), hash(path.join(__dirname, asset)), `Asset changed: ${asset}`);
console.log(`PASS: isolated fragment (${ids.length} unique IDs), CSS scoping, JS syntax/guards, references, disabled demos, external links, ${manifest.assets.length} matching assets, and unchanged working source checksums.`);
