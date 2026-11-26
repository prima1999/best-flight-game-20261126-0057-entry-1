import { mkdirSync, cpSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath as urlToPath } from 'node:url';
import { buildDossier as buildGameDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(urlToPath(import.meta.url));
const outDir = process.env['MAKEFUN_OUTPUT_DIR'] ?? '/output';
const gameOutDir = join(outDir, 'game');
const screenshotsOutDir = join(outDir, 'screenshots');
mkdirSync(outDir, { recursive: true, mode: 0o755 });
cpSync(join(repoRoot, 'game'), gameOutDir, { recursive: true });
cpSync(join(repoRoot, 'screenshots'), screenshotsOutDir, { recursive: true });
const maxTextBytes = 163840;
const maxScreenshots = 4;
const maxScreenshotBytes = 262144;
const maxGameFiles = 993;
const maxGameBytes = 50331648;
const dossier = buildGameDossier(outDir, {
  text_max_bytes: maxTextBytes,
  screenshots: { max: maxScreenshots, max_bytes: maxScreenshotBytes },
  game_max_files: maxGameFiles,
  game_max_bytes: maxGameBytes,
});
const dossierJson = JSON.stringify(dossier, null, 2);
writeFileSync(join(outDir, 'dossier.json'), dossierJson);
console.log('dossier.json written to', outDir);
