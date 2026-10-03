// Lucas 的闯关乐园 —— 主程序
(function () {
  const VERSION = 'v1.8';
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
    english: { stars: {}, review: [], stats: {}, wrongLog: [] },
    cards: [],    // 汉字奖励：动物明信片
    magnets: [],  // 英文奖励：冰箱贴
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
  // 每台设备一个 ID：统计按设备分开记，多设备同步时相加
  let DEV = null;
  try { DEV = localStorage.getItem('lucas-game-dev'); if (!DEV) { DEV = Math.random().toString(36).slice(2, 10); localStorage.setItem('lucas-game-dev', DEV); } } catch (e) { DEV = 'dev'; }
  function migrate() {
    ['math', 'hanzi', 'english'].forEach((k) => {
      const D = S[k];
      if (!D.statsBy) { D.statsBy = { [DEV]: D.stats || {} }; delete D.stats; }
      if (!D.mastered) D.mastered = {};
      D.review.forEach((r) => { if (!r.at) r.at = 1; });
    });
  }
  migrate();
  // v1.8：奖励按科目分开。以前汉字关也送车（车保留），按已通过的汉字关数补发明信片
  if (!S.rewardVer) { S.cards = POSTCARDS.slice(0, Object.keys(S.hanzi.stars).length).map((c) => c.id); S.rewardVer = 1; }
  save();
  const myStats = (D) => D.statsBy[DEV] || (D.statsBy[DEV] = {});
  const sumStats = (D) => {
    const o = {};
    Object.values(D.statsBy || {}).forEach((m) => { for (const t in m) { o[t] = o[t] || { right: 0, wrong: 0 }; o[t].right += m[t].right; o[t].wrong += m[t].wrong; } });
    return o;
  };

  // ---------- 多设备同步 ----------
  let redraw = null; // 当前页面（首页/地图/车库）的重画函数，同步拿到新进度时用
  function syncNow() {
    if (!window.Sync || !Sync.enabled) return Promise.resolve(null);
    return Sync.sync(() => S, (m) => { S = m; migrate(); save(); }, () => {
      if (!run && !document.querySelector('.modal') && redraw) redraw();
    });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (ac) audio(); // 切回前台时唤醒声音
    if (!run) syncNow();
  });

  // ================= 声音：朗读 + 音效 =================
  let zhVoice = null, enVoice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    enVoice = vs.find((v) => /en[-_]US/i.test(v.lang) && /Samantha|Ava|Allison|Susan/i.test(v.name))
      || vs.find((v) => /en[-_]US/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang)) || null;
    zhVoice = vs.find((v) => /zh[-_]CN/i.test(v.lang) && /Tingting|婷婷|Lili|Meijia/i.test(v.name))
      || vs.find((v) => /zh[-_]CN/i.test(v.lang)) || vs.find((v) => /^zh/i.test(v.lang)) || null;
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  // 机器朗读一句，读完时 resolve
  function speakP(text, lang) {
    return new Promise((res) => {
      if (!('speechSynthesis' in window) || !text) return res();
      const en = lang === 'en';
      const u = new SpeechSynthesisUtterance(en ? text : text.replace(/−/g, '减').replace(/×/g, '乘').replace(/÷/g, '除以'));
      if (en) { u.lang = 'en-US'; if (enVoice) u.voice = enVoice; u.rate = 0.8; u.pitch = 1.1; }
      else { u.lang = 'zh-CN'; if (zhVoice) u.voice = zhVoice; u.rate = 0.92; u.pitch = 1.1; }
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
      let done = false;
      const fin = () => { if (done) return; done = true; if (curSrc === src) curSrc = null; res(); };
      src.onended = fin;
      // 保险：声音系统被 iOS 暂停时 onended 不会触发，按录音长度超时继续，游戏不会卡住
      setTimeout(fin, (b.duration + 0.6) * 1000);
      curSrc = src;
      try { src.start(); } catch (e) { fin(); }
    });
  }
  // 依次播放：字符串 = 机器朗读；{ clip: 名字或名字数组, text: 兜底文字 } = 录音
  async function talk(...parts) {
    stopVoice(); const my = vTok;
    for (const p of parts) {
      if (my !== vTok) return;
      if (!p) continue;
      if (typeof p === 'string') { await speakP(p); continue; }
      if (p.en) { await speakP(p.en, 'en'); continue; }
      const name = Array.isArray(p.clip) ? pick(p.clip) : p.clip;
      const pr = playClip(name);
      if (pr) await pr; else if (p.text) await speakP(p.text);
    }
  }
  const say = (text) => (Array.isArray(text) ? talk(...text) : talk(text));
  // 提示文字：朗读用的数组 → 显示用的文字
  const sayText = (x) => (Array.isArray(x) ? x.map((p) => (typeof p === 'string' ? p : p.en || '')).join(' ') : x);

  let ac = null;
  // iOS 17+：让声音不受静音键影响
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { }
  function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (ac && ac.state !== 'running' && ac.state !== 'closed') ac.resume().catch(() => { }); return ac; }
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
  const totalStars = () => ['math', 'hanzi', 'english'].reduce((t, k) => t + Object.values(S[k].stars).reduce((a, b) => a + b, 0), 0);

  // 科目：数学、汉字（以后加成语、英文）
  const SUBJECTS = {
    math: { key: 'math', icon: '🔢', name: '数学闯关', levels: MATH_LEVELS, stations: MATH_STATIONS },
    hanzi: { key: 'hanzi', icon: '🀄', name: '汉字闯关', levels: HanziGen.levels, stations: HanziGen.stations },
    english: { key: 'english', icon: '🔤', name: '英文闯关', levels: EnglishGen.levels, stations: EnglishGen.stations },
  };
  let cur = SUBJECTS.math;
  const SD = () => S[cur.key];

  function screen(html, cls = '') {
    redraw = null;
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
      syncNow();
      setTimeout(() => talk({ clip: 'C01', text: `Lucas，欢迎来到闯关乐园！帮${S.names.cat}抓住${S.names.mouse}吧！` }), 400);
      showHome();
    };
  }

  // ================= 首页 =================
  // ================= 世界地图（首页） =================
  const themeOf = (id) => MapArt.ISLANDS.find((t) => t.id === id) || MapArt.ISLANDS[0];
  function showHome() {
    if (outOfFuel()) return showFuelOut();
    const prog = (id) => {
      const D = S[id], sj = SUBJECTS[id]; if (!D || !sj) return '';
      const st = Object.values(D.stars).reduce((a, b) => a + b, 0);
      return `⭐ ${st} · 已过 ${Object.keys(D.stars).length}/${sj.levels.length} 关`;
    };
    screen(`
      <header class="bar world-bar">
        <div class="pill">⭐ ${totalStars()}</div>
        <div class="world-title">Lucas 的探险世界</div>
        <button class="gear" id="gear" aria-label="家长">⚙️</button>
      </header>
      <div class="world">
        <div class="waves"></div>
        <span class="cloud c1">☁️</span><span class="cloud c2">☁️</span><span class="cloud c3">☁️</span>
        <svg class="routes land" viewBox="0 0 100 100" preserveAspectRatio="none"><path vector-effect="non-scaling-stroke" d="M24 32 Q50 6 74 30 Q66 52 50 54 Q34 56 25 74 Q50 98 75 74"/></svg>
        <svg class="routes port" viewBox="0 0 100 100" preserveAspectRatio="none"><path vector-effect="non-scaling-stroke" d="M30 17 Q74 14 70 39 Q68 54 30 61 Q24 78 70 84"/></svg>
        ${MapArt.ISLANDS.map((t) => `
          <button class="isle ${t.open ? '' : 'locked'}" data-id="${t.id}">
            ${MapArt.island(t)}
            ${cur.key === t.id ? `<div class="me">${rider('tom', 'happy')}</div>` : ''}
            <span class="isle-label"><b>${t.name}</b><small>${t.open ? prog(t.id) : t.sub}</small></span>
            ${t.open ? '' : '<span class="isle-lock">🔒</span>'}
          </button>`).join('')}
        <button class="harbor" id="garage">
          <span class="harbor-art"><span class="ship">🚢</span><span class="dock">🎁</span></span>
          <span class="isle-label"><b>宝物港口</b><small>🚗${S.cars.length} 💌${S.cards.length} 🧲${S.magnets.length}</small></span>
        </button>
      </div>`, 'bg-ocean');
    app.querySelectorAll('.isle').forEach((b) => b.onclick = () => {
      const id = b.dataset.id;
      if (SUBJECTS[id]) { fx.tap(); cur = SUBJECTS[id]; showMap(); }
      else { fx.bad(); say(`${themeOf(id).name}还在建造中，很快就能去探险啦！`); }
    });
    $('#garage').onclick = () => { fx.tap(); showGarage(); };
    $('#gear').onclick = () => { fx.tap(); parentGate(); };
    redraw = showHome;
  }

  // ================= 岛内地图：一关一座城堡 =================
  const levelById = (id) => cur.levels.find((l) => l.id === id);
  const isUnlocked = (id) => id === 1 || (SD().stars[id - 1] || 0) > 0;
  function showMap() {
    if (outOfFuel()) return showFuelOut();
    const t = themeOf(cur.key), D = SD(), lvs = cur.levels;
    const next = lvs.find((l) => isUnlocked(l.id) && !D.stars[l.id]);
    const rowH = Math.round(Math.max(130, Math.min(175, Math.min(innerWidth, innerHeight) * 0.24)));
    const { pts, d, height } = MapArt.trail(lvs.length, rowH, Math.round(rowH * 0.95));
    const idx = (id) => lvs.findIndex((l) => l.id === id);
    // 每一站是一块区域（颜色交替）+ 路牌
    const bands = cur.stations.map((st, si) => {
      const f = idx(st.levels[0]), l = idx(st.levels[st.levels.length - 1]);
      const top = si === 0 ? 0 : Math.round((pts[f].y + pts[f - 1].y) / 2);
      const bottom = si === cur.stations.length - 1 ? height : Math.round((pts[l].y + pts[l + 1].y) / 2);
      return `<div class="band" style="top:${top}px;height:${bottom - top}px;background:${t.ground[si % 2]}">
        <span class="sign">${st.name.replace(/^第 (\d+) 站 · /, '<i>第 $1 站</i>')}</span></div>`;
    }).join('');
    const deco = pts.map((p, i) => {
      const x = p.x > 55 ? 14 : p.x < 45 ? 86 : (i % 8 < 4 ? 15 : 85);
      return `<span class="deco" style="left:${x}%;top:${p.y + (i % 2 ? 10 : -20)}px">${t.deco[i % t.deco.length]}</span>`;
    }).join('');
    const nodes = lvs.map((lv, i) => {
      const p = pts[i], open = isUnlocked(lv.id), st3 = D.stars[lv.id] || 0, isNext = next && next.id === lv.id;
      return `<button class="castle ${lv.boss ? 'boss' : ''} ${open ? '' : 'locked'} ${st3 ? 'done' : ''} ${isNext ? 'next' : ''}" data-id="${lv.id}" style="left:${p.x}%;top:${p.y}px">
        ${isNext ? `<span class="me">${rider('tom', 'happy')}</span>` : ''}
        ${MapArt.castle(t.castle, { boss: lv.boss })}
        <span class="badge">${open ? (lv.boss ? '王' : lv.id) : '🔒'}</span>
        <span class="cname">${lv.name}</span>
        ${open ? `<span class="stars">${starsHtml(st3)}</span>` : ''}
      </button>`;
    }).join('');
    const last = pts[pts.length - 1];
    screen(`
      <header class="bar island-bar">
        <button class="pill" id="back">◀ 世界地图</button>
        <div class="ribbon">${t.name}</div>
        <div class="pill">⭐ ${Object.values(D.stars).reduce((a, b) => a + b, 0)}</div>
      </header>
      <div class="trail" style="height:${height}px">
        ${bands}
        <svg class="trail-road" viewBox="0 0 100 ${height}" preserveAspectRatio="none">
          <path class="road-edge" vector-effect="non-scaling-stroke" d="${d}"/>
          <path class="road-fill" vector-effect="non-scaling-stroke" d="${d}" style="stroke:${t.road}"/>
          <path class="road-dash" vector-effect="non-scaling-stroke" d="${d}"/>
        </svg>
        ${deco}
        <span class="start-flag" style="left:${pts[0].x - 22}%;top:${pts[0].y - rowH * 0.12}px">🚩 出发</span>
        ${nodes}
        <span class="treasure" style="left:${last.x}%;top:${last.y + rowH * 0.62}px">🎁<small>终点宝藏</small></span>
      </div>`, 'bg-island');
    $('#back').onclick = () => { fx.tap(); showHome(); };
    app.querySelectorAll('.castle').forEach((b) => b.onclick = () => {
      const id = +b.dataset.id;
      if (!isUnlocked(id)) { fx.bad(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); talk({ clip: 'C05', text: '先通过前面的关卡才能解锁哦' }); return; }
      fx.tap(); enterCastle(levelById(id));
    });
    const n = $('.castle.next') || $('.castle.done:last-of-type');
    if (n) app.scrollTop = Math.max(0, n.offsetTop - app.clientHeight / 2 + 60);
    redraw = showMap;
  }

  // 进城堡：城堡放大 + 城门打开，然后开始这一关
  function enterCastle(lv) {
    if (outOfFuel()) return showFuelOut();
    const t = themeOf(cur.key);
    const o = document.createElement('div');
    o.className = 'enter';
    o.innerHTML = `<div class="door l"></div><div class="door r"></div>
      <div class="enter-art">${MapArt.castle(t.castle, { boss: lv.boss })}<div class="enter-title"><small>第 ${lv.id} 关</small>${lv.name}</div></div>`;
    document.body.appendChild(o);
    fx.vroom();
    setTimeout(() => startLevel(lv), 900);
    setTimeout(() => o.classList.add('open'), 1000);
    setTimeout(() => o.remove(), 1900);
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
    else if (cur.key === 'english') plan = EnglishGen.plan(lv, S.english.review);
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
    else if (run.subj.key === 'english') q = step.review ? EnglishGen.make(step.review.type, run.lv, step.review.item) : EnglishGen.make(step.type, run.lv, undefined, run.seen);
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
    const label = (c) => q.kind === 'cmp' ? `<b>${c}</b><small>${{ '>': '大于', '<': '小于', '=': '等于' }[c]}</small>`
      : q.choiceEmo ? `<i class="ce">${q.choiceEmo[c]}</i><b>${c}</b>` : `<b>${c}</b>`;
    ch.classList.toggle('hz', q.kind === 'hz'); ch.classList.toggle('emo', q.kind === 'hzpic' || q.kind === 'emo');
    ch.classList.toggle('en', q.kind === 'en'); ch.classList.toggle('enw', q.kind === 'enw');
    if (q.kind === 'order') renderOrder(q, card, ch);
    else {
      ch.innerHTML = q.choices.map((c) => `<button class="choice" data-v="${c}">${label(c)}</button>`).join('');
      ch.querySelectorAll('.choice').forEach((b) => b.onclick = () => answer(b));
    }
    const lt = $('.qtext.listen', card); if (lt) lt.onclick = () => say(q.speak);
    say(q.speak);
  }

  // 排词成句：点单词放进句子，点句子里的词放回去；排满了自动检查
  function renderOrder(q, card, ch) {
    const slots = document.createElement('div'); slots.className = 'slots';
    card.querySelector('.qtext').replaceWith(slots);
    ch.className = 'choices tiles';
    const placed = [];
    const draw = () => {
      slots.innerHTML = q.choices.map((_, i) => placed[i] !== undefined ? `<button class="slot full" data-i="${i}">${q.choices[placed[i]]}</button>` : '<span class="slot"></span>').join('') + `<span class="punct">${q.punct}</span>`;
      ch.innerHTML = q.choices.map((w, i) => `<button class="choice tile ${placed.includes(i) ? 'used' : ''}" data-i="${i}">${w}</button>`).join('');
      ch.querySelectorAll('.tile:not(.used)').forEach((b) => b.onclick = () => { if (run.locked) return; fx.tap(); placed.push(+b.dataset.i); say([{ en: q.choices[+b.dataset.i] }]); draw(); check(); });
      slots.querySelectorAll('.slot.full').forEach((b) => b.onclick = () => { if (run.locked) return; placed.splice(+b.dataset.i); draw(); });
    };
    const check = () => {
      if (placed.length < q.choices.length) return;
      const built = placed.map((i) => q.choices[i]).join(' ');
      answer(slots, built);
      if (built !== q.answer) setTimeout(() => { placed.length = 0; slots.classList.remove('wrong'); draw(); }, 900);
    };
    draw();
  }

  function answer(btn, given) {
    const q = run.q; if (!q || run.locked || (given === undefined && btn.disabled)) return;
    const v = given !== undefined ? given : btn.dataset.v;
    const right = String(q.answer) === v;
    const D = S[run.subj.key], isMath = run.subj.key === 'math';
    const ms = myStats(D);
    const stats = ms[q.type] || (ms[q.type] = { right: 0, wrong: 0 });
    if (right) {
      run.locked = true;
      btn.classList.add('right'); fx.ok();
      const first = run.wrongThis === 0;
      if (first) stats.right++;
      if (isMath && !q.isReview) adapt(q.type, run.lv, first);
      if (first && q.isReview) { D.review = D.review.filter((r) => r.key !== q.key); D.mastered[q.key] = Date.now(); }
      const praised = talk({ clip: VOICE.praise, text: pick(PRAISE) });
      run.i++; moveTom();
      $('#tom .actor').classList.add('zoom');
      setTimeout(() => { const r = $('#tom .actor'); if (r) r.classList.remove('zoom'); }, 600);
      save();
      const go = () => { if (run) { run.locked = false; nextQ(); } };
      // 等夸奖说完再弹学习卡，但最多等 2.5 秒
      if (q.learn) Promise.all([Promise.race([praised, new Promise((r) => setTimeout(r, 2500))]), new Promise((r) => setTimeout(r, 700))]).then(() => { if (run && run.q === q) showLearn(q.learn, go); });
      else setTimeout(go, 1300);
    } else {
      btn.classList.add('wrong'); if (given === undefined) btn.disabled = true; fx.bad();
      if (run.wrongThis === 0) {
        run.wrong++; stats.wrong++;
        if (isMath && !q.isReview) adapt(q.type, run.lv, false);
        if (!D.review.some((r) => r.key === q.key)) {
          D.review.push(isMath ? { type: q.type, d: q.d, p: q.p, key: q.key, at: Date.now() }
            : run.subj.key === 'english' ? { type: q.type, item: q.item, lv: run.lv.id, key: q.key, at: Date.now() }
              : { type: q.type, c: q.c, key: q.key, at: Date.now() });
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
    h.innerHTML = `<div class="hint-say">💡 ${sayText(q.hint.say)}</div>${q.hint.html || ''}${q.hint.eq ? `<div class="hint-eq">${q.hint.eq}</div>` : ''}${q.hint.vis ? renderVis(q.hint.vis) : ''}`;
    if (q.hint.vis && q.hint.vis.kind === 'deal') bindDeal(h, q.hint.vis);
    talk(run.teaseClip, { clip: VOICE.wrong, text: enc }, ...(Array.isArray(q.hint.say) ? q.hint.say : [q.hint.say]));
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
    if (it.en) return showLearnEn(it, done);
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

  // 英文学习卡：图片、单词、中文、例句
  function showLearnEn(it, done) {
    const card = $('#qcard'); if (!card) return;
    const word = it.w.split(' ')[0];
    const hl = (str) => (it.sentenceOnly ? str : str.replace(new RegExp(`\\b(${word}s?)\\b`, 'i'), '<em>$1</em>'));
    card.className = 'qcard learn learn-en pop';
    card.innerHTML = `
      <div class="lc-top"><span class="lc-pic">${it.e}</span><div>
        <button class="lc-en ${it.sentenceOnly ? 'sent' : ''}" data-en="${it.w}">${it.w}</button>
        <div class="lc-zh">${it.zh}</div></div></div>
      ${it.s && !it.sentenceOnly ? `<button class="lc-sent" data-en="${it.s}"><span>🔊 ${hl(it.s)}</span><small>${it.szh || ''}</small></button>` : '<div></div>'}`;
    $('#choices').innerHTML = '<button class="big" id="goOn">继续追 ▶</button>';
    $('#choices').className = 'choices one';
    talk(...(it.say || [{ en: it.w }]), it.sentenceOnly ? null : it.zh, it.s && !it.sentenceOnly ? { en: it.s } : null);
    card.querySelectorAll('[data-en]').forEach((b) => b.onclick = () => say([{ en: b.dataset.en }]));
    $('#goOn').onclick = () => { fx.tap(); done(); };
  }

  // ================= 奖励：数学=汽车，汉字=动物明信片，英文=冰箱贴 =================
  const REWARD = {
    math: { list: () => VEHICLES, owned: () => S.cars, word: '辆新车', say: (r) => [{ clip: 'C03', text: '你获得了一辆新车！' }, r.name + '！'], label: (r) => r.name },
    hanzi: { list: () => POSTCARDS, owned: () => S.cards, word: '张动物明信片', say: (r) => [`你获得了一张动物明信片：${r.name}！`], label: (r) => r.name },
    english: { list: () => MAGNETS, owned: () => S.magnets, word: '个冰箱贴', say: (r) => [`你获得了一个冰箱贴：${r.place}，${r.name}！`], label: (r) => `${r.place} · ${r.name}` },
  };
  const rewardArt = (kind, r, small) => kind === 'math' ? `<span class="veh-art">${r.e}</span>`
    : kind === 'hanzi' ? `<span class="postcard ${small ? 'sm' : ''}" style="--bg:${r.bg}"><span class="stamp">${r.e}</span><span class="pc-e">${r.e}</span><span class="pc-name">${r.name}</span>${small ? '' : `<span class="pc-home">住在：${r.home}</span>`}</span>`
      : `<span class="magnet ${small ? 'sm' : ''}" style="--c:${r.color}"><span class="mg-flag">${r.flag}</span><span class="mg-e">${r.e}</span><span class="mg-place">${r.place}</span>${small ? '' : `<span class="mg-name">${r.name}</span>`}</span>`;

  // ================= 通关 =================
  function finishLevel() {
    const { lv, wrong } = run;
    const stars = wrong === 0 ? 3 : wrong <= 2 ? 2 : 1;
    const D = S[run.subj.key];
    const firstClear = !D.stars[lv.id];
    D.stars[lv.id] = Math.max(D.stars[lv.id] || 0, stars);
    // 每个科目第一次通过一关，就得到这个科目的下一个奖励
    const RW = REWARD[run.subj.key], rkind = run.subj.key;
    let newR = null;
    if (firstClear) { newR = RW.list().find((v) => !RW.owned().includes(v.id)) || null; if (newR) RW.owned().push(newR.id); }
    save(); syncNow();
    // 抓住动画
    moveTom(true);
    $('#jerry').innerHTML = rider('jerry', 'dizzy');
    $('#qcard').innerHTML = ''; $('#choices').innerHTML = '';
    fx.vroom();
    setTimeout(() => {
      fx.win(); confetti();
      talk({ clip: 'C02', text: `抓到啦！${S.names.cat}抓住了${S.names.mouse}！` }, ...(newR ? RW.say(newR) : []));
      const secs = Math.round((Date.now() - run.t0) / 1000);
      const next = levelById(lv.id + 1);
      const fuel = outOfFuel();
      const m = modal(`
        <h2>抓到啦！</h2>
        <div class="caught">${rider('tom', 'happy')}<div class="cage">${rider('jerry', 'dizzy')}</div></div>
        <div class="bigstars">${starsHtml(0)}</div>
        <p class="meta">用时 ${Math.floor(secs / 60)} 分 ${secs % 60} 秒 · 答错 ${wrong} 次</p>
        ${newR ? `<div class="newcar">${rewardArt(rkind, newR, true)}<span>获得一${RW.word}：<b>${RW.label(newR)}</b></span></div>` : ''}
        <div class="row">
          <button class="big ghost" id="rest">🏠 不玩了</button>
          <button class="big ghost" id="again">再玩一次</button>
          ${fuel ? '<button class="big" id="home">今天的油用完啦</button>' : next ? '<button class="big" id="next">下一关 ▶</button>' : '<button class="big" id="home">回地图</button>'}
        </div>`);
      m.querySelector('.box').insertAdjacentHTML('afterbegin', '<button class="close" id="close" aria-label="关闭">✕</button>');
      const sEls = m.querySelectorAll('.bigstars span');
      for (let i = 0; i < stars; i++) setTimeout(() => { sEls[i].classList.add('on'); fx.star(i); }, 500 + i * 400);
      $('#again', m).onclick = () => { m.remove(); startLevel(lv); };
      const nb = $('#next', m); if (nb) nb.onclick = () => { m.remove(); run = null; enterCastle(next); };
      const hb = $('#home', m); if (hb) hb.onclick = () => { m.remove(); run = null; showMap(); };
      $('#close', m).onclick = () => { fx.tap(); m.remove(); stopVoice(); showMap(); };
      $('#rest', m).onclick = () => { fx.tap(); m.remove(); stopVoice(); showHome(); };
      run = null;
    }, 1200);
  }

  // ================= 车库 =================
  // 收藏册：三个标签页
  let shelfTab = 'math';
  function showGarage(tab) {
    if (tab) shelfTab = tab;
    const TABS = [['math', '🚗 小汽车', '数学'], ['hanzi', '💌 动物明信片', '汉字'], ['english', '🧲 冰箱贴', '英文']];
    const RW = REWARD[shelfTab], list = RW.list(), owned = RW.owned();
    screen(`
      <header class="bar"><button class="pill" id="back">◀ 世界地图</button><div class="ribbon">我的收藏</div><div class="pill">${owned.length}/${list.length}</div></header>
      <div class="tabs">${TABS.map(([k, n]) => `<button class="tab ${k === shelfTab ? 'on' : ''}" data-k="${k}">${n} <small>${REWARD[k].owned().length}</small></button>`).join('')}</div>
      <p class="hello small">${TABS.find((t) => t[0] === shelfTab)[2]}每通过一个新关卡，就能得到一${RW.word}！点一点听听名字</p>
      <div class="shelf ${shelfTab}">
        ${list.map((r) => {
          const has = owned.includes(r.id);
          return `<button class="item ${has ? '' : 'locked'}" data-id="${r.id}">${has ? rewardArt(shelfTab, r) : `<span class="mystery">?</span>`}${shelfTab === 'math' ? `<span class="nm">${has ? r.name : '继续闯关'}</span>` : ''}</button>`;
        }).join('')}
      </div>`, 'bg-sky');
    $('#back').onclick = () => { fx.tap(); showHome(); };
    app.querySelectorAll('.tab').forEach((b) => b.onclick = () => { fx.tap(); showGarage(b.dataset.k); });
    app.querySelectorAll('.item').forEach((b) => b.onclick = () => {
      const r = list.find((x) => x.id === b.dataset.id);
      if (!owned.includes(r.id)) { fx.bad(); return shelfTab === 'math' ? talk({ clip: 'C06', text: '这辆车还没解锁，继续闯关就能得到！' }) : say('还没得到，继续闯关就能收集到！'); }
      fx.tap(); say(shelfTab === 'math' ? r.name + '！' : shelfTab === 'hanzi' ? `${r.name}，住在${r.home}。` : `${r.place}，${r.name}！`);
    });
    redraw = () => showGarage();
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
    $('#gear').onclick = () => { fx.tap(); parentGate(); };
  }

  // ================= 家长 =================
  function parentGate() {
    const a = 12 + Math.floor(Math.random() * 80), b = 12 + Math.floor(Math.random() * 30);
    const m = modal(`<p>家长验证：${a} × ${b} = ?</p><input id="pa" inputmode="numeric" pattern="[0-9]*" autocomplete="off"><div class="row"><button class="big ghost" id="cancel">取消</button><button class="big" id="ok">进入</button></div>`);
    $('#pa', m).focus();
    $('#cancel', m).onclick = () => m.remove();
    $('#ok', m).onclick = () => { if (+$('#pa', m).value === a * b) { m.remove(); showParent(); } else { $('#pa', m).value = ''; $('#pa', m).placeholder = '不对，再试一次'; } };
  }
  function syncStatus() {
    if (!window.Sync) return '同步功能还在加载，请关掉游戏重新打开。';
    if (!Sync.enabled) return '未开启：现在每台设备的进度是分开的。';
    const l = Sync.last;
    if (!l) return '已开启，还没同步过。';
    const t = new Date(l.at), hm = `${t.getMonth() + 1}月${t.getDate()}日 ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
    if (l.ok) return `✅ 已开启 · 上次同步 ${hm}`;
    return /密钥/.test(l.err) ? `❌ ${l.err}：请点下面的“断开同步”，再重新粘贴正确的密钥` : `⚠️ 上次同步失败（${l.err}，${hm}），联网后会自动再试`;
  }
  function showParent() {
    const st = sumStats(S.math), hst = sumStats(S.hanzi);
    const rows = Object.keys(MathGen.NAMES).map((t) => {
      const s = st[t] || { right: 0, wrong: 0 }, all = s.right + s.wrong;
      return `<tr><td>${MathGen.NAMES[t]}</td><td>${all}</td><td>${all ? Math.round(s.right / all * 100) + '%' : '-'}</td><td>${S.math.diff[t] || '-'}</td></tr>`;
    }).join('');
    const log = S.math.wrongLog.slice(0, 12).map((w) => `<li>${w.t.includes('?') ? w.t.replace('?', w.a) : w.t + ' → ' + w.a} <small>（选了 ${w.pick}）</small></li>`).join('') || '<li>暂无</li>';
    const hzRows = Object.keys(HanziGen.NAMES).map((t) => {
      const x = hst[t] || { right: 0, wrong: 0 }, all = x.right + x.wrong;
      return `<tr><td>${HanziGen.NAMES[t]}</td><td>${all}</td><td>${all ? Math.round(x.right / all * 100) + '%' : '-'}</td></tr>`;
    }).join('');
    const est = sumStats(S.english);
    const enRows = Object.keys(EnglishGen.NAMES).map((t) => {
      const x = est[t] || { right: 0, wrong: 0 }, all = x.right + x.wrong;
      return `<tr><td>${EnglishGen.NAMES[t]}</td><td>${all}</td><td>${all ? Math.round(x.right / all * 100) + '%' : '-'}</td></tr>`;
    }).join('');
    const enLog = S.english.wrongLog.slice(0, 12).map((w) => `<li>${w.t} → ${w.a} <small>（选了 ${w.pick}）</small></li>`).join('') || '<li>暂无</li>';
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
        <section><h3>多设备同步</h3>
          <p id="syncStat">${syncStatus()}</p>
          ${window.Sync && Sync.enabled
            ? `<button class="mini" id="syncNow">🔄 立即同步</button> <button class="mini" id="syncCopy">📋 复制同步密钥（发给另一台设备）</button> <button class="mini" id="syncOff">断开同步</button>`
            : `<label>同步密钥：<input id="syncTok" type="password" placeholder="粘贴 github_pat_ 开头的密钥" style="width:min(60vw,360px)"></label> <button class="mini" id="syncSave">保存并同步</button>
               <p class="note">iPhone、iPad、电脑都粘贴同一把密钥，进度就会自动合并。没网时照常玩，联网后自动同步。</p>`}
        </section>
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
        <section><h3>英文情况</h3>
          <table><tr><th>题型</th><th>做过</th><th>一次答对</th></tr>${enRows}</table>
          <p>待复习：${S.english.review.length} 道 · 已通关 ${Object.keys(S.english.stars).length}/${EnglishGen.levels.length} 关</p>
          <h4>最近答错</h4><ul class="log">${enLog}</ul></section>
        <section><h3>危险操作</h3><button class="mini danger" id="wipe">清空全部进度</button></section>
      </div>`, 'bg-plain');
    $('#back').onclick = () => {
      const before = JSON.stringify([S.names, S.limit, S.momVoice]);
      S.names = { cat: $('#ncat').value.trim() || '汤姆', mouse: $('#nmouse').value.trim() || '杰瑞' };
      S.limit = +$('#limit').value; S.momVoice = $('#mom').checked;
      if (JSON.stringify([S.names, S.limit, S.momVoice]) !== before) S.setAt = Date.now();
      save(); syncNow(); showHome();
    };
    const st2 = () => { const e = $('#syncStat'); if (e) e.textContent = syncStatus(); };
    const ss = $('#syncSave'); if (ss) ss.onclick = async () => {
      const t = $('#syncTok').value.trim(); if (!t) return;
      Sync.setToken(t); $('#syncStat').textContent = '正在连接…';
      const r = await syncNow();
      if (r && r.ok) return showParent();
      // 密钥不对：清掉，方便直接重新粘贴；网络问题：保留密钥，联网后自动重试
      if (r && /密钥/.test(r.err)) { const err = r.err; Sync.clear(); $('#syncStat').textContent = /无效/.test(err) ? `❌ ${err}。请重新完整复制 github_pat_ 开头的整串密钥再粘贴。` : `❌ ${err}。请到 GitHub 把这把密钥的 Gists 权限改成 Read and write，再重新粘贴。`; $('#syncTok').value = ''; }
      else showParent();
    };
    const sn = $('#syncNow'); if (sn) sn.onclick = async () => { $('#syncStat').textContent = '正在同步…'; await syncNow(); showParent(); };
    const sc = $('#syncCopy'); if (sc) sc.onclick = async () => {
      try { await navigator.clipboard.writeText(Sync.token); sc.textContent = '✅ 已复制'; } catch (e) { prompt('长按复制下面的密钥：', Sync.token); }
    };
    const so = $('#syncOff'); if (so) so.onclick = () => { Sync.clear(); showParent(); };
    $('#photo').onchange = (e) => { const f = e.target.files[0]; if (f) cropPhoto(f); };
    const np = $('#noPhoto'); if (np) np.onclick = () => { avatar = null; try { localStorage.setItem(AVATAR_KEY, 'none'); } catch (e) { } showParent(); };
    const dp = $('#defPhoto'); if (dp) dp.onclick = () => { avatar = AVATAR_DEFAULT; try { localStorage.removeItem(AVATAR_KEY); } catch (e) { } showParent(); };
    $('#resetToday').onclick = () => { S.today = { date: todayStr(), sec: 0 }; save(); showParent(); };
    $('#wipe').onclick = () => {
      const m = modal(`<p>确定清空所有星星、车库和记录吗？不能恢复。</p><div class="row"><button class="big ghost" id="no">取消</button><button class="big danger" id="yes">清空</button></div>`);
      $('#no', m).onclick = () => m.remove();
      $('#yes', m).onclick = () => { m.remove(); S = DEFAULT(); S.limitVer = 2; migrate(); save(); if (window.Sync) Sync.overwrite(S); showParent(); };
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
    // 有新版本时：新版接管后自动刷新一次（正在闯关时等这一关结束后再刷新），不用再关掉重开
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      const tryReload = () => { if (run) return setTimeout(tryReload, 3000); reloading = true; location.reload(); };
      tryReload();
    });
    navigator.serviceWorker.register('sw.js').then((reg) => {
      // 每次回到前台都检查一下有没有新版
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => { }); });
    }).catch(() => { });
  }
})();
