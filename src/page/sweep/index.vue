<template>
  <div class="snake_bg page-shell">
    <header class="hud">
      <div class="hud_brand">
        <span class="hud_dot"></span>
        <div class="hud_title">
          <span>扫雷</span>
          <small>MINESWEEPER</small>
        </div>
      </div>
      <div class="hud_stats">
        <span class="chip" :class="{ 'chip--danger': theRestOfMine < 0 }">
          <span class="chip_icon">💣</span>剩余 {{ theRestOfMine }}
        </span>
        <span class="chip">
          <span class="chip_icon">⏱</span>{{ elapsedTime }}
        </span>
      </div>
      <div class="hud_spacer"></div>
      <div class="hud_controls">
        <ConfigSelect
          title="难度"
          :options="difficultyOptions"
          :current="defaultMode"
          @apply="sideBarMethod"
        />
        <button class="btn btn--accent" @click="onRestart">
          <span class="label-full">重新开始</span>
          <span class="label-short">重开</span>
        </button>
      </div>
    </header>
    <main class="board-panel">
      <div class="board-area">
        <div class="board-tray">
          <div class="board cl" :style="boardStyle">
            <div
              v-for="(item, idx) in boardData"
              :key="idx"
              :style="item.styles"
              :class="{
                [item.type]: true,
                isCheck: !item.isCheck,
                isTip: item.isTip,
                flag: item.isFlag,
              }"
              class="sigleCheck"
              @contextmenu.prevent="onContextMenu(item)"
              @mousedown="clickBoard($event, item)"
            >
              {{ item.isCheck ? item.number : "" }}
            </div>
          </div>
        </div>
        <button
          class="flag-toggle"
          :class="{ 'flag-toggle--on': flagMode }"
          type="button"
          :aria-pressed="flagMode"
          @click="toggleFlagMode"
        >
          <span class="flag-toggle_icon" aria-hidden="true">🚩</span>
          <span class="flag-toggle_label">{{ flagMode ? "插旗中" : "插旗模式" }}</span>
        </button>
      </div>
    </main>
  </div>
</template>

