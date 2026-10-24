/* Checks that Ask by voice finds the right answer for test questions in 5 languages.
   Run from the project folder:  node tests/ask-test.js
   Each line of ask-questions.json: [language, question, expected start of the answer]. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = path.join(__dirname, '..', 'public', 'js') + path.sep;
const ctx = {}; vm.createContext(ctx);
for (const f of ['i18n.js', 'kheti.js', 'foods.js', 'methods.js', 'ask.js'])
  vm.runInContext(fs.readFileSync(dir + f, 'utf8').replace(/^const (\w+) =/gm, 'var $1 ='), ctx, { filename: f });
/* Small sample lists, like the Farmers, Shop and Delivery sections */
const lists = {
  farmer: [{ id: 'f1', name: 'Ramesh', village: 'Gohana', district: 'Sonipat', state: 'Haryana', crops: ['टमाटर', 'भिंडी'], produce: [{ name: 'टमाटर' }], method: 'organic', about: '' },
           { id: 'f2', name: 'Lakshmi', village: 'Tenali', district: 'Guntur', state: 'AP', crops: ['Mango', 'Banana'], produce: [], method: 'natural', about: '' }],
  shop: [{ id: 's1', shopName: 'Sharma Khad Bhandar', village: 'Gohana', district: 'Sonipat', products: [{ name: 'यूरिया', cat: 'fertilizer' }, { name: 'Spade', cat: 'tools' }] }],
  delivery: [{ id: 'd1', name: 'Suresh', village: 'Gohana', district: 'Sonipat', areas: 'Sonipat, Gohana', vehicle: 'pickup', available: true }]
};
function desc(it) {
  if (!it) return '-';
  switch (it.kind) {
    case 'food': return 'food[' + it.foods.map(f => f.id).join(',') + '] ' + it.mode + ':' + it.keys.join(',');
    case 'finder': return 'finder ' + it.key + ' ' + it.type;
    case 'pick': return 'pick ' + it.keys.join(',');
    case 'method': return 'method ' + it.m.id;
    case 'kheti': return 'kheti ' + it.tp.id + '#' + it.i;
    case 'list': return 'list ' + it.role + ' ' + it.status + ' ' + it.items.map(x => x.id).join(',');
    default: return it.kind;
  }
}
const cases = JSON.parse(fs.readFileSync(process.argv[2] || path.join(__dirname, 'ask-questions.json'), 'utf8'));
let fail = 0;
for (const [lang, q, expect] of cases) {
  const r = ctx.Ask.search(q, lang, lists);
  const got = desc(r.best);
  const ok = !expect || got.startsWith(expect);
  if (!ok) fail++;
  console.log((ok ? 'ok  ' : 'FAIL') + ' [' + lang + '] ' + q + '  →  ' + got + (ok ? '' : '   (want ' + expect + ')') + '   | rel: ' + r.related.map(desc).join('; '));
}
console.log(fail ? fail + ' failed' : 'all passed');
process.exit(fail ? 1 : 0);
