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
- 棋盘宽度 = `calc(cols * var(--cell))`，格子 `clamp(6px, min((100vw - 50px) / cols, (100dvh - var(--hud-offset)) / rows), 36px)`；`--hud-offset` 按断点取 104 / 110 / 120 / 140，勿写死格子尺寸
- 首击 3×3 范围无雷（首个雷区重排）；翻开全部安全格胜利，插满旗不直接胜利
- 全局方法 HiAlert/HiImg 挂 Vue.prototype（src/utils/test.js）
- 响应式断点：<768px 三行 HUD（品牌 / 统计 / 控件），<=520px 高度切换单行紧凑 HUD；<768px 隐藏 ConfigSelect 标签
