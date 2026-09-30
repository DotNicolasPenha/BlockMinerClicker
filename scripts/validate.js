#!/usr/bin/env node
/* Valida manifest, ícones, HTML e o precache do service worker. Uso: npm run validate */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let failures = 0;

const rel = (p) => path.relative(ROOT, p);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));

function ok(name, detail) {
  console.log('  \x1b[32mOK\x1b[0m   ' + name + (detail ? ' — ' + detail : ''));
}
function bad(name, detail) {
  failures++;
  console.log('  \x1b[31mERRO\x1b[0m ' + name + (detail ? ' — ' + detail : ''));
}
function check(name, fn) {
  try {
    const detail = fn();
    if (detail === false) bad(name);
    else ok(name, detail === true ? '' : detail);
  } catch (e) {
    bad(name, e.message);
  }
}

function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.slice(1, 4).toString('ascii') !== 'PNG') return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

console.log('Validando Block Miner Clicker...\n');

let manifest = null;
console.log('manifest.json');
check('JSON válido', () => {
  manifest = JSON.parse(read('manifest.json'));
  return true;
});
check('campos obrigatórios (name, short_name, start_url, display, theme_color)', () => {
  for (const k of ['name', 'short_name', 'start_url', 'display', 'orientation', 'background_color', 'theme_color']) {
    if (!manifest[k]) throw new Error('falta "' + k + '"');
  }
  return true;
});
check('ícones 192 e 512 presentes no array de ícones', () => {
  if (!Array.isArray(manifest.icons) || manifest.icons.length < 2) throw new Error('icons inválido');
  const sizes = manifest.icons.map((i) => i.sizes);
  if (!sizes.includes('192x192') || !sizes.includes('512x512')) throw new Error('faltam 192x192/512x512');
  return sizes.length + ' ícones declarados';
});
check('arquivos de ícone existem com o tamanho declarado', () => {
  const problems = [];
  for (const icon of manifest.icons) {
    const file = path.join(ROOT, icon.src.replace(/^\.\//, ''));
    if (!fs.existsSync(file)) {
      problems.push('ausente: ' + icon.src);
      continue;
    }
    const size = pngSize(file);
    const declared = parseInt(icon.sizes, 10);
    if (!size || size.w !== declared || size.h !== declared) {
      problems.push(icon.src + ' é ' + (size ? size.w + 'x' + size.h : '?') + ', declarado ' + icon.sizes);
    }
  }
  if (problems.length) throw new Error(problems.join('; '));
  return true;
});
check('start_url aponta para index.html', () => {
  if (!/index\.html|^\.\/?$/.test(manifest.start_url)) throw new Error('start_url: ' + manifest.start_url);
  return true;
});

console.log('\nindex.html');
const html = read('index.html');
check('link rel=manifest', () => {
  if (!/<link[^>]+rel=["']manifest["'][^>]*>/i.test(html)) throw new Error('não encontrado');
  return true;
});
check('meta theme-color', () => {
  if (!/<meta[^>]+name=["']theme-color["']/i.test(html)) throw new Error('não encontrado');
  return true;
});
check('apple-touch-icon', () => {
  if (!/<link[^>]+rel=["']apple-touch-icon["']/i.test(html)) throw new Error('não encontrado');
  return true;
});
check('registro do service worker', () => {
  if (!/serviceWorker\.register/.test(html)) throw new Error('não encontrado');
  return true;
});
check('referências locais href/src resolvem para arquivos existentes', () => {
  const refs = new Set();
  const re = /(?:href|src)=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) refs.add(m[1]);
  const missing = [];
  for (const ref of refs) {
    if (/^(https?:|\/\/|data:|mailto:|#|javascript:)/i.test(ref)) continue;
    const clean = ref.split('?')[0].split('#')[0];
    if (!clean) continue;
    if (!exists(clean)) missing.push(ref);
  }
  if (missing.length) throw new Error('não encontrados: ' + missing.join(', '));
  return refs.size + ' referências checadas';
});

console.log('\nsw.js');
let precache = null;
check('sintaxe válida', () => {
  new vm.Script(read('sw.js'), { filename: 'sw.js' });
  return true;
});
check('constante VERSION presente', () => {
  if (!/const VERSION = ['"][^'"]+['"]/.test(read('sw.js'))) throw new Error('não encontrada');
  return true;
});
check('itens do PRECACHE existem no disco', () => {
  const sandbox = {
    self: { addEventListener() {}, skipWaiting() {}, clients: { claim() {} } },
    console
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('sw.js') + '\n;globalThis.__PRECACHE = PRECACHE;', sandbox, { filename: 'sw.js' });
  precache = sandbox.__PRECACHE;
  if (!Array.isArray(precache) || !precache.length) throw new Error('PRECACHE vazio');
  const missing = precache.filter((p) => {
    const clean = p.replace(/^\.\//, '');
    return clean === '' ? !exists('index.html') : !exists(clean);
  });
  if (missing.length) throw new Error('ausentes: ' + missing.join(', '));
  return precache.length + ' itens em cache';
});

console.log('\nrepo');
check('CHANGELOG.md existe', () => {
  if (!exists('CHANGELOG.md')) throw new Error('ausente');
  return true;
});
check('LICENSE e README presentes', () => {
  for (const f of ['README.md', 'LICENSE']) if (!exists(f)) throw new Error('falta ' + f);
  return true;
});

console.log('');
if (failures) {
  console.log('\x1b[31m' + failures + ' problema(s) encontrado(s).\x1b[0m');
  process.exit(1);
}
console.log('\x1b[32mTudo certo.\x1b[0m');
