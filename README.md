# Lucas 的闯关乐园

一个给 5 岁小朋友的离线闯关学习游戏（PWA）。在 iPad/iPhone 的 Safari 打开网址 → 分享 → 添加到主屏幕，之后断网也能玩。

## 文件结构
- `content/math-levels.js` 数学关卡配置（加关卡、调难度只改这里）
- `content/hanzi.js` 汉字题库：每个字的拼音、词语、短句、图片（加字只改这里；加了新字要重新生成 `fonts/kai.woff2` 字体子集，否则新字会用系统字体显示）
- `js/hanzi.js` 汉字出题器
- `js/math.js` 数学出题器（各题型和提示）
- `js/app.js` 游戏主程序（地图、闯关、车库、家长设置、每日时长）
- `js/characters.js` 角色形象和车库车辆
- `voice/` 妈妈录的语音（A 答对夸奖、B 答错鼓励、C 欢迎/通关/新车/没油/未解锁、D 老鼠嘲笑），在 `js/app.js` 的 `VOICE` 里对应
- `sw.js` 离线缓存——**每次更新内容都要改 VERSION**，设备联网打开后会自动换新版

## 家长入口
点 ⚙️，答对一道两位数乘两位数的题即可进入：改角色名字、设每天时长、看错题统计。

## 素材授权
- 猫、老鼠动画：[Google Noto Animated Emoji](https://googlefonts.github.io/noto-emoji-animation/)，CC BY 4.0
- 奶酪图片：[Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji)，MIT License，Copyright (c) Microsoft Corporation
- 楷体字体：[霞鹜文楷 LXGW WenKai](https://github.com/lxgw/LxgwWenKai)，SIL Open Font License 1.1（已按游戏用到的字做子集）
- 动画播放：[lottie-web](https://github.com/airbnb/lottie-web)，MIT License
