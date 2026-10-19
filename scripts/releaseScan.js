import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const files = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).trim().split('\n'))];
const patterns = {
  'private key': /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  'API/access token': /(?:AIza[0-9A-Za-z_-]{35}|sk-[A-Za-z0-9_-]{32,}|gsk_[A-Za-z0-9]{32,}|gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,}|AKIA[A-Z0-9]{16})/,
  'personal user path': /[A-Za-z]:[\\/]+Users[\\/]+[A-Za-z0-9_-]+/i,
  'email address': /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
};
const findings = [];
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  if (/^(?:node_modules|dist|coverage|test-results|playwright-report|release)\//.test(file)) {
    if (execFileSync('git', ['ls-files', '--', file], { encoding: 'utf8' }).trim()) findings.push({ file, kind: 'tracked build/runtime artifact' });
    continue;
  }
  if (/(^|\/)(?:\.env(?:\..*)?|.*\.(?:db|sqlite|pem|key)|.*profile.*)$/i.test(file)) findings.push({ file, kind: 'sensitive artifact filename' });
  if (/^\.qa-|(?:^|\/).*\.(?:log|har|zip)$/i.test(file)) findings.push({ file, kind: 'tracked runtime/release artifact' });
  if (!/\.(?:md|tsx?|m?js|json|html|css|ya?ml|sh|txt|py|csv|jsonl)$/.test(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const [kind, pattern] of Object.entries(patterns)) if (pattern.test(content)) findings.push({ file, kind });
}
console.log(JSON.stringify({ scannedFiles: files.length, findings }, null, 2));
process.exitCode = findings.length ? 1 : 0;
