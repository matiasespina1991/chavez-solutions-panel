import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../..'
);
const reportsDir = path.join(rootDir, 'scripts', 'xo', 'reports');

const readXoJson = (filename) => {
  const fullPath = path.join(reportsDir, filename);
  if (!fs.existsSync(fullPath)) return [];
  const raw = fs.readFileSync(fullPath, 'utf8');
  const start = raw.indexOf('[');
  if (start < 0) return [];
  try {
    return JSON.parse(raw.slice(start));
  } catch {
    return [];
  }
};

const admin = readXoJson('xo-admin-baseline.json');
const functions = readXoJson('xo-functions-baseline.json');
const all = [...admin, ...functions];

let errors = 0;
let warnings = 0;
let fixableErrors = 0;
let fixableWarnings = 0;
const rules = new Map();

for (const fileReport of all) {
  errors += fileReport.errorCount || 0;
  warnings += fileReport.warningCount || 0;
  fixableErrors += fileReport.fixableErrorCount || 0;
  fixableWarnings += fileReport.fixableWarningCount || 0;

  for (const message of fileReport.messages || []) {
    const ruleId = message.ruleId || 'unknown';
    rules.set(ruleId, (rules.get(ruleId) || 0) + 1);
  }
}

const topRules = [...rules.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);

const lines = [
  `files=${all.length}`,
  `errors=${errors}`,
  `warnings=${warnings}`,
  `fixable_errors=${fixableErrors}`,
  `fixable_warnings=${fixableWarnings}`,
  '',
  'top_rules:',
];

for (const [rule, count] of topRules) {
  lines.push(`${String(count).padStart(6, ' ')} ${rule}`);
}

fs.writeFileSync(
  path.join(reportsDir, 'xo-baseline-summary.txt'),
  `${lines.join('\n')}\n`
);
