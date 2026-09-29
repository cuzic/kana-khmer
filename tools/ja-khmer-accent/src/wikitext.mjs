// ja-pron テンプレートの取り出し。波括弧・角括弧の入れ子を数える(acc_loc={{w|Tokyo dialect|Tokyo}} のような入れ子で正規表現は途切れる)。

/** wikitext の Japanese 節だけ */
export function japaneseSection(text) {
  const m = /^==Japanese==\s*$/m.exec(text);
  if (!m) return '';
  const rest = text.slice(m.index + m[0].length);
  const next = /^==[^=].*==\s*$/m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

/** {{ja-pron ...}} の中身(引数の文字列の配列)を出現順に */
export function jaPronTemplates(section) {
  const out = [];
  let i = 0;
  while ((i = section.indexOf('{{ja-pron', i)) >= 0) {
    let depth = 0, j = i;
    for (; j < section.length; j++) {
      if (section.startsWith('{{', j)) { depth++; j++; }
      else if (section.startsWith('}}', j)) { depth--; j++; if (depth === 0) { j++; break; } }
    }
    const inner = section.slice(i + 2, j - 2);
    out.push(splitArgs(inner).slice(1));
    i = j;
  }
  return out;
}

function splitArgs(s) {
  const args = []; let cur = '', d = 0;
  for (let k = 0; k < s.length; k++) {
    if (s.startsWith('{{', k) || s.startsWith('[[', k)) { d++; cur += s.slice(k, k + 2); k++; }
    else if (s.startsWith('}}', k) || s.startsWith(']]', k)) { d--; cur += s.slice(k, k + 2); k++; }
    else if (s[k] === '|' && d === 0) { args.push(cur); cur = ''; }
    else cur += s[k];
  }
  args.push(cur);
  return args;
}

/** 引数の配列 → { pos: [位置引数], named: {名前: 値} } */
export function parseArgs(args) {
  const pos = [], named = {};
  for (const a of args) {
    const m = /^\s*([A-Za-z_0-9]+)\s*=([\s\S]*)$/.exec(a);
    if (m) named[m[1]] = m[2].trim(); else pos.push(a.trim());
  }
  return { pos, named };
}
