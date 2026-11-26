// SkyCourier entrypoint: hand the game in for the make.fun flight bounty.
// It copies game/ and screenshots/ from this repository into the output
// directory, then writes /output/dossier.json with buildDossier from the
// vendored make.fun library. Standard library only; the program only copies
// files, so it finishes in well under the grader's time limit.

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
// The grader writes to /output; MAKEFUN_OUTPUT_DIR stands in for it locally.
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log('SkyCourier dossier written to ' + join(outDir, 'dossier.json'));
