# Minesweeper（扫雷）

从 [Awesome-Game](https://github.com/ordinaryA/Awesome-Game) 拆分的独立小游戏，Vue 2.7 + Vite 重构，全端响应式（桌面 / 平板 / 手机可玩）。

## 玩法

- 左键翻开格子，右键插旗（桌面）；移动端开启「🚩 插旗模式」后点击即插旗
- 难度：普通 10×10 / 困难 20×15 / 疯狂 40×20 / 地狱 45×25（移动端走难度下拉）
- 计时与剩余雷数在棋盘上方

## 开发

```bash
npm install
npm run dev      # 开发（Vite dev server）
npm run build    # 构建 → dist/
npm run preview  # 本地预览构建产物
```

## 结构

```
src/
├── main.js               # 入口
├── App.vue               # Rain 特效 + 游戏页 + Alert + Awesome 漫画
├── page/sweep/index.vue  # 游戏本体（递归展开 + 九宫格旗校验）
├── components/           # alert / awesome / rain / ConfigSelect
├── constants/sweep.js    # 难度枚举与按钮
├── assets/{css,img}      # papercss + 素材
├── store/                # Vuex（alert/cartoon）
└── utils/  mixins/
```

## 来源与说明

- 游戏逻辑来自 Awesome-Game（Vue 2.5 + webpack 3），迁移到 Vue 2.7 + Vite
- 响应式：格子 `clamp(14px, 2.1vw, 20px)` 自适应、棋盘宽按列数计算；`<768px` 隐藏侧栏、启用下拉与插旗模式
