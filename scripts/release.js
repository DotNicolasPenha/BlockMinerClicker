#!/usr/bin/env node
/* Release: valida, incrementa versão, atualiza VERSION do sw.js, CHANGELOG, commit e tag.
   Uso:
     npm run release            -> patch (1.0.0 -> 1.0.1)
     npm run release -- minor   -> 1.0.0 -> 1.1.0
     npm run release -- major   -> 1.0.0 -> 2.0.0
     npm run release -- 1.2.3    -> versão explícita
   Flags: --dry-run (não altera nada), --no-git (não commita/taga) */
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const spec = args.find((a) => !a.startsWith('--'));
const dryRun = flags.has('--dry-run');
const noGit = flags.has('--no-git') || dryRun;

const step = (msg) => console.log('\n\x1b[1m' + msg + '\x1b[0m');
const info = (msg) => console.log('  ' + msg);

function git(cmd) {
  return execSync('git ' + cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function bump(current, s) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!m) throw new Error('versão atual inválida: ' + current);
  const [maj, min, pat] = m.slice(1).map(Number);
  if (!s || s === 'patch') return [maj, min, pat + 1].join('.');
  if (s === 'minor') return [maj, min + 1, 0].join('.');
  if (s === 'major') return [maj + 1, 0, 0].join('.');
  if (/^\d+\.\d+\.\d+$/.test(s)) return s;
  throw new Error('argumento inválido: ' + s);
}

step('1/5 Validação');
const v = spawnSync(process.execPath, [path.join(__dirname, 'validate.js')], { cwd: ROOT, stdio: 'inherit' });
if (v.status !== 0) {
  console.error('\nRelease abortado: valide os problemas acima primeiro.');
  process.exit(1);
}

const pkgPath = path.join(ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const next = bump(pkg.version, spec);
const today = new Date().toISOString().slice(0, 10);

step('2/5 Versão');
info(pkg.version + '  ->  \x1b[36mv' + next + '\x1b[0m  (' + today + ')');
if (!dryRun) {
  pkg.version = next;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

step('3/5 sw.js (VERSION do cache)');
const swPath = path.join(ROOT, 'sw.js');
const sw = fs.readFileSync(swPath, 'utf8');
const before = (/const VERSION = ['"]([^'"]+)['"]/.exec(sw) || [])[1];
if (!before) {
  console.error('  Não achei "const VERSION" em sw.js');
  process.exit(1);
}
info('cache: ' + before + '  ->  v' + next);
if (!dryRun) {
  fs.writeFileSync(swPath, sw.replace(/const VERSION = ['"][^'"]+['"]/, "const VERSION = 'v" + next + "'"));
}

step('4/5 CHANGELOG.md');
let commits = [];
try {
  let lastTag = null;
  try {
    lastTag = git('describe --tags --abbrev=0');
  } catch (e) {}
  const range = lastTag ? lastTag + '..HEAD' : '';
  const log = git('log --no-decorate --pretty=format:%s%x1f%h ' + range);
  commits = log
    .split('\n')
    .filter(Boolean)
    .filter((l) => !/^Merge /.test(l.split('\x1f')[0]))
    .map((l) => {
      const [msg, sha] = l.split('\x1f');
      return '- ' + msg + ' (' + sha + ')';
    });
  if (!lastTag && commits.length > 15) {
    const rest = commits.length - 15;
    commits = commits.slice(0, 15).concat('- ... e mais ' + rest + ' commits anteriores');
  }
} catch (e) {
  info('sem histórico git para listar');
}
if (!commits.length) commits = ['- atualizações'];

const entry = ['## [' + next + '] - ' + today, '', ...commits, ''].join('\n');
info('entradas desde o último tag: ' + commits.length);

const changelogPath = path.join(ROOT, 'CHANGELOG.md');
let changelog = fs.readFileSync(changelogPath, 'utf8');
const firstEntry = changelog.search(/^## \[/m);
if (firstEntry === -1) changelog = changelog.trimEnd() + '\n\n' + entry;
else changelog = changelog.slice(0, firstEntry) + entry + changelog.slice(firstEntry);
if (!dryRun) fs.writeFileSync(changelogPath, changelog);

if (dryRun) {
  info('dry-run: nada foi alterado');
  process.exit(0);
}

step('5/5 Git');
const changed = ['package.json', 'sw.js', 'CHANGELOG.md'];
const dirty = git('status --porcelain');
if (dirty) info('aviso: há outras alterações não commitadas no repositório');

if (noGit) {
  info('não git: rode "git add ' + changed.join(' ') + '" quando quiser commitar');
  process.exit(0);
}

try {
  git('add ' + changed.join(' '));
  git('commit -m "release: v' + next + '"');
  git('tag v' + next);
  info('commit "release: v' + next + '" e tag v' + next + ' criados');
  info('push com: git push && git push --tags');
} catch (e) {
  console.error('  Falha no git:', e.message.split('\n')[0]);
  process.exit(1);
}
