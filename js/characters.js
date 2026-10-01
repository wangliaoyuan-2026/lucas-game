// 角色形象：Microsoft Fluent Emoji 3D（MIT 许可，可自由使用）
// 猫的头上可以换成 Lucas 的照片（照片只存在本机，不会上传）
window.actor = function (who, mood, avatar) {
  if (who === 'tom') {
    const face = avatar
      ? `<div class="face"><i class="ear l"></i><i class="ear r"></i><img src="${avatar}" alt=""></div>`
      : '';
    return `<div class="actor tom ${mood || ''} ${avatar ? 'has-face' : ''}"><img class="body" src="img/cat.png" alt="">${face}${mood === 'sleep' ? '<span class="fx">💤</span>' : ''}</div>`;
  }
  return `<div class="actor jerry ${mood || ''}"><img class="body" src="img/mouse.png" alt="">${mood === 'dizzy' ? '<span class="fx">💫</span>' : ''}</div>`;
};

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
