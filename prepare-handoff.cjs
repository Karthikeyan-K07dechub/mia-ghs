const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');

const project = __dirname;
const output = path.join(project, 'handoff', 'mia-ghs');
const rootId = 'mia-ghs-landing';
const idPrefix = 'mia-ghs-';
const sourceFiles = ['index.html', 'styles.css', 'script.js'];
const source = Object.fromEntries(sourceFiles.map(name => [name, fs.readFileSync(path.join(project, name), 'utf8')]));
const hashes = Object.fromEntries(sourceFiles.map(name => [name, crypto.createHash('sha256').update(fs.readFileSync(path.join(project, name))).digest('hex')]));
const ids = [...source['index.html'].matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(ids.length, new Set(ids).size, 'Source IDs must be unique');
const idMap = new Map(ids.map(id => [id, idPrefix + id]));

let content = source['index.html'].match(/<body>\s*([\s\S]*?)\s*<\/body>/)[1];
content = content.replace(/\s*<footer\b[\s\S]*?<\/footer>/g, '');
content = content.replace('<main class="ghs-page">', '<div class="ghs-page">').replace('</main>', '</div>');
content = content.replace(/\bid="([^"]+)"/g, (_, id) => `id="${idMap.get(id)}"`);
content = content.replace(/\b(aria-labelledby|aria-describedby|aria-controls|for)="([^"]+)"/g, (_, attribute, value) => `${attribute}="${value.split(/\s+/).map(id => idMap.get(id) || id).join(' ')}"`);
content = content.replace(/href="#([^"]+)"/g, (_, id) => `href="#${idMap.get(id) || id}"`);
content = content.replace(/<button class="ghs-button ghs-connect" type="submit">/, '<button class="ghs-button ghs-connect" type="submit" disabled>');
content = `<div id="${rootId}" class="mia-ghs-landing">\n${content}\n</div>\n`;

