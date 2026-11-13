const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '..', 'evidence');
const target = path.join(__dirname, '..', '..', 'ui', 'evidence');
const files = [
  'deployment.json',
  'deployment-sdk.json',
  'testnet-scenario.json',
  'verification-report.json',
  'sdk-check.json',
  'budget-deployment.json',
  'budget-bootstrap.json',
  'budget-demo.json',
  'budget-verification.json',
];

fs.mkdirSync(target, { recursive: true });
for (const file of files) {
  const from = path.join(source, file);
  if (!fs.existsSync(from)) continue;
  fs.copyFileSync(from, path.join(target, file));
  console.log(`copied ${file}`);
}
