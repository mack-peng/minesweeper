const MIN_TOP_INSET = 40;
const TOP_INSET_GAP = 4;

/**
 * 计算容器顶部需要预留的高度（状态栏 + 小红书菜单栏）。
 * 坐标来自 getWindowInfo，均以容器左上角为原点。
 */
function readTopInset(info) {
  if (!info) return MIN_TOP_INSET;

  const statusBarHeight = Number(info.statusBarHeight) || 0;
  const screenTop = Number(info.screenTop) || 0;
  const safeTop = info.safeArea ? Number(info.safeArea.top) || 0 : 0;
  const menuButtons = info.menuButtons || {};
  const menuBottom = ["back", "me", "share"].reduce((max, key) => {
    const rect = menuButtons[key];
    const bottom = rect ? Number(rect.bottom) : 0;
    return Number.isFinite(bottom) ? Math.max(max, bottom) : max;
  }, 0);

  // 容器已经位于状态栏下方时，不再重复计算状态栏高度。
  const containerTop = screenTop > 0 ? 0 : statusBarHeight;
  const measured = Math.max(safeTop, menuBottom, containerTop);
  const total = measured > 0 ? measured + TOP_INSET_GAP : 0;

  return Math.max(MIN_TOP_INSET, Math.ceil(total));
}

function updateTopInset(root, miniTool) {
  let request;
  try {
    request = miniTool.getWindowInfo();
  } catch (error) {
    return;
  }
  if (!request || typeof request.then !== "function") return;

  request
    .then((info) => {
      root.style.setProperty("--app-top-total", `${readTopInset(info)}px`);
    })
    .catch(() => {
      // 保留兜底值，避免顶部内容被状态栏/菜单栏遮挡。
    });
}

/**
 * 小红书容器全屏打开时，把 HUD、toast 和棋盘从顶部安全区下方开始渲染。
 * 非容器环境（普通浏览器）不改变现有布局。
 */
export function applyTopInset() {
  const xhs = window.xhs;
  if (!xhs) return;

  const root = document.documentElement;
  root.style.setProperty("--app-top-total", `${MIN_TOP_INSET}px`);

  const miniTool = xhs.miniTool;
  if (!miniTool || typeof miniTool.getWindowInfo !== "function") return;

  updateTopInset(root, miniTool);
  window.addEventListener("orientationchange", () => {
    updateTopInset(root, miniTool);
  });
}
