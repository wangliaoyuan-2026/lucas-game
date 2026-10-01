// 数学出题器：MathGen.gen(题型, 难度) 出一道新题；MathGen.build(题型, 难度, 参数) 复现错题
(function () {
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const tens = (n) => n - (n % 10);

  // 生成 4 个数字选项：正确答案 + 容易混淆的干扰项
  function numChoices(ans) {
    const set = new Set([ans]);
    const swap = ans >= 10 && ans < 100 ? (ans % 10) * 10 + Math.floor(ans / 10) : -1;
    const cands = shuffle([ans + 1, ans - 1, ans + 10, ans - 10, ans + 2, ans - 2, swap]);
    for (const c of cands) {
      if (set.size >= 4) break;
      if (c >= 0 && c !== ans) set.add(c);
    }
    let k = 3;
    while (set.size < 4) { set.add(ans + k); k++; }
    return shuffle([...set]);
  }

  const CMP = ['>', '<', '='];
  const cmpOf = (l, r) => (l > r ? '>' : l < r ? '<' : '=');

  // 算式工具：返回 {t: 显示, s: 朗读, v: 值}
  function expr(kind) {
    if (kind === 'add') { const a = R(10, 60), b = R(3, 39); return { t: `${a} + ${b}`, s: `${a} 加 ${b}`, v: a + b }; }
    if (kind === 'sub') { const a = R(30, 99), b = R(3, a - 10); return { t: `${a} − ${b}`, s: `${a} 减 ${b}`, v: a - b }; }
    const a = R(2, 9), b = R(3, 12); return { t: `${a} × ${b}`, s: `${a} 乘 ${b}`, v: a * b };
  }

  const T = {};

  // ---------- 加法 ----------
  T.add = {
    params(d) {
      let a, b;
      if (d === 1) do { a = R(10, 89); b = R(2, 9); } while (a % 10 + b >= 10);
      else if (d === 2) do { a = R(10, 89); b = R(2, 9); } while (a % 10 + b < 10);
      else if (d === 3) do { a = R(10, 79); b = R(10, 89); } while (a % 10 + b % 10 >= 10 || a + b > 99);
      else do { a = R(15, 79); b = R(12, 79); } while (a % 10 + b % 10 < 10 || a + b > 99);
      return { a, b };
    },
    build({ a, b }, d) {
      let hint;
      if (d === 1) hint = { say: `看看个位：${a % 10} 加 ${b} 是几？十位不变哦。`, vis: { kind: 'blocks', nums: [a, b] } };
      else if (d === 2) {
        const k = 10 - (a % 10);
        hint = { say: `凑十法：把 ${b} 拆成 ${k} 和 ${b - k}。${a} 加 ${k} 等于 ${a + k}，再加 ${b - k} 是几？` };
      } else hint = { say: `先加十位：${a} 加 ${tens(b)} 等于 ${a + tens(b)}，再加 ${b % 10} 是几？` };
      return { text: `${a} + ${b} = ?`, speak: `${a} 加 ${b} 等于几？`, answer: a + b, choices: numChoices(a + b), hint };
    },
  };

  // ---------- 减法 ----------
  T.sub = {
    params(d) {
      let a, b;
      if (d === 1) { a = R(11, 20); b = R(2, 9); }
      else if (d === 2) do { a = R(20, 99); b = R(1, 9); } while (a % 10 < b);
      else if (d === 3) do { a = R(21, 99); b = R(2, 9); } while (a % 10 >= b);
      else do { a = R(30, 99); b = R(11, a - 5); } while (b % 10 === 0);
      return { a, b };
    },
    build({ a, b }, d) {
      let hint;
      if (d === 1) hint = { say: `从 ${a} 往回跳 ${b} 格，停在几？`, vis: { kind: 'numline', lo: 0, hi: 20, start: a } };
      else if (d === 2) hint = { say: `个位 ${a % 10} 减 ${b} 是几？十位不变哦。` };
      else if (d === 3) {
        const o = a % 10;
        hint = o > 0
          ? { say: `先减 ${o}：${a} 减 ${o} 等于 ${a - o}，再减 ${b - o} 是几？`, vis: { kind: 'numline', lo: Math.max(0, a - b - 3), hi: a + 1, start: a } }
          : { say: `从 ${a} 往回跳 ${b} 格，停在几？`, vis: { kind: 'numline', lo: Math.max(0, a - b - 3), hi: a + 1, start: a } };
      } else hint = { say: `先减十位：${a} 减 ${tens(b)} 等于 ${a - tens(b)}，再减 ${b % 10} 是几？` };
      return { text: `${a} − ${b} = ?`, speak: `${a} 减 ${b} 等于几？`, answer: a - b, choices: numChoices(a - b), hint };
    },
  };

  // ---------- 乘法 ----------
  T.mul = {
    params(d) {
      let a, b;
      if (d === 1) { a = pick([2, 5, 10]); b = R(2, 9); }
      else if (d === 2) { a = R(2, 9); b = R(2, 9); }
      else if (d === 3) { a = R(2, 4); const t = R(1, Math.floor(9 / a)), o = R(1, Math.floor(9 / a)); b = t * 10 + o; }
      else do { a = R(2, 9); b = R(11, 49); } while ((b % 10) * a < 10);
      return { a, b, flip: d <= 2 && Math.random() < 0.5 };
    },
    build({ a, b, flip }, d) {
      let hint;
      if (d <= 2) hint = { say: `${b} 个 ${a} 加起来是几？`, vis: { kind: 'chips', val: a, count: b } };
      else hint = { say: `拆开算：${a} 乘 ${tens(b)} 等于 ${a * tens(b)}，${a} 乘 ${b % 10} 等于 ${a * (b % 10)}，合起来是几？` };
      const [x, y] = flip ? [b, a] : [a, b];
      return { text: `${x} × ${y} = ?`, speak: `${x} 乘 ${y} 等于几？`, answer: a * b, choices: numChoices(a * b), hint };
    },
  };

  // ---------- 除法 ----------
  T.div = {
    params(d) {
      if (d === 1) { const k = R(2, 4), q = R(2, 5); return { a: k * q, b: k }; }
      if (d === 2) { const b = R(2, 9), q = R(2, 9); return { a: b * q, b }; }
      const b = R(2, 5), q = R(11, Math.floor(99 / b)); return { a: b * q, b };
    },
    build({ a, b }, d) {
      const q = a / b;
      if (d === 1) {
        return {
          text: `${a} ÷ ${b} = ?`,
          sub: `把 ${a} 辆小汽车平均停进 ${b} 个车库，每个车库停几辆？`,
          speak: `把 ${a} 辆小汽车，平均停进 ${b} 个车库，每个车库停几辆？`,
          answer: q, choices: numChoices(q),
          hint: { say: `点“发车”，一辆一辆轮流停进车库，看看每个车库有几辆。`, vis: { kind: 'deal', total: a, k: b } },
        };
      }
      let hint;
      if (d === 2) hint = { say: `想一想：${b} 乘几等于 ${a}？`, vis: { kind: 'chips', val: b, count: 0, target: a } };
      else {
        const t = Math.floor(q / 10) * 10 * b, rest = a - t;
        hint = { say: `拆开算：${a} 等于 ${t} 加 ${rest}。${t} 除以 ${b} 等于 ${t / b}，${rest} 除以 ${b} 等于 ${rest / b}，合起来是几？` };
      }
      return { text: `${a} ÷ ${b} = ?`, speak: `${a} 除以 ${b} 等于几？`, answer: q, choices: numChoices(q), hint };
    },
  };

  // ---------- 填空（帮助理解减法、除法） ----------
  T.missing = {
    params(d) {
      if (d === 1) { const c = R(11, 20), b = R(2, 9); return { a: c - b, b, c }; }
      if (d === 2) { const a = R(10, 60), x = R(3, 35); return { a, b: x, c: a + x }; }
      if (d === 3) { const a = R(25, 99), x = R(3, a - 10); return { a, b: x, c: a - x }; }
      const b = R(2, 9), x = R(2, 9); return { a: x, b, c: x * b };
    },
    build({ a, b, c }, d) {
      if (d === 1) return { text: `□ + ${b} = ${c}`, speak: `几加 ${b} 等于 ${c}？`, answer: a, choices: numChoices(a), hint: { say: `想一想：${c} 减 ${b} 等于几？` } };
      if (d === 2) return { text: `${a} + □ = ${c}`, speak: `${a} 加几等于 ${c}？`, answer: c - a, choices: numChoices(c - a), hint: { say: `想一想：${c} 减 ${a} 等于几？` } };
      if (d === 3) return { text: `${a} − □ = ${c}`, speak: `${a} 减几等于 ${c}？`, answer: b, choices: numChoices(b), hint: { say: `想一想：${a} 减 ${c} 等于几？` } };
      return { text: `□ × ${b} = ${c}`, speak: `几乘 ${b} 等于 ${c}？`, answer: a, choices: numChoices(a), hint: { say: `想一想：${c} 除以 ${b} 等于几？` } };
    },
  };

  // ---------- 比大小 ----------
  T.compare = {
    params(d) {
      if (d === 1) { let x, y; do { x = R(10, 99); y = Math.random() < 0.5 ? tens(x) + R(0, 9) : R(10, 99); } while (x === y); return { x, y }; }
      if (d === 2) { const L = expr(pick(['add', 'sub'])); const r = L.v + pick([-3, -2, -1, 0, 0, 1, 2, 3]); return { L, r }; }
      const L = expr(pick(['add', 'sub', 'mul'])); let Rr = expr(pick(['add', 'sub', 'mul']));
      return { L, R: Rr };
    },
    build(p, d) {
      if (d === 1) {
        return {
          kind: 'pick', text: `${p.x}    ${p.y}`, sub: '哪个数大？点一点',
          speak: `${p.x} 和 ${p.y}，哪个数大？`, answer: Math.max(p.x, p.y), choices: [p.x, p.y],
          hint: { say: '先比十位，十位大的数就大；十位一样，再比个位。' },
        };
      }
      const l = p.L, rv = d === 2 ? p.r : p.R.v, rt = d === 2 ? `${p.r}` : p.R.t, rs = d === 2 ? `${p.r}` : p.R.s;
      return {
        kind: 'cmp', text: `${l.t}  ○  ${rt}`, sub: '选 大于、小于 还是 等于',
        speak: `${l.s}，和 ${rs} 比，选大于、小于，还是等于？`, answer: cmpOf(l.v, rv), choices: CMP.slice(),
        hint: { say: d === 2 ? `先算左边：${l.s} 等于几？再和 ${rs} 比。` : `先算左边：${l.s} 等于几？再算右边：${rs} 等于几？` },
      };
    },
  };

  // ---------- 应用题 ----------
  const WORD = {
    add: [
      { pic: '🅿️🚗', t: (a, b) => `停车场有 ${a} 辆车，又开来 ${b} 辆，现在一共有几辆？` },
      { pic: '🎁🚙', t: (a, b) => `汤姆有 ${a} 辆玩具车，生日又收到 ${b} 辆，现在有几辆？` },
    ],
    sub: [
      { pic: '🅿️🚕', t: (a, b) => `停车场有 ${a} 辆车，开走了 ${b} 辆，还剩几辆？` },
      { pic: '🧀🐭', t: (a, b) => `杰瑞有 ${a} 块奶酪，吃掉了 ${b} 块，还剩几块？` },
      { pic: '🚌👦', t: (a, b) => `公交车上有 ${a} 个人，到站下去 ${b} 个，车上还有几个人？` },
    ],
    mul: [
      { pic: '🚗🛞', t: (a, b) => `每辆汽车有 4 个轮子，${b} 辆汽车一共有几个轮子？`, a: 4 },
      { pic: '🚌👧', t: (a, b) => `每辆小巴坐 ${a} 个人，${b} 辆小巴一共坐几个人？` },
    ],
    div: [
      { pic: '🧀🐭', t: (a, b) => `${a} 块奶酪平均分给 ${b} 只小老鼠，每只分几块？` },
      { pic: '🛞🚗', t: (a, b) => `有 ${a} 个轮子，每辆车装 4 个，可以装几辆车？`, b: 4 },
    ],
  };
  T.word = {
    params(d) {
      const op = d === 3 ? pick(['mul', 'div']) : pick(['add', 'sub', 'sub']);
      const ti = R(0, WORD[op].length - 1), tpl = WORD[op][ti];
      let a, b;
      if (op === 'add') { if (d === 1) { a = R(3, 12); b = R(2, 8); } else { a = R(15, 60); b = R(5, 30); } }
      else if (op === 'sub') { if (d === 1) { a = R(11, 20); b = R(2, 9); } else { a = R(25, 90); b = R(6, a - 8); } }
      else if (op === 'mul') { a = tpl.a || R(3, 9); b = R(2, 9); }
      else { b = tpl.b || R(2, 5); a = b * R(2, 9); }
      return { op, ti, a, b };
    },
    build({ op, ti, a, b }) {
      const tpl = WORD[op][ti];
      const ans = op === 'add' ? a + b : op === 'sub' ? a - b : op === 'mul' ? a * b : a / b;
      const sign = { add: '+', sub: '−', mul: '×', div: '÷' }[op];
      const sayOp = { add: '加', sub: '减', mul: '乘', div: '除以' }[op];
      const eq = `${a} ${sign} ${b}`;
      const eqs = `${a} ${sayOp} ${b}`;
      const story = tpl.t(a, b);
      return {
        kind: 'word', pic: tpl.pic, text: story, speak: story, answer: ans, choices: numChoices(ans),
        hint: { say: `列个算式：${eqs}，等于几？`, eq: `${eq} = ?` },
      };
    },
  };

  const NAMES = { add: '加法', sub: '减法', mul: '乘法', div: '除法', missing: '填空', compare: '比大小', word: '应用题' };

  window.MathGen = {
    NAMES,
    gen(type, d) {
      const p = T[type].params(d);
      return this.build(type, d, p);
    },
    build(type, d, p) {
      const q = T[type].build(p, d);
      q.type = type; q.d = d; q.p = p;
      q.kind = q.kind || 'num';
      q.key = type + ':' + JSON.stringify(p);
      return q;
    },
  };
})();