<script>
import moment from "moment";
import { SWEEP } from "@constants";
import { deviceClass, onDeviceClassChange } from "../../utils/device.js";
import { $animate } from "../../mixins/index.js";
import ConfigSelect from "../../components/ConfigSelect.vue";
export default {
  name: "MinesweeperGame",
  components: { ConfigSelect },
  mixins: [$animate],
  data() {
    return {
      defaultMode: "crazy",
      difficultyOptions: SWEEP.sidebar[0].children,
      boardSize: [0, 0],
      mineCount: 0,
      boardData: [],
      gameIsOver: false,
      gameWon: false,
      gameStarted: false,
      flagCount: 0,
      safeRemaining: 0,
      lastCtrlFlag: null,
      hasRevealed: false,
      timerStarted: false,
      elapsedTime: "00:00:00",
      elapsedTimer: null,
      flagMode: false,
    };
  },
  created() {
    // 默认难度按设备档位：手机 normal / 平板 hard / 桌面 crazy（用户手动选择后不再覆盖）
    this.difficultyByDevice = true;
    this.defaultMode = this.deviceMode();
    this.setInitMode();
    this.initBoard();
  },
  mounted() {
    this.bindKeyboard();
    this.$root.$on("minesweeper:restart", this.onRestart);
    this.offDevice = onDeviceClassChange(() => {
      if (!this.difficultyByDevice || this.gameStarted) return;
      const mode = this.deviceMode();
      if (mode === this.defaultMode) return;
      this.defaultMode = mode;
      this.setInitMode();
      this.initBoard();
      const labels = { normal: "普通", hard: "困难", crazy: "疯狂" };
      this.HiAlert({
        type: "secondary",
        content: `已按屏幕调整为${labels[mode]}难度`,
        clear: true,
      });
    });
  },
  beforeDestroy() {
    this.stopTimer();
    document.onkeydown = null;
    document.onmouseup = null;
    this.$root.$off("minesweeper:restart", this.onRestart);
    if (this.offDevice) {
      this.offDevice();
      this.offDevice = null;
    }
  },
  computed: {
    theRestOfMine() {
      if (this.gameWon) return 0;
      return this.mineCount - this.flagCount;
    },
    boardStyle() {
      return {
        "--cols": this.boardSize[0] || 10,
        "--rows": this.boardSize[1] || 10,
      };
    },
  },
  methods: {
    /**
     * 设备档位对应的默认难度
     */
    deviceMode() {
      const cls = deviceClass();
      return cls === "phone" ? "normal" : cls === "tablet" ? "hard" : "crazy";
    },

    /**
     * 设置初始难度，雷，棋盘样式
     */
    setInitMode() {
      const { modeEnum } = SWEEP;
      const { defaultMode } = this;
      this.boardSize = modeEnum[defaultMode].boardSize;
      this.mineCount = modeEnum[defaultMode].mineCount;
    },

    /**
     * 侧边栏事件
     */
    sideBarMethod(item) {
      const { type } = item;
      switch (type) {
        case "difficulty":
          this.pickDifficulty(item);
          break;
      }
    },

    /**
     * 按钮态样式（插旗模式开关高亮）
     */
    buttonClass(item) {
      if (item.type == "flagMode") {
        return { primary: this.flagMode };
      }
      return {};
    },

    /**
     * 键盘事件
     */
    bindKeyboard() {
      document.onkeydown = ({ keyCode }) => {
        if (keyCode == 32) {
          this.HiImg({ isShow: "hide" });
        }
      };
    },

    /**
     * 游戏胜利
     */
    gameWin() {
      if (this.gameIsOver) return;
      this.gameIsOver = true;
      this.gameWon = true;
      this.stopTimer();
      const opened = this.boardData.filter((item) => item.type !== "mine").length;
      this.boardData.forEach((item) => {
        item.isCheck = true;
        item.isTip = false;
        item.isFlag = false;
        if (item.type === "mine") {
          item.type = "mineSuccess";
        }
      });
      this.flagCount = 0;
      this.safeRemaining = 0;
      this.HiAlert({
        type: "success",
        content: "你赢了！！！",
      });
      this.HiImg({
        type: "win",
        time: this.elapsedTime,
        opened,
        mines: this.mineCount,
        difficulty: this.difficultyLabel(),
      });
    },

    /**
     * 当前难度的中文标签（去掉英文括号）
     */
    difficultyLabel() {
      const item = this.difficultyOptions.find((o) => o.mode === this.defaultMode);
      return item ? item.label.replace(/\s*\(.*\)$/, "") : "";
    },

    /**
     * 检查是否已翻开全部安全格
     */
    checkWin() {
      if (this.gameIsOver) return;
      if (this.safeRemaining === 0) {
        this.gameWin();
      }
    },

    /**
     * 初始化棋盘
     */
    initBoard() {
      const [x, y] = this.boardSize;
      const afterArr = [];
      for (let i = 0; i < y; i++) {
        for (let j = 0; j < x; j++) {
          const item = {
            type: "init",
            isCheck: false,
            pos: [j, i],
            isRepeat: "not",
            isTip: false,
            isFlag: false,
          };
          afterArr.push(item);
        }
      }
      this.boardData = afterArr;
      this.gameIsOver = false;
      this.gameWon = false;
      this.gameStarted = false;
      this.hasRevealed = false;
      this.flagMode = false;
      this.flagCount = 0;
      this.safeRemaining = x * y - this.mineCount;
      this.resetTimer();
      this.creatMine();
    },

    /**
     * 插旗模式开关
     */
    toggleFlagMode() {
      this.flagMode = !this.flagMode;
      this.HiAlert({
        type: this.flagMode ? "success" : "secondary",
        content: this.flagMode
          ? "插旗模式已开启：点击格子进行插旗"
          : "插旗模式已关闭",
      });
    },

    /**
     * 重新开始
     */
    onRestart() {
      this.HiImg({ isShow: "hide" });
      this.restartGame();
      this.HiAlert({
        type: "success",
        content: "游戏已重置！",
      });
    },

    /**
     * 重新开始游戏
     */
    restartGame() {
      this.gameIsOver = false;
      this.initBoard();
    },

    /**
     * 重置并暂停计时
     */
    resetTimer() {
      this.stopTimer();
      this.timerStarted = false;
      this.elapsedTime = "00:00:00";
    },

    /**
     * 首次操作后开始计时
     */
    startTimer() {
      if (this.timerStarted || this.gameIsOver) return;
      this.timerStarted = true;
      const startTime = moment();
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = setInterval(() => {
        const du = moment.duration(moment() - startTime, "ms");
        this.elapsedTime = [
          this.PrefixInteger(du.get("hours"), 2),
          this.PrefixInteger(du.get("minutes"), 2),
          this.PrefixInteger(du.get("seconds"), 2),
        ].join(":");
      }, 1000);
    },

    /**
     * 停止计时
     */
    stopTimer() {
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    },

    /**
     * 数字前补 0
     */
    PrefixInteger(num, n) {
      return (Array(n).join(0) + num).slice(-n);
    },

    /**
     * 随机生成若干雷
     */
    creatMine() {
      const {
        mineCount,
        boardData,
        boardSize: [cols, rows],
      } = this;
      const total = cols * rows;
      // Partial Fisher-Yates: O(N + M) while guaranteeing unique cells.
      const indices = Array.from({ length: total }, (_, index) => index);
      for (let i = 0; i < mineCount; i++) {
        const j = i + Math.floor(Math.random() * (total - i));
        [indices[i], indices[j]] = [indices[j], indices[i]];
        boardData[indices[i]].type = "mine";
      }
      this.calcMineForNumber();
    },

    /**
     * 计算格子周围有多少雷
     */
    calcMineForNumber() {
      const { boardData } = this;
      const [cols, rows] = this.boardSize;
      // One-pass neighbor counting: O(N + 8M) instead of O(N * M).
      const counts = new Uint16Array(boardData.length);

      boardData.forEach((item) => {
        if (item.type !== "mine") return;
        const [x, y] = item.pos;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= rows) continue;
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            if (nx < 0 || nx >= cols) continue;
            counts[ny * cols + nx] += 1;
          }
        }
      });

      boardData.forEach((item, idx) => {
        if (item.type === "mine") return;
        const count = counts[idx];
        item.type = count === 0 ? "null" : "number";
        item.number = count === 0 ? undefined : count;
        item.styles = count === 0 ? {} : this.handleInsertColors(count);
      });
    },

    /**
     * 右键/插旗模式 插旗子
     */
    insertFlag(item) {
      if (this.gameIsOver) return;
      if (item.isCheck) {
        if (item.isFlag) {
          item.isFlag = false;
          this.flagCount -= 1;
        }
        return;
      }
      this.gameStarted = true;
      this.startTimer();
      item.isFlag = !item.isFlag;
      this.flagCount += item.isFlag ? 1 : -1;
    },

    /**
     * 右键 / Mac Ctrl+click 共用入口，避免 Ctrl+click 后再触发 contextmenu 双切换
     */
    onContextMenu(item) {
      const last = this.lastCtrlFlag;
      if (last && last.item === item && Date.now() - last.time < 500) {
        this.lastCtrlFlag = null;
        return;
      }
      this.insertFlag(item);
    },

    /**
     * 首击保护：保证以首击格为中心的 3×3 范围无雷
     */
    ensureSafeOpening([x, y]) {
      const zoneSet = new Set([
        this.calcIdx([x, y]),
        ...this.neighborIndices([x, y]),
      ]);
      const minesInZone = [];
      const candidates = [];
      this.boardData.forEach((item, idx) => {
        if (zoneSet.has(idx)) {
          if (item.type === "mine") minesInZone.push(idx);
        } else if (item.type !== "mine") {
          candidates.push(idx);
        }
      });
      if (!minesInZone.length) return;
      if (candidates.length < minesInZone.length) return;

      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      minesInZone.forEach((mineIdx, i) => {
        const wasFlagged = this.boardData[mineIdx].isFlag;
        const target = this.boardData[candidates[i]];
        this.boardData[mineIdx].type = "init";
        this.boardData[mineIdx].isFlag = false;
        target.type = "mine";
        target.number = undefined;
        target.styles = {};
        if (wasFlagged) {
          if (target.isFlag) {
            this.flagCount -= 1;
          } else {
            target.isFlag = true;
          }
        }
      });
      this.boardData.forEach((item) => {
        if (item.type === "mine") return;
        item.type = "init";
        item.number = undefined;
        item.styles = {};
        item.isRepeat = "not";
      });
      this.calcMineForNumber();
    },

    /**
     * 根据坐标计算索引
     */
    calcIdx([a, b]) {
      const row = this.boardSize[0];
      return b * row + a;
    },

    /**
     * 点击棋盘扫雷
     */
    clickBoard(e, item) {
      if (this.gameIsOver) return;
      if (e.button !== 0) return;
      // macOS 触控板 Ctrl+click 等价于右键；先插旗，contextmenu 由 onContextMenu 去重
      if (e.ctrlKey) {
        this.insertFlag(item);
        this.lastCtrlFlag = { item, time: Date.now() };
        return;
      }
      // 插旗模式下左键点击即切换旗子（含取消旗子）
      if (this.flagMode) {
        this.insertFlag(item);
        return;
      }
      if (item.isFlag) return;
      this.gameStarted = true;
      if (!this.hasRevealed) {
        this.ensureSafeOpening(item.pos);
        this.hasRevealed = true;
      }
      this.startTimer();
      if (!item.isCheck && item.type !== "mine") {
        this.safeRemaining -= 1;
      }
      item.isCheck = true;
      switch (item.type) {
        case "null":
          this.handleSpace(item.pos);
          break;
        case "number":
          this.pickNumber(item);
          break;
        case "mine":
          this.pickMine(item);
          break;
      }
      this.checkWin();
    },

    /**
     * 用户点击雷
     */
    pickMine({ pos, isFlag }) {
      if (isFlag) return;
      const errorArr = [pos];
      this.gameOver({ errorArr, reason: "mine" });
    },

    /**
     * 用户点击数字
     */
    pickNumber(item) {
      const { boardData } = this;
      const tipIndices = this.neighborIndices(item.pos);
      this.tipUserSudoForPos(item);
      document.onmouseup = () => {
        for (let i = 0; i < tipIndices.length; i++) {
          const cell = boardData[tipIndices[i]];
          if (cell) cell.isTip = false;
        }
        document.onmouseup = null;
      };
    },

    /**
     * 用户点击数字提示用户九宫格
     */
    tipUserSudoForPos({ number: mineNumb, pos }) {
      const { boardData } = this;
      let flagCount = 0;
      const mineArr = [];
      const flagArr = [];
      const neighbors = this.neighborIndices(pos);
      for (let i = 0; i < neighbors.length; i++) {
        const item = boardData[neighbors[i]];
        if (!item) continue;
        if (!item.isCheck && !item.isFlag) {
          item.isTip = true;
        }
        if (item.type == "mine") {
          mineArr.push(item.pos);
        }
        if (item.isFlag) {
          flagCount++;
          flagArr.push(item.pos);
        }
      }
      if (flagCount >= mineNumb) {
        const { bool, notArr, errorArr } = this.findMine({
          mineArr,
          flagArr,
        });
        if (bool) {
          this.handleSpace(pos);
        } else {
          this.gameOver({ notArr, errorArr, reason: "chord" });
        }
      }
    },

    /**
     * 游戏结束
     */
    gameOver({ notArr = [], errorArr = [], reason = "mine" }) {
      this.gameIsOver = true;
      this.stopTimer();
      const { boardData } = this;
      const opened = boardData.filter(
        (item) => item.isCheck && item.type !== "mine"
      ).length;
      boardData.map((item) => {
        item.isCheck = true;
        item.isTip = false;
        item.isFlag = false;
      });
      this.flagCount = 0;
      this.safeRemaining = 0;
      for (let i = 0; i < notArr.length; i++) {
        const idx = this.calcIdx(notArr[i]);
        boardData[idx].type = "mineSuccess";
      }
      for (let i = 0; i < errorArr.length; i++) {
        const idx = this.calcIdx(errorArr[i]);
        boardData[idx].type = "mineError";
      }
      this.HiAlert({
        type: "danger",
        content: "游戏失败",
      });
      this.HiImg({
        type: "fail",
        reason,
        time: this.elapsedTime,
        opened,
        mines: 1,
        difficulty: this.difficultyLabel(),
      });
    },

    /**
     * 比较数组返回雷的坐标集合
     */
    findMine({ flagArr, mineArr }) {
      const { boardData } = this;
      const notArr = [];
      const errorArr = [];
      if (JSON.stringify(flagArr) == JSON.stringify(mineArr)) {
        return {
          bool: true,
        };
      } else {
        for (let i = 0; i < flagArr.length; i++) {
          const flagPos = flagArr[i];
          for (let j = 0; j < mineArr.length; j++) {
            const minePos = mineArr[j];
            const falg = boardData[this.calcIdx(flagPos)];
            if (falg.type != "mine") {
              errorArr.push(flagPos);
            }
            const mine = boardData[this.calcIdx(minePos)];
            if (mine.isFlag) {
              notArr.push(minePos);
            }
          }
        }
        return {
          bool: false,
          notArr,
          errorArr,
        };
      }
    },

    /**
     * 点击空白处展开（显式栈，避免递归深度）
     */
    handleSpace(arr) {
      const { boardData } = this;
      const startItem = boardData[this.calcIdx(arr)];
      if (startItem && startItem.isRepeat === "not") {
        startItem.isRepeat = "is";
      }
      const stack = [arr];
      while (stack.length) {
        const pos = stack.pop();
        const neighbors = this.neighborIndices(pos);
        for (let i = 0; i < neighbors.length; i++) {
          const item = boardData[neighbors[i]];
          if (!item || item.isRepeat !== "not") continue;
          item.isRepeat = "is";
          if (item.type !== "mine") {
            if (!item.isCheck) {
              this.safeRemaining -= 1;
            }
            item.isCheck = true;
            if (item.isFlag) {
              item.isFlag = false;
              this.flagCount -= 1;
            }
          }
          if (item.type === "number") continue;
          if (item.type === "null") {
            stack.push(item.pos);
          }
        }
      }
    },

    /**
     * 传入坐标返回九宫格索引（越界裁剪）
     */
    neighborIndices([x, y]) {
      const [cols, rows] = this.boardSize;
      const indices = [];
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= rows) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= cols) continue;
          indices.push(ny * cols + nx);
        }
      }
      return indices;
    },

    /**
     * 选择难度
     */
    pickDifficulty({ mode, label }) {
      const { modeEnum } = SWEEP;
      this.difficultyByDevice = false;
      this.gameIsOver = false;
      this.defaultMode = mode;

      this.boardSize = modeEnum[mode].boardSize;
      this.mineCount = modeEnum[mode].mineCount;
      const type = modeEnum[mode].type;
      this.initBoard();
      this.HiAlert({
        type,
        content: `难度已重置为${label}`,
      });
    },

    /**
     * 给数字添加颜色
     */
    handleInsertColors(i) {
      let obj = {};
      switch (i) {
        case 1:
          obj.color = "rgb(226, 172, 172)";
          break;
        case 2:
          obj.color = "rgb(187, 134, 115)";
          break;
        case 3:
          obj.color = "rgb(221, 203, 144)";
          break;
        case 4:
          obj.color = "rgb(196, 206, 152)";
          break;
        case 5:
          obj.color = "rgb(113, 173, 116)";
          break;
        case 6:
          obj.color = "rgb(105, 189, 185)";
          break;
        case 7:
          obj.color = "rgb(107, 122, 155)";
          break;
        case 8:
          obj.color = "rgb(155, 94, 145)";
          break;
        case 9:
          obj.color = "rgb(192, 87, 101)";
          break;
      }
      return obj;
    },
  },
};
</script>

<style lang="scss" scoped>
@use "@style/sweep.scss";
</style>
