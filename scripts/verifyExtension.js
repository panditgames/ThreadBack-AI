import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const output = path.resolve('dist');
const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.background.type, 'module');
assert.deepEqual([...manifest.permissions].sort(), ['alarms', 'offscreen', 'storage', 'tabs']);
assert.equal(manifest.host_permissions, undefined);
const localFile = file => { const absolute = path.resolve(output, file); assert.ok(absolute.startsWith(output + path.sep)); assert.ok(fs.statSync(absolute).isFile(), 'Missing packaged asset: ' + file); };
localFile(manifest.background.service_worker);
for (const page of [manifest.action.default_popup, manifest.options_ui.page, 'sidepanel.html', 'offscreen.html']) {
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
assert.equal(fs.readdirSync(path.join(output, 'assets')).filter(file => /^semanticModel-.*\.json$/.test(file)).length, 0, 'Legacy concept model must not ship');
console.log('PASS: MV3 worker, popup/dashboard/companion bundles, local assets, icon sizes and minimal permissions.');

const modelRoot = path.join(output, 'models', 'Xenova', 'bge-small-en-v1.5');
for (const file of ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', 'onnx/model_quantized.onnx']) localFile(path.relative(output, path.join(modelRoot, file)));
assert.deepEqual(fs.readdirSync(path.join(output, 'models', 'Xenova')), ['bge-small-en-v1.5'], 'Only the production model may ship');
assert.deepEqual(fs.readdirSync(path.join(modelRoot, 'onnx')), ['model_quantized.onnx']);
assert.equal(JSON.parse(fs.readFileSync(path.join(modelRoot, 'config.json'), 'utf8')).hidden_size, 384);
assert.equal(createHash('sha256').update(fs.readFileSync(path.join(modelRoot, 'onnx/model_quantized.onnx'))).digest('hex'), '6c9c6101a956d62dfb5e7190c538226c0c5bb9cb27b651234b6df063ee7dbfe4', 'Production INT8 weights must match the audited asset');
assert.ok(manifest.content_security_policy.extension_pages.includes("'wasm-unsafe-eval'"));
for (const file of ['ort-wasm.wasm', 'ort-wasm-simd.wasm']) localFile('wasm/' + file);
assert.ok(!fs.existsSync(path.join(output, 'tournament_models')));
console.log('PASS: bundled quantized 384-dimensional BGE-small-en-v1.5, tokenizer/config and local WASM runtime; tournament models excluded.');