// The source stylesheet uses one-line rules and multiline @media blocks.
// Scope selectors, retain media queries/keyframes, and remove document-wide rules.
let css = source['styles.css'].split(/\r?\n/).map(line => {
  if (line.startsWith(':root {')) return `#${rootId} {`;
  if (line.startsWith('* {')) return `#${rootId}, #${rootId} * { box-sizing: border-box; }`;
  if (line.startsWith('body {')) return `#${rootId} { margin: 0; background: #fff; }`;
  if (/^\s*\.ghs-footer(?:\s|\{|\.)/.test(line)) return '';
  if (!line.includes('{') || /^\s*(?:@|\/\*)/.test(line)) return line;
  const opening = line.indexOf('{');
  const selector = line.slice(0, opening).trim();
  // Declarations inside the multiline variables block are not selectors.
  if (selector.startsWith('--')) return line;
  const indent = line.match(/^\s*/)[0];
  return `${indent}${selector.split(',').map(part => `:where(#${rootId}) ${part.trim()}`).join(', ')} ${line.slice(opening)}`;
}).join('\n').replaceAll('ghs-benefits-scroll', 'mia-ghs-benefits-scroll');

let script = source['script.js'];
script = script.replaceAll('document.getElementById(', 'getPageElement(');
script = script.replaceAll('document.querySelectorAll(', 'page.querySelectorAll(').replaceAll('document.querySelector(', 'page.querySelector(');
script = script.replace(/setAttribute\('aria-labelledby', '([^']+)'\)/g, (_, id) => `setAttribute('aria-labelledby', '${idMap.get(id) || id}')`);
script = script.replace('const enrolSuccessPreview = true;', 'const enrolSuccessPreview = false;');
script = script.replace('const contactSuccessPreview = true;', 'const contactSuccessPreview = false;');
script = script.replace("  'use strict';", `  'use strict';\n\n  const page = document.getElementById('${rootId}');\n  if (!page || page.dataset.miaGhsInitialized === 'true') return;\n  page.dataset.miaGhsInitialized = 'true';\n  const getPageElement = id => page.querySelector('[id="${idPrefix}' + id + '"]');`);

const head = `<!-- Merge metadata into the host head; do not create duplicate tags. -->
<title>Golden Harvest Scheme | Gold Saving &amp; Investment Plan | Mia by Tanishq</title>
<meta name="description" content="Explore Mia’s Golden Harvest Scheme, a smart gold saving scheme designed to help you plan your jewellery purchase with easy monthly instalments and added benefits.">
<link rel="canonical" href="https://www.miabytanishq.com/en_IN/golden-harvest-scheme">
<!-- Use the site's approved font delivery if Google Fonts is not permitted. -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;500;600;700&family=DM+Sans:wght@500&family=Fraunces:wght@400;600&family=Lato:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="mia-ghs.css">
<script src="mia-ghs.js" defer></script>
`;

const readme = `# Mia GHS integration handoff

## Package contents

- mia-ghs.html: body fragment to insert into the host content slot. No html/head/body, site header, main landmark, or footer.
- mia-ghs.css: module-scoped CSS, including responsive rules.
- mia-ghs.js: module-scoped interactions. Load once with defer after the fragment is present.
- assets/: locally referenced image files, copied without alteration.
- head-snippet.html: approved metadata and dependencies to merge into the host head.
- preview.html: standalone review page only; do not paste this full document into a content module.
- SFMC-REQUIREMENTS.md: unimplemented integrations and launch requirements.
- manifest.json: source checksums, ID mapping and asset inventory.

## Installation

1. Publish mia-ghs.html inside the host's existing main/content slot, below its header and above its footer. Include the fragment once per page.
2. Publish CSS, JavaScript and assets. Paths currently assume this package's files and assets/ directory are served relative to the page; update src, href and CSS url paths to the platform/CDN paths if necessary.
3. Merge head-snippet.html into the host head. Use the approved font policy. Ensure charset UTF-8 and a device-width viewport in the host document. Avoid duplicate title, description and canonical tags.
4. Configure the actual route: https://www.miabytanishq.com/en_IN/golden-harvest-scheme . A canonical tag alone does not publish that route.
5. If the platform inserts the content asynchronously, load the module script after insertion. Initialization is guarded against duplicate execution. No external JavaScript libraries are required.

## Isolation

All existing module classes use ghs-. All IDs in the fragment use mia-ghs-. CSS variables and ordinary selectors are scoped to #mia-ghs-landing; no global body, universal, :root, font or margin reset is shipped. DOM queries target this wrapper. Labels, internal links and ARIA references use the remapped IDs. Field names and event names remain stable for integration.

The only deliberate document-level behavior is temporary background scroll locking while the modal is open. It saves and restores the host body's affected inline styles, root overflow and scroll position. Test on the integrated site, including its fixed header, consent layer and other overlays.

## Form state: NOT connected

Both demo-success flags are false in this package. Both Connect Now buttons are disabled pending SFMC/CRM integration; the popup and its plan summary still open. No real lead collection or enrolment endpoint is supplied. Do not enable a preview flag to make a live form work: preview flags simulate success and transmit nothing.

The calculator Start this Plan includes a visible snapshot and hidden monthlyInstalment, savings, bonus, total, instalments and currency fields. Generic enrolment CTAs clear and disable these plan fields. Inline Connect Now does not carry a plan. Form field names are name, phone and city. Source tracking has not yet been added.

The existing ghs:contact event on #mia-ghs-contact-form carries name, phone, city, onSuccess and onError. An integration listener should preventDefault(), send the data to the approved service, then call onSuccess() only after server confirmation or onError() on failure. The button must only be enabled after the handler/service is configured. The enrolment preview handler needs replacing with an equivalent real submission integration; ghs:enrol is a calculator CTA event, not a form-submit or successful-enrolment event.

## Validation and review

Client-side validation is provided for required name/city text and Indian mobile numbers (optional +91, spaces and hyphens). It does not verify number ownership; repeat validation on the server. Hidden plan values are untrusted client input and must be checked/recalculated by the receiving service.

Local code and package checks cannot establish host CSS compatibility or backend behavior. Before launch, test the embedded page at 320/375/768/1024/1440px, keyboard navigation, popup close/Escape and scroll restoration, plan clearing, tabs/arrows, FAQ animation, marquee/reduced motion, QR scanning and all external links. Do an actual end-to-end lead test with SFMC and confirm a received record.

The source index.html, styles.css and script.js remain unchanged by this export. Rebuild with node prepare-handoff.cjs after subsequent source changes, then recreate the ZIP. Existing generated assets may remain after later source deletions; use manifest.json as the authoritative current inventory.
`;

const sfmc = `# Pending Integration Work - SFMC

The page development has been approved. The following integration work remains:

## 1. Form submission destination

Connect the enrolment popup and the inline Connect Now lead form to the approved SFMC/CRM/API destination. Both collect name, phone number and city. They can use the same destination if supported by the receiving service.

When the popup opens through Start this Plan, also submit the selected monthly instalment, total customer contribution, bonus, total jewellery value, instalment count and currency. Other enrolment buttons and the inline form do not include plan details.

## 2. Live submission handling

The handoff has submission buttons disabled and no destination connected. Integrate real submission handling, then enable the buttons. Display the existing success message only after the service confirms success, and show an error if submission fails. Do not enable the demo-success flags for the live page.

Existing validation and success designs are included. Technical integration notes and the inline form's callback hooks are documented in README.md.

`;

fs.mkdirSync(path.join(output, 'assets'), { recursive: true });
const assetPaths = new Set();
for (const match of content.matchAll(/src="(assets\/[^\"]+)"/g)) assetPaths.add(decodeURIComponent(match[1]));
for (const match of css.matchAll(/url\("(assets\/[^\"]+)"\)/g)) assetPaths.add(decodeURIComponent(match[1]));
for (const asset of assetPaths) {
  const resolved = path.resolve(project, asset);
  assert(resolved.startsWith(path.resolve(project, 'assets') + path.sep), 'Asset escapes assets directory');
  fs.copyFileSync(resolved, path.join(output, asset));
}
const preview = `<!doctype html>\n<html lang="en-IN">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${head}<style>body { margin: 0; }</style>\n</head>\n<body>\n${content}</body>\n</html>\n`;
const manifest = { rootId, generatedAt: new Date().toISOString(), sourceSHA256: hashes, idMap: Object.fromEntries(idMap), assets: [...assetPaths].sort(), previewsEnabled: false, formsConnected: false };
for (const [name, text] of Object.entries({ 'mia-ghs.html': content, 'mia-ghs.css': css, 'mia-ghs.js': script, 'head-snippet.html': head, 'preview.html': preview, 'README.md': readme, 'SFMC-REQUIREMENTS.md': sfmc, 'manifest.json': JSON.stringify(manifest, null, 2) + '\n' })) {
  fs.writeFileSync(path.join(output, name), text, 'utf8');
}
for (const name of sourceFiles) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(project, name))).digest('hex'), hashes[name], `Source file changed: ${name}`);
console.log(`Prepared ${output} with ${assetPaths.size} image assets. Working page files are unchanged.`);
