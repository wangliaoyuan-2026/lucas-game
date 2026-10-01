// 汉字出题器：每个字出一道题，答对后弹出学习卡（字、拼音、词语、短句）
(function () {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const toneless = (py) => py.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ü/g, 'v');

  // 解析题库
  const ALL = [];
  const BY = {};
  HANZI_LESSONS.forEach((L, li) => {
    L.list = L.chars.trim().split('\n').map((line) => {
      const [c, py, w, s, e] = line.trim().split('|');
      const it = { c, py, w: w.split(','), s, e: e || '', li };
      ALL.push(it); BY[c] = it;
      return it;
    });
  });

  // 关卡：每 5 课一站，站尾加 Boss 复习关
  const levels = [], stations = [];
  let id = 0;
  HANZI_STATIONS.forEach((name, si) => {
    const ids = [];
    const ls = HANZI_LESSONS.slice(si * 5, si * 5 + 5);
    ls.forEach((L) => { id++; ids.push(id); levels.push({ id, name: L.name, chars: L.list.map((x) => x.c), upto: L.list[0].li }); });
    if (ls.length) {
      id++; ids.push(id);
      const chars = ls.flatMap((L) => L.list.map((x) => x.c));
      levels.push({ id, name: 'Boss：复习大挑战', boss: true, chars, upto: ls[ls.length - 1].list[0].li, n: 10 });
    }
    stations.push({ name, levels: ids });
  });

  const TYPES_NAME = { listen: '听音找字', pic: '看图找字', word: '词语填字', sentence: '句子填字', read: '看字选图' };

  // 词语里这个字只出现一次才出“词语填字”（爸爸、妈妈这种会变成 □□）
  const goodWords = (it) => it.w.filter((w) => w.length > 1 && w.split(it.c).length === 2);
  function typesFor(it) {
    const t = ['listen', 'sentence'];
    if (goodWords(it).length) t.push('word');
    if (it.e) t.push('pic', 'read');
    return t;
  }

  // 干扰项：学过的字里挑，读音不能一样（比如 他/她），图片题要有不同的图
  function distractors(it, lv, needPic) {
    const sameLv = lv.chars.map((c) => BY[c]);
    const learned = ALL.filter((x) => x.li <= lv.upto);
    const ok = (x) => x.c !== it.c && toneless(x.py) !== toneless(it.py) && (!needPic || (x.e && x.e !== it.e));
    const out = [];
    for (const src of [shuffle(sameLv.slice()), shuffle(learned.slice()), shuffle(ALL.slice())]) {
      for (const x of src) { if (out.length >= 3) break; if (ok(x) && !out.includes(x)) out.push(x); }
    }
    return out;
  }

  const blank = (str, c) => str.split(c).join('□');

  function make(c, type, lv) {
    const it = BY[c];
    if (!typesFor(it).includes(type)) type = 'listen';
    const w0 = it.w[0];
    const words = it.w.join('、');
    const learn = it;
    let q;
    if (type === 'read') {
      const ds = distractors(it, lv, true);
      q = {
        kind: 'hzpic', text: c, textClass: 'hz-big', sub: '这个字是什么？点一点对应的图片',
        speak: '认一认，这个字是什么？点一点对应的图片。',
        answer: it.e, choices: shuffle([it.e, ...ds.map((x) => x.e)]),
        hint: { say: `这个字读：${c}，${w0}的${c}。` },
      };
    } else {
      const ds = distractors(it, lv, false);
      const choices = shuffle([c, ...ds.map((x) => x.c)]);
      if (type === 'listen') {
        q = { kind: 'hz', text: '🔊', textClass: 'listen', sub: '听一听，是哪个字？', speak: `找一找：${c}。${w0}的${c}。`,
          hint: { say: `${w0}的${c}，${it.w[1] ? it.w[1] + '的' + c + '。' : ''}`, html: `<div class="hz-words">${it.w.map((x) => blank(x, c)).join('　')}</div>${it.e ? `<div class="pic">${it.e}</div>` : ''}` } };
      } else if (type === 'pic') {
        q = { kind: 'hz', text: it.e, textClass: 'emo-big', sub: '看图片，找一找是哪个字', speak: '看看图片，找一找是哪个字？',
          hint: { say: `这是${w0}的${c}。` } };
      } else if (type === 'word') {
        const w = pick(goodWords(it));
        q = { kind: 'hz', text: blank(w, c), textClass: 'hz-word', sub: '词语里少了哪个字？', speak: `${w}。${w}里少了哪个字？`,
          hint: { say: `听一听：${it.s}`, html: `<div class="hz-sent">${blank(it.s, c)}</div>${it.e ? `<div class="pic">${it.e}</div>` : ''}` } };
      } else {
        q = { kind: 'hz', text: blank(it.s, c), textClass: 'hz-sent', sub: '句子里少了哪个字？', speak: `${it.s} 句子里少了哪个字？`,
          hint: { say: `${w0}的${c}。`, html: `<div class="hz-words">${it.w.map((x) => blank(x, c)).join('　')}</div>` } };
      }
      q.answer = c; q.choices = choices;
    }
    q.type = type; q.c = c; q.learn = learn;
    q.key = 'hz:' + c + ':' + type;
    q.log = `${c}（${w0}）· ${TYPES_NAME[type]}`;
    return q;
  }

  // 一关的出题计划：本关每个字一道题（Boss 关随机抽），题型轮换；再插入最多 2 道错题复习
  function plan(lv, review) {
    const n = lv.n || lv.chars.length;
    const chars = lv.boss ? shuffle(lv.chars.slice()).slice(0, n) : shuffle(lv.chars.slice());
    const order = shuffle(['listen', 'word', 'sentence', 'pic', 'read']);
    const steps = chars.map((c, i) => {
      const ok = typesFor(BY[c]);
      let t = order[i % order.length];
      if (!ok.includes(t)) t = pick(ok);
      return { c, type: t };
    });
    const learned = review.filter((r) => BY[r.c] && BY[r.c].li <= lv.upto && !lv.chars.includes(r.c)).slice(0, 2);
    learned.forEach((r) => steps.splice(1 + Math.floor(Math.random() * steps.length), 0, { review: r }));
    return steps;
  }

  window.HanziGen = { levels, stations, make, plan, BY, ALL, NAMES: TYPES_NAME };
})();
