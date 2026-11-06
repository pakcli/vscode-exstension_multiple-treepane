const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// Format semver (e.g. 1.1.2) to octates naming: vxx-xx-xx (e.g. v01-01-02) and vxx.xx.xx (e.g. v01.01.02)
const [major = 0, minor = 0, patch = 0] = (pkg.version || '0.0.0')
  .split('.')
  .map((n) => parseInt(n, 10) || 0);

const octetDash = `v${String(major).padStart(2, '0')}-${String(minor).padStart(2, '0')}-${String(patch).padStart(2, '0')}`;
const octetDot = `v${String(major).padStart(2, '0')}.${String(minor).padStart(2, '0')}.${String(patch).padStart(2, '0')}`;

const outDir = path.join(rootDir, 'out', 'vsix');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const outDashName = `${pkg.name}-${octetDash}.vsix`;
const outDotName = `${pkg.name}-${octetDot}.vsix`;
const outDashPath = path.join(outDir, outDashName);
const outDotPath = path.join(outDir, outDotName);

console.log(`[build-vsix] Packaging ${pkg.name}@${pkg.version} -> ${octetDash} / ${octetDot}...`);

try {
  execSync(`npx -y @vscode/vsce package --no-dependencies -o "${outDashPath}"`, {
    stdio: 'inherit',
    cwd: rootDir
  });
  // Also create dot-formatted copy
  fs.copyFileSync(outDashPath, outDotPath);
  console.log(`\n[build-vsix] SUCCESS:`);
  console.log(`  - ./out/vsix/${outDashName}`);
  console.log(`  - ./out/vsix/${outDotName}`);
} catch (err) {
  console.error(`\n[build-vsix] ERROR: Failed to package VSIX.`, err.message);
  process.exit(1);
}
