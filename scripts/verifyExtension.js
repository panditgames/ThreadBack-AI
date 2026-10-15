import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const output = path.resolve('dist');
const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.background.type, 'module');
assert.deepEqual([...manifest.permissions].sort(), ['alarms', 'storage', 'tabs']);
assert.equal(manifest.host_permissions, undefined);
const localFile = file => { const absolute = path.resolve(output, file); assert.ok(absolute.startsWith(output + path.sep)); assert.ok(fs.statSync(absolute).isFile(), 'Missing packaged asset: ' + file); };
localFile(manifest.background.service_worker);
for (const page of [manifest.action.default_popup, manifest.options_ui.page, 'sidepanel.html']) {
  localFile(page);
  const html = fs.readFileSync(path.join(output, page), 'utf8');
  assert.match(html, /type="module"/);
  for (const [, asset] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    assert.ok(!/^https?:/.test(asset), 'Unexpected remote page asset');
    localFile(asset.replace(/^\//, ''));
  }
}
for (const [size, file] of Object.entries(manifest.icons)) {
  localFile(file);
  const png = fs.readFileSync(path.join(output, file));
  assert.equal(png.readUInt32BE(16), Number(size));
  assert.equal(png.readUInt32BE(20), Number(size));
}
console.log('PASS: MV3 worker, popup/dashboard/companion bundles, local assets, icon sizes and minimal permissions.');
