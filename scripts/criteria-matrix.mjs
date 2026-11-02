// Build the per-criterion CI matrix for a branch.
//
// Each issue's criteria live in acceptance/<slug>.acceptance.test.js, and every test in
// that file is named "AC<n> <description>". This script picks the file whose slug the
// branch name contains and emits one matrix entry per criterion, so each criterion
// becomes its own named GitHub check. A red check then names the criterion that is
// unmet instead of reporting "tests failed".
//
// Printing an empty matrix is a hard error rather than a quiet pass: a branch whose
// name matches no criteria file would otherwise look green while being judged by
// nothing at all.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const branch = process.argv[2] ?? '';
const dir = 'acceptance';

const files = readdirSync(dir).filter(name => name.endsWith('.acceptance.test.js'));
const slugOf = name => name.replace('.acceptance.test.js', '');

const matched = files.filter(name => branch.includes(slugOf(name)));

if (matched.length !== 1) {
  const detail = matched.length === 0
    ? `no acceptance file's slug appears in it`
    : `it matches more than one: ${matched.map(slugOf).join(', ')}`;
  console.error(
    `::error::Branch "${branch}" cannot be judged — ${detail}.\n` +
    `Name the branch so it contains exactly one of: ${files.map(slugOf).join(', ')}`,
  );
  process.exit(1);
}

const file = matched[0];
const slug = slugOf(file);
const source = readFileSync(join(dir, file), 'utf8');

// Test names are the contract between the criteria file and these checks. Matching the
// literal `test('AC<n> ...')` form keeps that coupling obvious at the call site.
const names = [...source.matchAll(/^test\(\s*'(AC\d+[^']*)'/gm)].map(m => m[1]);

if (names.length === 0) {
  console.error(`::error::${file} declares no AC-prefixed tests, so it gates nothing.`);
  process.exit(1);
}

const include = names.map(name => ({
  check: `${name.split(' ')[0]} ${slug}: ${name.split(' ').slice(1).join(' ')}`,
  pattern: `^${name.split(' ')[0]} `,
  slug,
}));

console.log(JSON.stringify({ include }));
