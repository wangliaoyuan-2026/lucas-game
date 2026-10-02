// 多设备同步：进度存在 GitHub 的一个私密 Gist 里
// 每台设备在家长设置里粘贴一次“同步密钥”（只能改 Gist 的 GitHub 令牌），之后联网时自动合并
// 没网、网络慢都没关系：失败就安静地等下次再试，不影响玩
(function () {
  const GIST_ID = '21d90d80629c9809abd9da3c7ab9de4b';
  const FILE = 'lucas-save.json';
  const API = `https://api.github.com/gists/${GIST_ID}`;
  const CFG_KEY = 'lucas-game-sync';

  let cfg = {};
  try { cfg = JSON.parse(localStorage.getItem(CFG_KEY) || '{}'); } catch (e) { }
  const saveCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { } };

  // ---------- 合并规则：两边的进度都不丢 ----------
  const maxMap = (a = {}, b = {}) => { const o = { ...a }; for (const k in b) o[k] = Math.max(o[k] || 0, b[k] || 0); return o; };
  function mergeSubj(a = {}, b = {}) {
    const out = { ...a };
    out.stars = maxMap(a.stars, b.stars);                       // 星星：每关取最高
    if (a.diff || b.diff) out.diff = maxMap(a.diff, b.diff);    // 难度：取较高
    out.statsBy = { ...(a.statsBy || {}) };                     // 统计：按设备分开记，各取最大，显示时相加
    for (const dev in b.statsBy || {}) {
      const L = out.statsBy[dev] || {}, R = b.statsBy[dev] || {}, m = { ...L };
      for (const t in R) { const x = L[t] || { right: 0, wrong: 0 }, y = R[t]; m[t] = { right: Math.max(x.right, y.right), wrong: Math.max(x.wrong, y.wrong) }; }
      out.statsBy[dev] = m;
    }
    out.mastered = maxMap(a.mastered, b.mastered);              // 错题：哪台设备答对了，就都不再复习
    const rv = new Map();
    [...(a.review || []), ...(b.review || [])].forEach((r) => { const p = rv.get(r.key); if (!p || (r.at || 0) > (p.at || 0)) rv.set(r.key, r); });
    out.review = [...rv.values()].filter((r) => !((out.mastered[r.key] || 0) >= (r.at || 0) && out.mastered[r.key])).sort((x, y) => (x.at || 0) - (y.at || 0)).slice(-30);
    const wl = new Map();
    [...(a.wrongLog || []), ...(b.wrongLog || [])].forEach((w) => wl.set(w.at + '|' + w.t, w));
    out.wrongLog = [...wl.values()].sort((x, y) => y.at - x.at).slice(0, 50);
    return out;
  }
  function merge(a, b) {
    if (!b || typeof b !== 'object' || !b.math) return a;
    const out = { ...a };
    const newer = (b.setAt || 0) > (a.setAt || 0) ? b : a;      // 设置：以最近改过的为准
    out.names = newer.names || a.names; out.limit = newer.limit ?? a.limit; out.momVoice = newer.momVoice; out.setAt = newer.setAt || 0;
    const has = new Set([...(a.cars || []), ...(b.cars || [])]);  // 汽车收藏：合在一起
    out.cars = VEHICLES.map((v) => v.id).filter((id) => has.has(id));
    out.math = mergeSubj(a.math, b.math);
    out.hanzi = mergeSubj(a.hanzi, b.hanzi);
    return out;                                                  // today（今天玩了多久）每台设备各算各的
  }
  // 比较时不管字段顺序（不然两台设备会来回重复上传）
  const stable = (v) => Array.isArray(v) ? '[' + v.map(stable).join(',') + ']'
    : v && typeof v === 'object' ? '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}'
      : JSON.stringify(v);
  const strip = (s) => { const { today, ...rest } = s || {}; return stable(rest); };

  function fetchT(url, opt = {}, ms = 12000) {
    const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
    return fetch(url, { ...opt, cache: 'no-store', signal: ac.signal }).finally(() => clearTimeout(t));
  }
  const headers = () => ({ Authorization: `Bearer ${cfg.token}`, Accept: 'application/vnd.github+json' });

  let busy = null;
  // get(): 取当前进度；set(s): 写回本机；onChanged(): 别的设备有新进度时刷新界面
  function sync(get, set, onChanged) {
    if (!cfg.token) return Promise.resolve({ ok: false, err: '未设置' });
    if (busy) return busy;
    busy = (async () => {
      try {
        const r = await fetchT(API, { headers: headers() });
        if (r.status === 401 || r.status === 403 || r.status === 404) throw new Error('密钥无效或没有 Gist 权限');
        if (!r.ok) throw new Error('网络错误 ' + r.status);
        const g = await r.json();
        let remote = {};
        try { remote = JSON.parse((g.files[FILE] && g.files[FILE].content) || '{}'); } catch (e) { }
        const local = get();
        const merged = merge(local, remote);
        const changed = strip(merged) !== strip(local);
        if (changed) set(merged);
        if (strip(merged) !== strip(remote)) {
          const p = await fetchT(API, { method: 'PATCH', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(merged) } } }) });
          if (!p.ok) throw new Error(p.status === 403 || p.status === 404 ? '密钥没有写入 Gist 的权限' : '上传失败 ' + p.status);
        }
        cfg.last = { ok: true, at: Date.now() }; saveCfg();
        if (changed && onChanged) onChanged();
        return cfg.last;
      } catch (e) {
        cfg.last = { ok: false, at: Date.now(), err: e.name === 'AbortError' ? '网络超时' : (e.message || '网络错误') }; saveCfg();
        return cfg.last;
      } finally { busy = null; }
    })();
    return busy;
  }

  // 清空进度时用：直接用本机进度覆盖云端（不合并）
  async function overwrite(state) {
    if (!cfg.token) return;
    try { await fetchT(API, { method: 'PATCH', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(state) } } }) }); } catch (e) { }
  }

  window.Sync = {
    sync, merge, overwrite,
    get enabled() { return !!cfg.token; },
    get token() { return cfg.token || ''; },
    get last() { return cfg.last || null; },
    setToken(t) { cfg.token = (t || '').trim(); cfg.last = null; saveCfg(); },
    clear() { cfg = {}; saveCfg(); },
  };
})();
