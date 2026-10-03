// 英文出题器：9 种题型；答对后弹出英文学习卡（单词、图片、中文、例句）
(function () {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const lines = (txt) => txt.trim().split('\n').map((l) => l.trim().split('|'));

  const WORDS = lines(EN_WORDS).map(([w, e, zh, topic]) => ({ w, e, zh, topic }));
  const W = {}; WORDS.forEach((x) => { W[x.w] = x; });
  const SENTS = lines(EN_SENTENCES).map(([s, e, zh, tag], i) => ({ i, s, e, zh, tag }));
  const words = (s) => s.replace(/[.!?,]/g, '').split(' ');

  const levels = EN_LEVELS.map((l) => ({ ...l, n: l.boss ? 10 : 8 }));
  const stations = EN_STATIONS;
  const NAMES = { listen: '听词选图', pic: '看图选词', case: '大小写', letter: '首字母', sight: '高频词', sblank: '句子填空', sread: '读句选图', order: '排词成句', rhyme: '押韵' };

  // 单词出现在哪个例句里（学习卡用）
  function sentenceFor(w) {
    const re = new RegExp(`\\b${w}s?\\b`, 'i');
    const s = SENTS.find((x) => re.test(x.s));
    return s ? { s: s.s, szh: s.zh } : null;
  }
  const learnWord = (x) => ({ en: true, w: x.w, e: x.e, zh: x.zh, ...(sentenceFor(x.w) || {}) });

  // 每关的素材池
  const poolWords = (lv) => WORDS.filter((x) => (lv.topics || []).includes(x.topic));
  const poolSents = (lv) => SENTS.filter((x) => (lv.tags || []).includes(x.tag));
  const singleWord = (x) => /^[a-z]+$/.test(x.w);

  // 从同主题挑干扰项（图片、单词都不重复）
  function others(x, n, key = 'w') {
    const out = [], seen = new Set([x[key], x.e]);
    for (const src of [shuffle(WORDS.filter((y) => y.topic === x.topic)), shuffle(WORDS.slice())]) {
      for (const y of src) { if (out.length >= n) break; if (!seen.has(y.w) && !seen.has(y.e)) { out.push(y); seen.add(y.w); seen.add(y.e); } }
    }
    return out;
  }
  const CONFUSE = { b: 'dpq', d: 'bpq', p: 'bdq', q: 'bdp', m: 'nwh', n: 'mhu', w: 'mvu', u: 'nvw', h: 'nkb', i: 'jlt', j: 'ig', l: 'it', g: 'qy', c: 'eo', e: 'ca', o: 'ac', a: 'oe' };
  function letterChoices(ans) {
    const set = new Set([ans]);
    for (const ch of shuffle((CONFUSE[ans] || '').split(''))) { if (set.size < 4) set.add(ch); }
    while (set.size < 4) set.add('abcdefghijklmnoprstuvwyz'[Math.floor(Math.random() * 24)]);
    return shuffle([...set]);
  }

  // ---------- 各题型 ----------
  const T = {
    case: {
      items: (lv) => (lv.letters || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ').split(''),
      make(L) {
        const l = L.toLowerCase();
        const ex = WORDS.find((x) => x.w[0] === l && singleWord(x));
        const near = 'abcdefghijklmnopqrstuvwxyz'; const k = near.indexOf(l);
        const strip = near.slice(Math.max(0, k - 2), k + 3).split('').map((c) => `${c.toUpperCase()}${c}`).join('  ');
        return {
          kind: 'en', text: L, textClass: 'en-big', sub: '找出它的小写字母',
          speak: ['找一找，大写字母', { en: L }, '的小写是哪个？'], answer: l, choices: letterChoices(l),
          hint: { say: '看看字母表，大写和小写是一对好朋友。', html: `<div class="en-strip">${strip}</div>` },
          learn: ex ? { en: true, w: `${L} ${l}`, e: ex.e, zh: `字母 ${L}`, s: `${ex.w[0].toUpperCase() + ex.w.slice(1)} starts with ${L}.`, szh: `${ex.w}（${ex.zh}）是 ${L} 开头的。`, say: [{ en: `${L}. ${ex.w}.` }] } : null,
        };
      },
    },
    letter: {
      items: (lv) => poolWords(lv).filter((x) => singleWord(x) && (!lv.letters || lv.letters.includes(x.w[0].toUpperCase()))).map((x) => x.w),
      make(w) {
        const x = W[w], l = w[0];
        return {
          kind: 'en', pic: x.e, text: `_${w.slice(1)}`, textClass: 'en-word', sub: '少了哪个开头字母？',
          speak: [{ en: w }, '是哪个字母开头的？'], answer: l, choices: letterChoices(l),
          hint: { say: ['听开头的声音：', { en: `${w}. ${l}, ${l}, ${w}.` }] }, learn: learnWord(x),
        };
      },
    },
    listen: {
      items: (lv) => poolWords(lv).map((x) => x.w),
      make(w) {
        const x = W[w], ds = others(x, 3);
        return {
          kind: 'emo', text: '🔊', textClass: 'listen', sub: '听一听，选出对的图片',
          speak: ['听一听，选图片：', { en: w }], answer: x.e, choices: shuffle([x.e, ...ds.map((y) => y.e)]),
          hint: { say: [{ en: w }, `，就是“${x.zh}”。`] }, learn: learnWord(x),
        };
      },
    },
    pic: {
      items: (lv) => poolWords(lv).map((x) => x.w),
      make(w) {
        const x = W[w], ds = others(x, 3);
        return {
          kind: 'enw', text: x.e, textClass: 'emo-big', sub: '这是哪个英文单词？',
          speak: '看图片，选出对的英文单词。', answer: w, choices: shuffle([w, ...ds.map((y) => y.w)]),
          hint: { say: [`这是${x.zh}，英文是`, { en: w }, '。听听开头的声音。'] }, learn: learnWord(x),
        };
      },
    },
    sight: {
      items: (lv) => EN_SIGHT[lv.sight || 1],
      make(w, lv) {
        const list = EN_SIGHT[lv.sight || 1].filter((y) => y.toLowerCase() !== w.toLowerCase());
        const ex = SENTS.find((s) => new RegExp(`\\b${w}\\b`, w === 'I' ? '' : 'i').test(s.s));
        return {
          kind: 'enw', text: '🔊', textClass: 'listen', sub: '听一听，找出这个词',
          speak: ['找一找：', { en: w }], answer: w, choices: shuffle([w, ...shuffle(list).slice(0, 3)]),
          hint: { say: ['听一听这个句子：', { en: ex ? ex.s : w }], html: ex ? `<div class="en-sent">${ex.s}</div>` : '' },
          learn: { en: true, w, e: '👀', zh: '高频词', s: ex && ex.s, szh: ex && ex.zh },
        };
      },
    },
    sblank: {
      items: (lv) => poolSents(lv).filter((s) => words(s.s).some((x) => W[x.toLowerCase()])).map((s) => s.i),
      make(i) {
        const s = SENTS[i];
        const cands = words(s.s).filter((x) => W[x.toLowerCase()]);
        const bw = cands[cands.length - 1], x = W[bw.toLowerCase()];
        const ds = others(x, 3);
        const shown = s.s.replace(new RegExp(`\\b${bw}\\b`), '___');
        return {
          kind: 'enw', pic: s.e, text: shown, textClass: 'en-sent', sub: '选一个词填进去',
          speak: [{ en: s.s }], answer: bw, choices: shuffle([bw, ...ds.map((y) => y.w)]),
          hint: { say: [`意思是：${s.zh} 空格里是`, { en: bw }, '。'] }, learn: { en: true, w: bw, e: x.e, zh: x.zh, s: s.s, szh: s.zh },
        };
      },
    },
    sread: {
      items: (lv) => poolSents(lv).map((s) => s.i),
      make(i) {
        const s = SENTS[i];
        const ds = []; const seen = new Set([s.e]);
        for (const y of shuffle(SENTS.slice())) { if (ds.length >= 3) break; if (!seen.has(y.e)) { ds.push(y.e); seen.add(y.e); } }
        return {
          kind: 'emo', text: s.s, textClass: 'en-sent', sub: '读一读，选出对的图片',
          speak: '自己读一读这个句子，选出对的图片。', answer: s.e, choices: shuffle([s.e, ...ds]),
          hint: { say: ['听一听：', { en: s.s }, `意思是：${s.zh}`] }, learn: { en: true, w: s.s, e: s.e, zh: s.zh, sentenceOnly: true },
        };
      },
    },
    order: {
      items: (lv) => poolSents(lv).filter((s) => words(s.s).length >= 3 && words(s.s).length <= 6).map((s) => s.i),
      make(i) {
        const s = SENTS[i], ws = words(s.s);
        let tiles; do { tiles = shuffle(ws.slice()); } while (tiles.join(' ') === ws.join(' ') && ws.length > 1);
        return {
          kind: 'order', pic: s.e, text: '', textClass: 'en-order', sub: '按顺序点单词，组成句子',
          speak: ['听一听，把句子排好：', { en: s.s }], answer: ws.join(' '), choices: tiles, punct: s.s.slice(-1),
          hint: { say: ['再听一遍：', { en: s.s }, `意思是：${s.zh}`], html: `<div class="en-sent">${ws[0]} …</div>` },
          learn: { en: true, w: s.s, e: s.e, zh: s.zh, sentenceOnly: true },
        };
      },
    },
    rhyme: {
      items: () => EN_RHYMES.flatMap((g) => g.filter((w) => W[w])).filter((w) => EN_RHYMES.find((g) => g.includes(w)).filter((y) => W[y]).length >= 2),
      make(t) {
        const g = EN_RHYMES.find((gr) => gr.includes(t)).filter((y) => W[y]);
        const c = pick(g.filter((y) => y !== t));
        const ds = shuffle(EN_RHYMES.filter((gr) => !gr.includes(t)).map((gr) => gr.find((y) => W[y])).filter(Boolean)).slice(0, 2);
        return {
          kind: 'enw', pic: W[t].e, text: t, textClass: 'en-word', sub: '哪个词和它押韵（结尾听起来一样）？',
          speak: ['哪个词和', { en: t }, '的结尾听起来一样？'], answer: c, choices: shuffle([c, ...ds]), choiceEmo: Object.fromEntries([c, ...ds].map((y) => [y, W[y].e])),
          hint: { say: ['读一读，听结尾：', { en: [t, c, ...ds].join(', ') }] }, learn: { en: true, w: `${t} · ${c}`, e: `${W[t].e}${W[c].e}`, zh: `${W[t].zh} · ${W[c].zh}`, s: `${t}, ${c}!`, szh: '它们押韵，结尾的声音一样。' },
        };
      },
    },
  };

  // 出题：type 题型；item 指定素材（错题复习时用），不指定就随机挑一个本关没出过的
  function make(type, lv, item, seen) {
    if (item === undefined) {
      let items = T[type].items(lv);
      if (!items.length) { type = 'listen'; items = T.listen.items(lv).length ? T.listen.items(lv) : WORDS.map((x) => x.w); }
      const fresh = items.filter((it) => !seen || !seen.has('en:' + type + ':' + it));
      item = pick(fresh.length ? fresh : items);
    }
    const q = T[type].make(item, lv);
    q.type = type; q.item = item; q.lang = 'en';
    q.key = 'en:' + type + ':' + item;
    const label = typeof item === 'number' ? SENTS[item].s : item;
    q.log = `${label} · ${NAMES[type]}`;
    return q;
  }

  function plan(lv, review) {
    const n = lv.n;
    const order = []; while (order.length < n) order.push(...shuffle(lv.types.slice()));
    const steps = order.slice(0, n).map((t) => ({ type: t }));
    review.filter((r) => r.lv <= lv.id).slice(0, 2).forEach((r) => steps.splice(1 + Math.floor(Math.random() * steps.length), 0, { review: r }));
    return steps;
  }

  window.EnglishGen = { levels, stations, make, plan, NAMES, WORDS, SENTS };
})();
