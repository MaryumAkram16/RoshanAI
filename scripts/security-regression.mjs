import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const rules = read('firestore.rules');
assert.match(rules, /function isOwner\(userId\)/);
assert.match(rules, /allow read: if isOwner\(userId\)/);
assert.match(rules, /hasNone\(\['uid', 'createdAt'\]\)/);
assert.match(rules, /allow read, write: if false/);

const server = read('server.ts');
assert.match(server, /verifyIdToken/);
assert.match(server, /Authentication is required/);
assert.match(server, /Content-Security-Policy/);
assert.match(server, /RATE_LIMIT_STORE === "firestore"/);

const sourceFiles = [];
function collect(directory) {
  for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(relative);
    else if (/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(relative);
  }
}
collect('src');
const source = sourceFiles.map(read).join('\n');
assert.doesNotMatch(source, /dangerouslyAllowBrowser/);
assert.doesNotMatch(source, /VITE_(OPENAI|SERPAPI|JSEARCH|YOUTUBE)_KEY/);
assert.doesNotMatch(source, /api_key\s*:/);

console.log(`Security regression checks passed (${sourceFiles.length} source files scanned).`);
