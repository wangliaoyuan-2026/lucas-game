// 角色形象：Google Noto Animated Emoji（CC BY 4.0），用 lottie 播放动画
// 猫可以换成 Lucas 的照片（照片只存在本机，不会上传）
window.actor = function (who, mood, avatar) {
  const still = mood === 'sleep' || mood === 'dizzy' ? 'data-still="1"' : '';
  const fx = mood === 'sleep' ? '<span class="fx">💤</span>' : mood === 'dizzy' ? '<span class="fx">💫</span>' : '';
  if (who === 'tom') {
    const inner = avatar
      ? `<div class="face"><i class="ear l"></i><i class="ear r"></i><img src="${avatar}" alt=""></div>`
      : `<div class="lot" data-a="${mood === 'happy' ? 'catHappy' : 'cat'}" ${still}></div>`;
    return `<div class="actor tom ${mood || ''} ${avatar ? 'has-face' : ''}">${inner}${fx}</div>`;
  }
  return `<div class="actor jerry ${mood || ''}"><div class="lot flip" data-a="mouse" ${still}></div>${fx}</div>`;
};

// 页面里出现新的角色时自动播放动画，离开页面的动画自动销毁
(function () {
  const cache = {}, live = [];
  const data = (a) => JSON.parse(cache[a] || (cache[a] = JSON.stringify(window.ANIMS[a])));
  function mount() {
    for (let i = live.length - 1; i >= 0; i--) if (!document.contains(live[i].el)) { live[i].anim.destroy(); live.splice(i, 1); }
    if (!window.lottie || !window.ANIMS) return;
    document.querySelectorAll('.lot:not([data-on])').forEach((el) => {
      el.dataset.on = '1';
      const anim = lottie.loadAnimation({ container: el, renderer: 'svg', loop: true, autoplay: !el.dataset.still, animationData: data(el.dataset.a) });
      if (el.dataset.still) anim.goToAndStop(10, true);
      live.push({ el, anim });
    });
  }
  let t = null;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(mount, 0); }).observe(document.documentElement, { childList: true, subtree: true });
})();

// 汽车收藏册：第 n 关首次通关解锁 VEHICLES[n]
window.VEHICLES = [
  { id: 'car', e: '🚗', name: '小红车' },
  { id: 'taxi', e: '🚕', name: '出租车' },
  { id: 'police', e: '🚓', name: '警车' },
  { id: 'ambulance', e: '🚑', name: '救护车' },
  { id: 'suv', e: '🚙', name: '越野车' },
  { id: 'race', e: '🏎️', name: '赛车' },
  { id: 'bus', e: '🚌', name: '公交车' },
  { id: 'fire', e: '🚒', name: '消防车' },
  { id: 'van', e: '🚐', name: '面包车' },
  { id: 'pickup', e: '🛻', name: '皮卡' },
  { id: 'tractor', e: '🚜', name: '拖拉机' },
  { id: 'truck', e: '🚚', name: '货车' },
  { id: 'lorry', e: '🚛', name: '大卡车' },
  { id: 'trolley', e: '🚎', name: '电车' },
  { id: 'tuk', e: '🛺', name: '三轮车' },
  { id: 'moto', e: '🏍️', name: '摩托车' },
  { id: 'bike', e: '🚲', name: '自行车' },
  { id: 'train', e: '🚂', name: '小火车' },
  { id: 'ufo', e: '🛸', name: '飞碟' },
  { id: 'heli', e: '🚁', name: '直升机' },
  { id: 'rocket', e: '🚀', name: '火箭' },
];
