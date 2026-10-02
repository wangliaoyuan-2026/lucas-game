// Lucas 的闯关乐园 —— 主程序
(function () {
  const VERSION = 'v1.5';
  const app = document.getElementById('app');
  const $ = (s, el = document) => el.querySelector(s);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

  // ================= 存档（保存在本机） =================
  const KEY = 'lucas-game-v1';
  const DEFAULT = () => ({
    names: { cat: '汤姆', mouse: '杰瑞' },
    limit: 0,
    today: { date: '', sec: 0 },
    car: 'car',
    cars: ['car'],
    math: { stars: {}, diff: {}, up: {}, down: {}, review: [], stats: {}, wrongLog: [] },
    hanzi: { stars: {}, review: [], stats: {}, wrongLog: [] },
  });
  function merge(base, over) {
    if (over === undefined || over === null) return base;
    if (typeof over !== 'object' || Array.isArray(base)) return over;
    const out = { ...base };
    for (const k of Object.keys(over)) out[k] = (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) ? merge(base[k], over[k]) : over[k];
    return out;
  }
  function load() { try { return merge(DEFAULT(), JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { return DEFAULT(); } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
  let S = load();
  // v1.5：时间限制默认取消（老存档里的 20 分钟也改成不限，家长可以在设置里重新打开）
  if (S.limitVer !== 2) { S.limit = 0; S.limitVer = 2; save(); }

  // ================= 声音：朗读 + 音效 =================
  let zhVoice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    zhVoice = vs.find((v) => /zh[-_]CN/i.test(v.lang) && /Tingting|婷婷|Lili|Meijia/i.test(v.name))
      || vs.find((v) => /zh[-_]CN/i.test(v.lang)) || vs.find((v) => /^zh/i.test(v.lang)) || null;
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  // 机器朗读一句，读完时 resolve
  function speakP(text) {
    return new Promise((res) => {
      if (!('speechSynthesis' in window) || !text) return res();
      const u = new SpeechSynthesisUtterance(text.replace(/−/g, '减').replace(/×/g, '乘').replace(/÷/g, '除以'));
      u.lang = 'zh-CN'; if (zhVoice) u.voice = zhVoice; u.rate = 0.92; u.pitch = 1.1;
      u.onend = u.onerror = () => res();
      speechSynthesis.speak(u);
      setTimeout(res, 1500 + text.length * 350);
    });
  }

  // ---------- 妈妈的录音（voice/*.m4a），没加载好时用机器朗读兜底 ----------
  const VOICE = {
    praise: ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10'],
    wrong: ['B01', 'B02', 'B03'],
    tease: [['D01', '追不上我～'], ['D03', '嘿嘿，来呀！'], ['D04', '我跑啦！']],
  };
  const clips = {};
  let voicesLoading = false;
  function loadVoices() {
    const c = audio(); if (!c || voicesLoading) return; voicesLoading = true;
    const names = [...VOICE.praise, ...VOICE.wrong, ...VOICE.tease.map((t) => t[0]), 'C01', 'C02', 'C03', 'C04', 'C05', 'C06'];
    names.forEach((n) => fetch(`voice/${n}.m4a`).then((r) => r.arrayBuffer())
      .then((buf) => new Promise((ok, no) => c.decodeAudioData(buf, ok, no)))
      .then((b) => { clips[n] = b; }).catch(() => { }));
  }
  let vTok = 0, curSrc = null;
  function stopVoice() {
    vTok++;
    if (curSrc) { try { curSrc.stop(); } catch (e) { } curSrc = null; }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
  function playClip(name) {
    const b = clips[name], c = audio();
    if (!b || !c || S.momVoice === false) return null;
    return new Promise((res) => {
      const src = c.createBufferSource(); src.buffer = b; src.connect(c.destination);
      src.onended = () => { if (curSrc === src) curSrc = null; res(); };
      curSrc = src; src.start();
    });
  }
  // 依次播放：字符串 = 机器朗读；{ clip: 名字或名字数组, text: 兜底文字 } = 录音
  async function talk(...parts) {
    stopVoice(); const my = vTok;
    for (const p of parts) {
      if (my !== vTok) return;
      if (!p) continue;
      if (typeof p === 'string') { await speakP(p); continue; }
      const name = Array.isArray(p.clip) ? pick(p.clip) : p.clip;
      const pr = playClip(name);
      if (pr) await pr; else if (p.text) await speakP(p.text);
    }
  }
  const say = (text) => talk(text);

  let ac = null;
  // iOS 17+：让声音不受静音键影响
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { }
  function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (ac && ac.state === 'suspended') ac.resume(); return ac; }
  function tone(freq, dur, type = 'sine', vol = 0.18, when = 0, slide = 0) {
    const c = audio(); if (!c) return;
    const t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const fx = {
    tap() { tone(520, 0.06, 'sine', 0.12); },
    ok() { tone(660, 0.12); tone(990, 0.22, 'sine', 0.18, 0.1); },
    bad() { tone(300, 0.3, 'triangle', 0.18, 0, 0.6); },
    vroom() { tone(90, 0.5, 'sawtooth', 0.06, 0, 2.5); },
    win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.28, 'square', 0.07, i * 0.13)); },
    star(i) { tone(880 + i * 220, 0.2, 'triangle', 0.15, 0); },
  };

  // ================= 每日时长（油箱） =================
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  function ensureToday() { if (S.today.date !== todayStr()) S.today = { date: todayStr(), sec: 0 }; }
  const outOfFuel = () => { ensureToday(); return S.limit > 0 && S.today.sec >= S.limit * 60; };
  const fuelLeft = () => (S.limit > 0 ? Math.max(0, 1 - S.today.sec / (S.limit * 60)) : 1);
  let started = false;
  setInterval(() => {
    // 只统计真正在闯关的时间（首页、地图、家长设置不算）
    if (!started || !run || document.visibilityState !== 'visible') return;
    ensureToday(); S.today.sec++;
    if (S.today.sec % 10 === 0) save();
    const f = $('.fuel i'); if (f) f.style.width = (fuelLeft() * 100) + '%';
  }, 1000);

  // ================= 小组件 =================
  const vehicle = (id) => VEHICLES.find((v) => v.id === id) || VEHICLES[0];
  const AVATAR_KEY = 'lucas-game-avatar';
  // 默认用内置的 Lucas 照片；家长设置里可以换别的照片，或者去掉（存成 'none'）
  const AVATAR_DEFAULT = 'img/lucas.jpg';
  let avatar = AVATAR_DEFAULT;
  try { const v = localStorage.getItem(AVATAR_KEY); if (v) avatar = v === 'none' ? null : v; } catch (e) { }
  const rider = (who, mood) => actor(who, mood, avatar);
  const starsHtml = (n, max = 3) => Array.from({ length: max }, (_, i) => `<span class="${i < n ? 'on' : ''}">★</span>`).join('');
  const totalStars = () => ['math', 'hanzi'].reduce((t, k) => t + Object.values(S[k].stars).reduce((a, b) => a + b, 0), 0);

  // 科目：数学、汉字（以后加成语、英文）
  const SUBJECTS = {
    math: { key: 'math', icon: '🔢', name: '数学闯关', levels: MATH_LEVELS, stations: MATH_STATIONS },
    hanzi: { key: 'hanzi', icon: '🀄', name: '汉字闯关', levels: HanziGen.levels, stations: HanziGen.stations },
  };
  let cur = SUBJECTS.math;
  const SD = () => S[cur.key];

  function screen(html, cls = '') {
    app.className = cls; app.innerHTML = html;
    window.scrollTo(0, 0);
  }
  function modal(html) {
    const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = `<div class="box">${html}</div>`;
    document.body.appendChild(m); return m;
  }
  function confetti(n = 40) {
    const box = document.createElement('div'); box.className = 'confetti';
    const items = ['⭐', '🎉', '✨', '🧀', '🚗', '🎈'];
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span'); s.textContent = pick(items);
      s.style.left = Math.random() * 100 + 'vw'; s.style.animationDelay = Math.random() * 1.2 + 's';
      s.style.fontSize = (4 + Math.random() * 4) + 'vmin'; box.appendChild(s);
    }
    document.body.appendChild(box); setTimeout(() => box.remove(), 4500);
  }

  // 长按触发（家长入口）
  function longPress(el, ms, fn) {
    let t = null;
    const start = (e) => { e.preventDefault(); el.classList.add('pressing'); t = setTimeout(() => { el.classList.remove('pressing'); fn(); }, ms); };
    const end = () => { clearTimeout(t); el.classList.remove('pressing'); };
    el.addEventListener('pointerdown', start); ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => el.addEventListener(ev, end));
  }

  // ================= 开始页 =================
  function showSplash() {
    const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
    screen(`
      <div class="splash">
        <h1>Lucas 的<br>闯关乐园</h1>
        <div class="duo">${rider('tom', 'happy')}${rider('jerry')}</div>
        <button class="big go" id="go">开 始 ▶</button>
        ${standalone ? '' : '<p class="tip">在 Safari 点「分享」→「添加到主屏幕」，没有网络也能玩</p>'}
      </div>`, 'bg-sky');
    $('#go').onclick = () => {
      started = true; audio(); fx.win();
      loadVoices();
      setTimeout(() => talk({ clip: 'C01', text: `Lucas，欢迎来到闯关乐园！帮${S.names.cat}抓住${S.names.mouse}吧！` }), 400);
      showHome();
    };
  }

  // ================= 首页 =================
  function showHome() {
    if (outOfFuel()) return showFuelOut();
    const subjects = [
      { id: 'math', icon: '🔢', name: '数学闯关', open: true },
      { id: 'hanzi', icon: '🀄', name: '汉字闯关', open: true },
      { id: 'idiom', icon: '📜', name: '成语闯关' },
      { id: 'english', icon: '🔤', name: '英文闯关' },
    ];
    screen(`
      <header class="bar">
        <div class="pill">⭐ ${totalStars()}</div>
        ${S.limit > 0 ? `<div class="fuel" title="今天的油">⛽<b><i style="width:${fuelLeft() * 100}%"></i></b></div>` : '<div></div>'}
        <button class="pill" id="garage">🚗 收藏</button>
        <button class="gear" id="gear" aria-label="家长">⚙️</button>
      </header>
      <h2 class="hello">${S.names.cat}要去抓${S.names.mouse}啦！选一个闯关：</h2>
      <div class="subjects">
        ${subjects.map((s) => `<button class="subject ${s.open ? '' : 'locked'}" data-id="${s.id}">
          <span class="icon">${s.icon}</span><span>${s.name}</span>${s.open ? '' : '<small>即将开放</small>'}</button>`).join('')}
      </div>`, 'bg-sky');
    app.querySelectorAll('.subject').forEach((b) => b.onclick = () => {
      fx.tap();
      if (SUBJECTS[b.dataset.id]) { cur = SUBJECTS[b.dataset.id]; showMap(); }
      else say('这个闯关还在建造中，很快就来！');
    });
    $('#garage').onclick = () => { fx.tap(); showGarage(); };
    longPress($('#gear'), 2000, parentGate);
    $('#gear').onclick = () => say('这是爸爸妈妈的按钮哦');
  }

  // ================= 关卡地图 =================
  const levelById = (id) => cur.levels.find((l) => l.id === id);
  const isUnlocked = (id) => id === 1 || (SD().stars[id - 1] || 0) > 0;
  function showMap() {
    if (outOfFuel()) return showFuelOut();
    const next = cur.levels.find((l) => isUnlocked(l.id) && !SD().stars[l.id]);
    screen(`
      <header class="bar">
        <button class="pill" id="back">◀ 返回</button>
        <div class="pill">${cur.icon} ${cur.name}</div>
        <div class="pill">⭐ ${totalStars()}</div>
      </header>
      <div class="map">
        ${cur.stations.map((st) => `
          <section class="station"><h3>${st.name}</h3><div class="nodes">
          ${st.levels.map((id) => {
            const lv = levelById(id); if (!lv) return '';
            const open = isUnlocked(id), st3 = SD().stars[id] || 0;
            return `<button class="node ${lv.boss ? 'boss' : ''} ${open ? '' : 'locked'} ${next && next.id === id ? 'next' : ''}" data-id="${id}">
              <span class="num">${open ? (lv.boss ? '👑' : id) : '🔒'}</span>
              <span class="nm">${lv.name}</span>
              <span class="stars">${starsHtml(st3)}</span></button>`;
          }).join('')}
          </div></section>`).join('')}
      </div>`, 'bg-grass');
    $('#back').onclick = () => { fx.tap(); showHome(); };
    app.querySelectorAll('.node').forEach((b) => b.onclick = () => {
      const id = +b.dataset.id;
      if (!isUnlocked(id)) { fx.bad(); talk({ clip: 'C05', text: '先通过前面的关卡才能解锁哦' }); return; }
      fx.tap(); startLevel(levelById(id));
    });
    const n = $('.node.next'); if (n) n.scrollIntoView({ block: 'center' });
  }

  // ================= 闯关 =================
  let run = null;
  const PRAISE = ['太棒了！', '真厉害！', '答对啦！', '好聪明！', '追上一步！', '漂亮！'];
  const ENCOURAGE = ['再想想哦，看看提示', '差一点点，再试一次', '没关系，看看提示'];
  const TEASE = ['追不上我～', '略略略～', '嘿嘿，来呀！', '我跑啦！'];

  function curDiff(type, lv) {
    const [mn, mx] = lv.types[type];
    const d = S.math.diff[type] || mn;
    return Math.max(mn, Math.min(mx, d));
  }
  function adapt(type, lv, correctFirst) {
    const [mn, mx] = lv.types[type];
    const m = S.math; const d = curDiff(type, lv);
    if (correctFirst) {
      m.up[type] = (m.up[type] || 0) + 1; m.down[type] = 0;
      if (m.up[type] >= 3 && d < mx) { m.diff[type] = d + 1; m.up[type] = 0; }
    } else {
      m.down[type] = (m.down[type] || 0) + 1; m.up[type] = 0;
      if (m.down[type] >= 2 && d > mn) { m.diff[type] = d - 1; m.down[type] = 0; }
    }
  }

  function startLevel(lv) {
    if (outOfFuel()) return showFuelOut();
    let plan;
    if (cur.key === 'hanzi') plan = HanziGen.plan(lv, S.hanzi.review);
    else {
      const n = lv.n || (lv.boss ? 10 : 8);
      const types = Object.keys(lv.types);
      // 错题复习：从复习池里挑最多 2 道本关题型的题
      const reviews = S.math.review.filter((r) => lv.types[r.type]).slice(0, 2);
      const pool = [];
      plan = [];
      while (pool.length < n - reviews.length) pool.push(...shuffle(types.slice()));
      pool.length = n - reviews.length;
      pool.forEach((t) => plan.push({ type: t }));
      reviews.forEach((r) => plan.splice(1 + Math.floor(Math.random() * plan.length), 0, { review: r }));
    }
    run = { subj: cur, lv, plan, n: plan.length, i: 0, wrong: 0, q: null, wrongThis: 0, t0: Date.now(), seen: new Set() };
    renderPlay();
    fx.vroom();
    say(`第 ${lv.id} 关，${lv.name}！`);
    setTimeout(nextQ, 1200);
  }

  function renderPlay() {
    const { lv } = run;
    screen(`
      <div class="play">
        <header class="bar">
          <button class="pill" id="quit">✕</button>
          <div class="progress">${Array.from({ length: run.n }, (_, i) => `<i data-i="${i}"></i>`).join('')}</div>
          <button class="pill" id="speak">🔊</button>
        </header>
        <div class="road ${lv.boss ? 'boss' : ''}">
          <div class="lane"></div>
          <img class="cheese" src="img/cheese.png" alt="">
          <div id="jerry" class="pos">${rider('jerry')}<div class="bubble" id="bubble"></div></div>
          <div id="tom" class="pos">${rider('tom')}</div>
        </div>
        <div class="qcard" id="qcard"></div>
        <div class="choices" id="choices"></div>
      </div>`, 'bg-road');
    moveTom();
    $('#quit').onclick = () => {
      fx.tap();
      const m = modal(`<p>要离开这一关吗？</p><div class="row"><button class="big" id="stay">继续玩</button><button class="big ghost" id="leave">离开</button></div>`);
      $('#stay', m).onclick = () => m.remove();
      $('#leave', m).onclick = () => { m.remove(); speechSynthesis && speechSynthesis.cancel(); run = null; showMap(); };
    };
    $('#speak').onclick = () => run && run.q && say(run.q.speak);
  }

  function moveTom(final) {
    const t = $('#tom'); if (!t) return;
    const pct = final ? 70 : 4 + (run.i / run.n) * 58;
    t.style.left = pct + '%';
  }

  function nextQ() {
    if (!run) return;
    if (run.i >= run.n) return finishLevel();
    const step = run.plan[run.i];
    let q;
    if (run.subj.key === 'hanzi') q = step.review ? HanziGen.make(step.review.c, step.review.type, run.lv) : HanziGen.make(step.c, step.type, run.lv);
    else if (step.review) q = MathGen.build(step.review.type, step.review.d, step.review.p);
    else {
      let tries = 0;
      do { q = MathGen.gen(step.type, curDiff(step.type, run.lv)); } while (run.seen.has(q.key) && ++tries < 10);
    }
    run.seen.add(q.key);
    q.isReview = !!step.review;
    run.q = q; run.wrongThis = 0;
    app.querySelectorAll('.progress i').forEach((el, k) => el.className = k < run.i ? 'done' : k === run.i ? 'cur' : '');

    const card = $('#qcard');
    card.className = 'qcard ' + q.kind;
    card.innerHTML = `
      ${q.isReview ? '<div class="tag">复习题</div>' : ''}
      ${q.pic ? `<div class="pic">${q.pic}</div>` : ''}
      <div class="qtext ${q.textClass || ''}">${q.text.replace('?', '<span class="qm">?</span>').replace('□', '<span class="qm">□</span>').replace('○', '<span class="qm">○</span>')}</div>
      ${q.sub ? `<div class="qsub">${q.sub}</div>` : ''}
      <div class="hint" id="hint" hidden></div>`;
    card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');

    const ch = $('#choices');
    ch.className = 'choices n' + q.choices.length;
    const label = (c) => q.kind === 'cmp' ? `<b>${c}</b><small>${{ '>': '大于', '<': '小于', '=': '等于' }[c]}</small>` : `<b>${c}</b>`;
    ch.classList.toggle('hz', q.kind === 'hz'); ch.classList.toggle('emo', q.kind === 'hzpic');
    ch.innerHTML = q.choices.map((c) => `<button class="choice" data-v="${c}">${label(c)}</button>`).join('');
    ch.querySelectorAll('.choice').forEach((b) => b.onclick = () => answer(b));
    const lt = $('.qtext.listen', card); if (lt) lt.onclick = () => say(q.speak);
    say(q.speak);
  }

  function answer(btn) {
    const q = run.q; if (!q || btn.disabled || run.locked) return;
    const v = btn.dataset.v;
    const right = String(q.answer) === v;
    const D = S[run.subj.key], isMath = run.subj.key === 'math';
    const stats = D.stats[q.type] || (D.stats[q.type] = { right: 0, wrong: 0 });
    if (right) {
      run.locked = true;
      btn.classList.add('right'); fx.ok();
      const first = run.wrongThis === 0;
      if (first) stats.right++;
      if (isMath && !q.isReview) adapt(q.type, run.lv, first);
      if (first && q.isReview) D.review = D.review.filter((r) => r.key !== q.key);
      const praised = talk({ clip: VOICE.praise, text: pick(PRAISE) });
      run.i++; moveTom();
      $('#tom .actor').classList.add('zoom');
      setTimeout(() => { const r = $('#tom .actor'); if (r) r.classList.remove('zoom'); }, 600);
      save();
      const go = () => { if (run) { run.locked = false; nextQ(); } };
      if (q.learn) Promise.all([praised, new Promise((r) => setTimeout(r, 700))]).then(() => { if (run && run.q === q) showLearn(q.learn, go); });
      else setTimeout(go, 1300);
    } else {
      btn.classList.add('wrong'); btn.disabled = true; fx.bad();
      if (run.wrongThis === 0) {
        run.wrong++; stats.wrong++;
        if (isMath && !q.isReview) adapt(q.type, run.lv, false);
        if (!D.review.some((r) => r.key === q.key)) {
          D.review.push(isMath ? { type: q.type, d: q.d, p: q.p, key: q.key } : { type: q.type, c: q.c, key: q.key });
          if (D.review.length > 30) D.review.shift();
        }
        D.wrongLog.unshift({ t: q.log || q.text, a: q.answer, pick: v, at: Date.now() });
        D.wrongLog.length = Math.min(D.wrongLog.length, 50);
        save();
      }
      run.wrongThis++;
      jerryTease();
      showHint(q);
    }
  }

  function jerryTease() {
    const b = $('#bubble'); if (!b) return;
    const [clip, text] = pick(VOICE.tease);
    run.teaseClip = { clip };
    b.textContent = text; b.classList.add('show');
    $('#jerry .actor').classList.add('wiggle');
    setTimeout(() => { b.classList.remove('show'); const r = $('#jerry .actor'); if (r) r.classList.remove('wiggle'); }, 1600);
  }

  // ================= 提示 =================
  function showHint(q) {
    const h = $('#hint'); if (!h) return;
    h.hidden = false;
    $('#qcard').classList.add('has-hint');
    const enc = pick(ENCOURAGE);
    h.innerHTML = `<div class="hint-say">💡 ${q.hint.say}</div>${q.hint.html || ''}${q.hint.eq ? `<div class="hint-eq">${q.hint.eq}</div>` : ''}${q.hint.vis ? renderVis(q.hint.vis) : ''}`;
    if (q.hint.vis && q.hint.vis.kind === 'deal') bindDeal(h, q.hint.vis);
    talk(run.teaseClip, { clip: VOICE.wrong, text: enc }, q.hint.say);
  }

  function renderVis(v) {
    if (v.kind === 'numline') {
      const cnt = v.hi - v.lo, W = 640, pad = 22, step = (W - pad * 2) / cnt;
      let s = `<svg class="numline" viewBox="0 0 ${W} 74"><line x1="${pad}" y1="30" x2="${W - pad}" y2="30" stroke="#555" stroke-width="3"/>`;
      for (let i = 0; i <= cnt; i++) {
        const x = pad + i * step, n = v.lo + i, isStart = n === v.start;
        s += `<line x1="${x}" y1="22" x2="${x}" y2="38" stroke="#555" stroke-width="2"/>`;
        if (isStart) s += `<circle cx="${x}" cy="30" r="9" fill="#e74c3c"/><text x="${x}" y="14" text-anchor="middle" font-size="13" fill="#e74c3c">从这里</text>`;
        s += `<text x="${x}" y="60" text-anchor="middle" font-size="${cnt > 16 ? 16 : 20}" fill="${isStart ? '#e74c3c' : '#333'}" font-weight="${isStart ? 700 : 400}">${n}</text>`;
      }
      return s + '</svg>';
    }
    if (v.kind === 'blocks') {
      return `<div class="blocks">${v.nums.map((n, k) => `<div class="blk">${'<i class="ten"></i>'.repeat(Math.floor(n / 10))}${'<i class="one"></i>'.repeat(n % 10)}<em>${n}</em></div>${k < v.nums.length - 1 ? '<b>+</b>' : ''}`).join('')}</div>`;
    }
    if (v.kind === 'chips') {
      if (v.target) return '';
      return `<div class="chips">${Array.from({ length: v.count }, () => `<span>${v.val}</span>`).join('<b>+</b>')}</div>`;
    }
    if (v.kind === 'deal') {
      return `<div class="deal"><div class="lot">${'<span>🚗</span>'.repeat(v.total)}</div>
        <div class="garages">${Array.from({ length: v.k }, () => '<div class="gar"></div>').join('')}</div>
        <button class="big small" id="dealBtn">🚗 发车</button></div>`;
    }
    return '';
  }
  function bindDeal(root, v) {
    let k = 0;
    const btn = $('#dealBtn', root);
    btn.onclick = () => {
      const car = $('.lot span:not(.gone)', root); if (!car) return;
      car.classList.add('gone');
      const gar = root.querySelectorAll('.gar')[k % v.k];
      const c = document.createElement('span'); c.textContent = '🚗'; gar.appendChild(c);
      fx.tap(); k++;
      if (k >= v.total) { btn.disabled = true; btn.textContent = '停好啦！每个车库有几辆？'; say('停好啦！数一数，每个车库有几辆？'); }
    };
  }

  // ================= 汉字学习卡 =================
  function showLearn(it, done) {
    const card = $('#qcard'); if (!card) return;
    const hl = (str) => str.split(it.c).join(`<em>${it.c}</em>`);
    card.className = 'qcard learn pop';
    card.innerHTML = `
      <div class="lc-top">${it.e ? `<span class="lc-pic">${it.e}</span>` : ''}<div><div class="lc-py">${it.py}</div><div class="lc-char">${it.c}</div></div></div>
      <div class="lc-words">${it.w.map((w) => `<button class="lc-w" data-w="${w}">${hl(w)}</button>`).join('')}</div>
      <button class="lc-sent" data-w="${it.s}">🔊 ${hl(it.s)}</button>`;
    $('#choices').innerHTML = '<button class="big" id="goOn">继续追 ▶</button>';
    $('#choices').className = 'choices one';
    say(`${it.w[0]}的${it.c}。${it.w.join('，')}。${it.s}`);
    card.querySelectorAll('[data-w]').forEach((b) => b.onclick = () => say(b.dataset.w));
    $('#goOn').onclick = () => { fx.tap(); done(); };
  }

  // ================= 通关 =================
  function finishLevel() {
    const { lv, wrong } = run;
    const stars = wrong === 0 ? 3 : wrong <= 2 ? 2 : 1;
    const D = S[run.subj.key];
    const firstClear = !D.stars[lv.id];
    D.stars[lv.id] = Math.max(D.stars[lv.id] || 0, stars);
    // 任何科目第一次通关一关，就收集下一辆车
    let newCar = null;
    if (firstClear) { newCar = VEHICLES.find((v) => !S.cars.includes(v.id)) || null; if (newCar) S.cars.push(newCar.id); }
    save();
    // 抓住动画
    moveTom(true);
    $('#jerry').innerHTML = rider('jerry', 'dizzy');
    $('#qcard').innerHTML = ''; $('#choices').innerHTML = '';
    fx.vroom();
    setTimeout(() => {
      fx.win(); confetti();
      talk({ clip: 'C02', text: `抓到啦！${S.names.cat}抓住了${S.names.mouse}！` }, newCar && { clip: 'C03', text: '你获得了一辆新车！' }, newCar && newCar.name + '！');
      const secs = Math.round((Date.now() - run.t0) / 1000);
      const next = levelById(lv.id + 1);
      const fuel = outOfFuel();
      const m = modal(`
        <h2>抓到啦！</h2>
        <div class="caught">${rider('tom', 'happy')}<div class="cage">${rider('jerry', 'dizzy')}</div></div>
        <div class="bigstars">${starsHtml(0)}</div>
        <p class="meta">用时 ${Math.floor(secs / 60)} 分 ${secs % 60} 秒 · 答错 ${wrong} 次</p>
        ${newCar ? `<div class="newcar"><span>${newCar.e}</span>获得新车：<b>${newCar.name}</b></div>` : ''}
        <div class="row">
          <button class="big ghost" id="again">再玩一次</button>
          ${fuel ? '<button class="big" id="home">今天的油用完啦</button>' : next ? '<button class="big" id="next">下一关 ▶</button>' : '<button class="big" id="home">回地图</button>'}
        </div>`);
      const sEls = m.querySelectorAll('.bigstars span');
      for (let i = 0; i < stars; i++) setTimeout(() => { sEls[i].classList.add('on'); fx.star(i); }, 500 + i * 400);
      $('#again', m).onclick = () => { m.remove(); startLevel(lv); };
      const nb = $('#next', m); if (nb) nb.onclick = () => { m.remove(); startLevel(next); };
      const hb = $('#home', m); if (hb) hb.onclick = () => { m.remove(); run = null; showMap(); };
      run = null;
    }, 1200);
  }

  // ================= 车库 =================
  function showGarage() {
    screen(`
      <header class="bar"><button class="pill" id="back">◀ 返回</button><div class="pill">🚗 汽车收藏 ${S.cars.length}/${VEHICLES.length}</div><div></div></header>
      <p class="hello">数学、汉字每通过一个新关卡，就能收集一辆新车！点一点听听名字</p>
      <div class="garage">
        ${VEHICLES.map((v, i) => {
          const has = S.cars.includes(v.id);
          return `<button class="car ${has ? '' : 'locked'} " data-id="${v.id}">
            <span class="veh">${v.e}</span><span>${has ? v.name : '继续闯关解锁'}</span></button>`;
        }).join('')}
      </div>`, 'bg-sky');
    $('#back').onclick = () => { fx.tap(); showHome(); };
    app.querySelectorAll('.car').forEach((b) => b.onclick = () => {
      const v = vehicle(b.dataset.id);
      if (!S.cars.includes(v.id)) { fx.bad(); talk({ clip: 'C06', text: '这辆车还没解锁，继续闯关就能得到！' }); return; }
      fx.vroom(); say(v.name + '！');
    });
  }

  // ================= 没油了 =================
  function showFuelOut() {
    screen(`
      <div class="splash">
        <h1>今天的油用完啦</h1>
        <div class="duo">${rider('tom', 'sleep')}</div>
        <p class="hello">${S.names.cat}要去加油、睡觉啦，明天再来抓${S.names.mouse}吧！</p>
        <button class="gear" id="gear" aria-label="家长">⚙️</button>
      </div>`, 'bg-night');
    talk({ clip: 'C04', text: `今天的油用完啦，${S.names.cat}要睡觉了，明天再来吧！` });
    longPress($('#gear'), 2000, parentGate);
  }

  // ================= 家长 =================
  function parentGate() {
    const a = 12 + Math.floor(Math.random() * 80), b = 12 + Math.floor(Math.random() * 30);
    const m = modal(`<p>家长验证：${a} × ${b} = ?</p><input id="pa" inputmode="numeric" pattern="[0-9]*" autocomplete="off"><div class="row"><button class="big ghost" id="cancel">取消</button><button class="big" id="ok">进入</button></div>`);
    $('#pa', m).focus();
    $('#cancel', m).onclick = () => m.remove();
    $('#ok', m).onclick = () => { if (+$('#pa', m).value === a * b) { m.remove(); showParent(); } else { $('#pa', m).value = ''; $('#pa', m).placeholder = '不对，再试一次'; } };
  }
  function showParent() {
    const st = S.math.stats;
    const rows = Object.keys(MathGen.NAMES).map((t) => {
      const s = st[t] || { right: 0, wrong: 0 }, all = s.right + s.wrong;
      return `<tr><td>${MathGen.NAMES[t]}</td><td>${all}</td><td>${all ? Math.round(s.right / all * 100) + '%' : '-'}</td><td>${S.math.diff[t] || '-'}</td></tr>`;
    }).join('');
    const log = S.math.wrongLog.slice(0, 12).map((w) => `<li>${w.t.includes('?') ? w.t.replace('?', w.a) : w.t + ' → ' + w.a} <small>（选了 ${w.pick}）</small></li>`).join('') || '<li>暂无</li>';
    const hzRows = Object.keys(HanziGen.NAMES).map((t) => {
      const x = S.hanzi.stats[t] || { right: 0, wrong: 0 }, all = x.right + x.wrong;
      return `<tr><td>${HanziGen.NAMES[t]}</td><td>${all}</td><td>${all ? Math.round(x.right / all * 100) + '%' : '-'}</td></tr>`;
    }).join('');
    const hzLog = S.hanzi.wrongLog.slice(0, 12).map((w) => `<li>${w.t} <small>（选了 ${w.pick}）</small></li>`).join('') || '<li>暂无</li>';
    screen(`
      <header class="bar"><button class="pill" id="back">◀ 返回</button><div class="pill">⚙️ 家长设置</div><div class="pill">${VERSION}</div></header>
      <div class="parent">
        <section><h3>角色名字</h3>
          <label>猫：<input id="ncat" value="${S.names.cat}"></label>
          <label>老鼠：<input id="nmouse" value="${S.names.mouse}"></label></section>
        <section><h3>猫头像（Lucas 的照片）</h3>
          <div class="ava-row"><div class="ava-prev">${rider('tom', 'happy')}</div>
          <div><label class="mini file">📷 选择照片<input type="file" id="photo" accept="image/*" hidden></label>
          ${avatar ? '<button class="mini" id="noPhoto">去掉照片</button>' : ''}
          ${avatar !== AVATAR_DEFAULT ? '<button class="mini" id="defPhoto">用回默认照片</button>' : ''}
          <p class="note">默认是游戏里自带的 Lucas 照片。在这里换的照片只保存在这台设备上。</p></div></div></section>
        <section><h3>声音</h3>
          <label><input type="checkbox" id="mom" ${S.momVoice === false ? '' : 'checked'}> 用妈妈的录音（夸奖、鼓励、通关等），关掉就全部用机器朗读</label></section>
        <section><h3>每天时长</h3>
          <label>每天可以玩 <select id="limit">${[10, 15, 20, 30, 45, 60, 0].map((n) => `<option value="${n}" ${S.limit === n ? 'selected' : ''}>${n ? n + ' 分钟' : '不限'}</option>`).join('')}</select></label>
          <p>今天已玩 ${Math.floor(S.today.sec / 60)} 分钟 <button class="mini" id="resetToday">重置今天</button></p></section>
        <section><h3>数学情况</h3>
          <table><tr><th>题型</th><th>做过</th><th>一次答对</th><th>当前难度</th></tr>${rows}</table>
          <p>待复习错题：${S.math.review.length} 道 · 已通关 ${Object.keys(S.math.stars).length}/${MATH_LEVELS.length} 关 · 星星 ${totalStars()}</p>
          <h4>最近答错</h4><ul class="log">${log}</ul></section>
        <section><h3>汉字情况</h3>
          <table><tr><th>题型</th><th>做过</th><th>一次答对</th></tr>${hzRows}</table>
          <p>待复习的字：${S.hanzi.review.map((r) => r.c).filter((c, i, a) => a.indexOf(c) === i).join(' ') || '暂无'} · 已通关 ${Object.keys(S.hanzi.stars).length}/${HanziGen.levels.length} 关</p>
          <h4>最近答错</h4><ul class="log">${hzLog}</ul>
          <details><summary>查看全部 ${HanziGen.ALL.length} 个字</summary><p class="hz-all">${HANZI_LESSONS.map((L) => `<b>${L.name}</b> ${L.list.map((x) => x.c).join(' ')}`).join('<br>')}</p></details></section>
        <section><h3>危险操作</h3><button class="mini danger" id="wipe">清空全部进度</button></section>
      </div>`, 'bg-plain');
    $('#back').onclick = () => {
      S.names.cat = $('#ncat').value.trim() || '汤姆';
      S.names.mouse = $('#nmouse').value.trim() || '杰瑞';
      S.limit = +$('#limit').value; S.momVoice = $('#mom').checked; save(); showHome();
    };
    $('#photo').onchange = (e) => { const f = e.target.files[0]; if (f) cropPhoto(f); };
    const np = $('#noPhoto'); if (np) np.onclick = () => { avatar = null; try { localStorage.setItem(AVATAR_KEY, 'none'); } catch (e) { } showParent(); };
    const dp = $('#defPhoto'); if (dp) dp.onclick = () => { avatar = AVATAR_DEFAULT; try { localStorage.removeItem(AVATAR_KEY); } catch (e) { } showParent(); };
    $('#resetToday').onclick = () => { S.today = { date: todayStr(), sec: 0 }; save(); showParent(); };
    $('#wipe').onclick = () => {
      const m = modal(`<p>确定清空所有星星、车库和记录吗？不能恢复。</p><div class="row"><button class="big ghost" id="no">取消</button><button class="big danger" id="yes">清空</button></div>`);
      $('#no', m).onclick = () => m.remove();
      $('#yes', m).onclick = () => { m.remove(); S = DEFAULT(); save(); showParent(); };
    };
  }

  // 照片裁剪：拖动移动、滑块缩放，圆形里的部分会放到猫头上
  function cropPhoto(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const m = modal(`<p>拖动照片，把脸放进圆圈里</p>
        <div class="crop"><canvas id="cv" width="560" height="560"></canvas></div>
        <input type="range" id="zoom" min="1" max="4" step="0.01" value="1.4">
        <div class="row"><button class="big ghost" id="cancel">取消</button><button class="big" id="use">用这张</button></div>`);
      const cv = $('#cv', m), ctx = cv.getContext('2d'), N = 560;
      const base = N / Math.min(img.width, img.height);
      let z = 1.4, cx = img.width / 2, cy = img.height * 0.4;
      const draw = (c, size) => {
        const sc = base * z * size / N;
        c.save(); c.fillStyle = '#fff'; c.fillRect(0, 0, size, size);
        c.translate(size / 2, size / 2); c.scale(sc, sc); c.drawImage(img, -cx, -cy); c.restore();
      };
      const paint = () => {
        draw(ctx, N);
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.rect(0, 0, N, N);
        ctx.arc(N / 2, N / 2, N * 0.42, 0, Math.PI * 2, true); ctx.fill('evenodd'); ctx.restore();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(N / 2, N / 2, N * 0.42, 0, Math.PI * 2); ctx.stroke();
      };
      paint();
      let drag = null;
      cv.onpointerdown = (e) => { drag = { x: e.clientX, y: e.clientY, cx, cy }; cv.setPointerCapture(e.pointerId); };
      cv.onpointermove = (e) => {
        if (!drag) return;
        const k = (N / cv.getBoundingClientRect().width) / (base * z);
        cx = drag.cx - (e.clientX - drag.x) * k; cy = drag.cy - (e.clientY - drag.y) * k; paint();
      };
      cv.onpointerup = cv.onpointercancel = () => { drag = null; };
      $('#zoom', m).oninput = (e) => { z = +e.target.value; paint(); };
      $('#cancel', m).onclick = () => { m.remove(); URL.revokeObjectURL(url); };
      $('#use', m).onclick = () => {
        // 只取圆圈里的部分，存成 240px 小图
        const out = document.createElement('canvas'), O = 240; out.width = out.height = O;
        const full = document.createElement('canvas'); full.width = full.height = N; draw(full.getContext('2d'), N);
        const r = N * 0.42; out.getContext('2d').drawImage(full, N / 2 - r, N / 2 - r, r * 2, r * 2, 0, 0, O, O);
        avatar = out.toDataURL('image/jpeg', 0.85);
        try { localStorage.setItem(AVATAR_KEY, avatar); } catch (e) { }
        m.remove(); URL.revokeObjectURL(url); showParent();
      };
    };
    img.src = url;
  }

  // 阻止 iOS 双指缩放
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  showSplash();

  if ('serviceWorker' in navigator && location.protocol !== 'file:' && location.hostname !== 'localhost') {
    navigator.serviceWorker.register('sw.js').catch(() => { });
  }
})();
