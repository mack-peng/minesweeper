# Minesweeper agent

## 项目

- Vue 2.7 + Vite 5 + Vuex 3 + sass(dart-sass) + wowjs + moment
- 由 ~/Projects/Awesome-Game 拆分迁移而来（该仓只读参考）
- GitHub: https://github.com/mack-peng/minesweeper

## 命令

| 命令 | 作用 |
|------|------|
| npm run dev | Vite dev server |
| npm run build | 构建到 dist/ |
| npm run preview | 预览构建产物 |

## 约定

- commit 全英文 `<type>(<scope>): <desc>`；禁止 force push
- 移动端插旗走 flagMode toggle（clickBoard 前置分支）；桌面右键 contextmenu 逻辑不变
- 棋盘宽度 = `calc(cols * var(--cell))`，格子 `clamp(14px, 2.1vw, 20px)`（勿写死 20px）
- 全局方法 HiAlert/HiImg 挂 Vue.prototype（src/utils/test.js）
- 响应式断点：<768px 隐藏侧栏用 ConfigSelect 下拉
