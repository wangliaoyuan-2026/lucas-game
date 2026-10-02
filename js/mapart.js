// 探险地图的美术：世界地图上的小岛、岛内的城堡和探险小路（全部用 SVG 画，离线可用）
(function () {
  // 每座岛的主题：名字、颜色、装饰
  const ISLANDS = [
    { id: 'math', name: 'Jerry 探险岛', sub: '数学 · 猫抓老鼠', open: true,
      sand: '#f7dc9a', grass: '#8fd16a', grassD: '#6cb84a', deco: ['🌴', '🧀', '🌴', '🍄'],
      castle: { wall: '#ffe0a3', wallD: '#f5c26b', roof: '#ff7043', roofD: '#e64a19', flag: '#e53935' },
      ground: ['#bfe9a1', '#a8de86'], road: '#f1cf8b', end: '🧀' },
    { id: 'hanzi', name: '汉字城堡山', sub: '识字 · 学词语', open: true,
      sand: '#f6dcb4', grass: '#a5d6a7', grassD: '#81c784', deco: ['🎋', '🏮', '🌸', '🎋'],
      castle: { wall: '#fde7f0', wallD: '#f6c3d8', roof: '#8e24aa', roofD: '#6a1b9a', flag: '#ffca28' },
      ground: ['#e3f3d6', '#cfeac0'], road: '#ead2b0', end: '📜' },
    { id: 'idiom', name: '成语魔法森林', sub: '成语 · 即将开放', open: false,
      sand: '#e9d6a8', grass: '#5fae6a', grassD: '#428a4e', deco: ['🌲', '🦉', '🍄', '🌲'],
      castle: { wall: '#e0d6cf', wallD: '#c4b5aa', roof: '#2e7d32', roofD: '#1b5e20', flag: '#fdd835' } },
    { id: 'english', name: 'ABC 糖果岛', sub: '英文 · 即将开放', open: false,
      sand: '#ffe6c7', grass: '#ffc1dd', grassD: '#f59ac3', deco: ['🍭', '🍬', '🧁', '🍭'],
      castle: { wall: '#e1f5fe', wallD: '#b3e1f7', roof: '#ec407a', roofD: '#c2185b', flag: '#29b6f6' } },
  ];

  // ---------- 城堡 ----------
  // c: 颜色；opt.boss 大城堡带皇冠；opt.small 世界地图上的小城堡
  function castle(c, opt = {}) {
    const cren = (x, y, w, n) => Array.from({ length: n }, (_, i) => `<rect x="${x + i * (w / n) + w / n * 0.15}" y="${y - 6}" width="${w / n * 0.7}" height="7" rx="1"/>`).join('');
    const tower = (x, h) => `
      <rect x="${x}" y="${108 - h}" width="24" height="${h}" fill="${c.wall}" />
      <rect x="${x + 16}" y="${108 - h}" width="8" height="${h}" fill="${c.wallD}" />
      <polygon points="${x - 4},${108 - h} ${x + 12},${108 - h - 30} ${x + 28},${108 - h}" fill="${c.roof}"/>
      <polygon points="${x + 12},${108 - h - 30} ${x + 28},${108 - h} ${x + 18},${108 - h}" fill="${c.roofD}"/>
      <path d="M${x + 8} ${118 - h + 10} v-6 a4 4 0 0 1 8 0 v6 z" fill="#5d4037"/>`;
    return `<svg class="castle-svg" viewBox="0 -24 120 140" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="110" rx="56" ry="7" fill="rgba(0,0,0,.15)"/>
      ${tower(8, 52)}${tower(88, 52)}
      <g fill="${c.wall}">${cren(22, 72, 76, 6)}</g>
      <rect x="22" y="72" width="76" height="36" fill="${c.wall}"/>
      <rect x="22" y="72" width="76" height="6" fill="${c.wallD}" opacity=".6"/>
      <rect x="40" y="34" width="40" height="74" fill="${c.wall}"/>
      <rect x="68" y="34" width="12" height="74" fill="${c.wallD}"/>
      <g fill="${c.wall}">${cren(40, 34, 40, 4)}</g>
      <polygon points="36,34 60,${opt.boss ? -8 : -2} 84,34" fill="${c.roof}"/>
      <polygon points="60,${opt.boss ? -8 : -2} 84,34 66,34" fill="${c.roofD}"/>
      <line x1="60" y1="${opt.boss ? -8 : -2}" x2="60" y2="${opt.boss ? -22 : -16}" stroke="#6d4c41" stroke-width="2"/>
      <path class="flag" d="M60 ${opt.boss ? -22 : -16} l14 4 l-14 4 z" fill="${c.flag}"/>
      <path d="M51 108 v-14 a9 9 0 0 1 18 0 v14 z" fill="#6d4c41"/>
      <path d="M53 108 v-13 a7 7 0 0 1 14 0 v13 z" fill="#8d6e63"/>
      <line x1="60" y1="88" x2="60" y2="108" stroke="#6d4c41" stroke-width="1.2"/>
      <circle cx="52" cy="52" r="0" />
      <path d="M48 58 v-6 a4 4 0 0 1 8 0 v6 z M64 58 v-6 a4 4 0 0 1 8 0 v6 z" fill="#5d4037"/>
      ${opt.boss ? '<text x="60" y="-20" text-anchor="middle" font-size="16">👑</text>' : ''}
    </svg>`;
  }

  // ---------- 世界地图上的小岛 ----------
  function island(t) {
    return `<svg class="island-svg" viewBox="0 0 300 210" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="150" cy="128" rx="148" ry="80" fill="rgba(255,255,255,.28)"/>
      <path d="M30,120 C20,70 80,40 140,45 C200,35 280,60 275,115 C285,165 220,195 150,190 C80,198 35,170 30,120 Z" fill="${t.sand}"/>
      <path d="M50,112 C45,78 95,58 145,60 C195,53 255,73 252,110 C258,148 205,168 150,165 C95,171 55,148 50,112 Z" fill="${t.grass}"/>
      <path d="M70,140 C110,160 200,162 238,132 C230,154 200,166 150,165 C110,168 82,158 70,140 Z" fill="${t.grassD}"/>
      <text x="62" y="112" font-size="34">${t.deco[0]}</text>
      <text x="212" y="104" font-size="30">${t.deco[2]}</text>
      <text x="196" y="156" font-size="24">${t.deco[1]}</text>
      <text x="82" y="160" font-size="22">${t.deco[3]}</text>
      <g transform="translate(108,30) scale(.7)">${castle(t.castle).replace(/<svg[^>]*>|<\/svg>/g, '')}</g>
    </svg>`;
  }

  // ---------- 岛内探险小路 ----------
  // 每关一个点，左右蛇形排列；返回每个点的位置（x 百分比，y 像素）和整条路的 SVG
  function trail(n, rowH, top) {
    const xs = [50, 76, 50, 24];
    const pts = Array.from({ length: n }, (_, i) => ({ x: xs[i % 4], y: top + i * rowH }));
    let d = `M ${pts[0].x} ${pts[0].y - rowH * 0.6}`;
    d += ` L ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < n; i++) {
      const a = pts[i - 1], b = pts[i], my = (a.y + b.y) / 2;
      d += ` C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
    }
    const last = pts[n - 1];
    d += ` L ${last.x} ${last.y + rowH * 0.7}`;
    return { pts, d, height: last.y + rowH * 1.3 };
  }

  window.MapArt = { ISLANDS, castle, island, trail };
})();
