const fs = require('node:fs');

function parseConstObjectFromTs(filePath, constName) {
  const source = fs.readFileSync(filePath, 'utf8');
  const pattern = new RegExp(
    `const\\s+${constName}\\s*=\\s*\\{([\\s\\S]*?)\\}\\s+as\\s+const`,
    'm'
  );
  const match = source.match(pattern);

  if (!match) {
    throw new Error(`Could not find "${constName}" in ${filePath}`);
  }

  const body = match[1];
  const entryPattern = /([A-Z_]+)\s*:\s*'([^']+)'/g;
  const entries = [...body.matchAll(entryPattern)].map((entry) => [
    entry[1],
    entry[2]
  ]);

  if (entries.length === 0) {
    throw new Error(`No entries parsed for "${constName}" in ${filePath}`);
  }

  return Object.fromEntries(entries);
}

module.exports = {
  parseConstObjectFromTs
};

