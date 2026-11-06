const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const arg = (process.argv[2] || 'patch').toLowerCase();
let [major = 0, minor = 0, patch = 0] = (pkg.version || '0.0.0')
  .split('.')
  .map((n) => parseInt(n, 10) || 0);

const oldSemver = `${major}.${minor}.${patch}`;
const oldOctet = `v${String(major).padStart(2, '0')}-${String(minor).padStart(2, '0')}-${String(patch).padStart(2, '0')}`;

if (arg === 'major' || arg === '1' || arg === '1major') {
  // 1Major bump (1.1.0 -> 2.0.0)
  major += 1;
  minor = 0;
  patch = 0;
} else if (arg === 'minor' || arg === '2' || arg === '2minor') {
  // 2Minor bump (1.1.0 -> 1.2.0)
  minor += 1;
  patch = 0;
} else {
  // 3Patch bump (1.1.0 -> 1.1.1)
  patch += 1;
}

const newSemver = `${major}.${minor}.${patch}`;
const newOctet = `v${String(major).padStart(2, '0')}-${String(minor).padStart(2, '0')}-${String(patch).padStart(2, '0')}`;

pkg.version = newSemver;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

const lockPath = path.join(rootDir, 'package-lock.json');
if (fs.existsSync(lockPath)) {
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    lock.version = newSemver;
    if (lock.packages && lock.packages['']) {
      lock.packages[''].version = newSemver;
    }
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf8');
  } catch (e) {
    // ignore
  }
}

console.log(`[bump-version] ${oldSemver} (${oldOctet}) -> ${newSemver} (${newOctet})`);
