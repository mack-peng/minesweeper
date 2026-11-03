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
        <button class="btn" :class="{ 'btn--on': flagMode }" @click="toggleFlagMode">
          <span class="label-full">🚩 插旗模式</span>
          <span class="label-short">🚩 插旗</span>
        </button>
        <button class="btn btn--accent" @click="onRestart">
          <span class="label-full">重新开始</span>
          <span class="label-short">重开</span>
        </button>
      </div>
    </header>
    <main class="board-panel">
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
            @contextmenu.prevent="insertFlag(item)"
            @mousedown="clickBoard($event, item)"
          >
            {{ item.isCheck ? item.number : "" }}
          </div>
        </div>
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
      minePos: [],
      boardData: [],
      gameIsOver: false,
      gameWon: false,
      gameStarted: false,
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
      const { boardData, mineCount } = this;
      const flags = boardData.reduce((c, i) => (i.isFlag ? c + 1 : c), 0);
      return mineCount - flags;
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
      const safeCells = this.boardData.filter((item) => item.type !== "mine");
      if (safeCells.length && safeCells.every((item) => item.isCheck)) {
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
        boardSize: [a, b],
      } = this;
      let i = 0;
      const randomArr = [];
      while (i < mineCount) {
        const ran = parseInt(Math.random() * a * b);
        let l = randomArr.length;
        let bool = false;
        if (l) {
          for (let n = 0; n < l; n++) {
            if (ran == randomArr[n]) {
              bool = true;
              break;
            }
          }
        }
        if (!bool) {
          randomArr.push(ran);
          i++;
        }
      }
      let minePos = [];
      randomArr.map((item) => {
        boardData[item].type = "mine";
        minePos.push(boardData[item].pos);
      });
      this.minePos = minePos;
      this.calcMineForNumber();
    },

    /**
     * 计算格子周围有多少雷
     */
    calcMineForNumber() {
      const { boardData, minePos } = this;
      boardData.map((item) => {
        let count = 0;
        const sudoku = this.requestPos(item.pos);
        sudoku.map((sudo) => {
          minePos.map((mine) => {
            if (sudo[0] == mine[0] && sudo[1] == mine[1]) {
              count++;
            }
          });
        });
        if (item.type == "init") {
          if (count == 0) {
            item.type = "null";
          } else {
            item.type = "number";
            item.number = count;
            item.styles = this.handleInsertColors(count);
          }
        }
      });
    },

    /**
     * 右键/插旗模式 插旗子
     */
    insertFlag(item) {
      if (this.gameIsOver) return;
      if (item.isCheck) {
        item.isFlag = false;
        return;
      }
      this.gameStarted = true;
      this.startTimer();
      item.isFlag = !item.isFlag;
    },

    /**
     * 首击保护：保证以首击格为中心的 3×3 范围无雷
     */
    ensureSafeOpening([x, y]) {
      const zone = [[x, y], ...this.requestPos([x, y])];
      const zoneSet = new Set(zone.map((pos) => this.calcIdx(pos)));
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
          target.isFlag = true;
        }
      });
      this.boardData.forEach((item) => {
        if (item.type === "mine") return;
        item.type = "init";
        item.number = undefined;
        item.styles = {};
        item.isRepeat = "not";
      });
      this.minePos = this.boardData
        .filter((item) => item.type === "mine")
        .map((item) => item.pos);
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
      this.tipUserSudoForPos(item);
      document.onmouseup = () => {
        for (let i = 0; i < boardData.length; i++) {
          const theOne = boardData[i];
          theOne.isTip = false;
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
      const sudoku = this.requestPos(pos);
      for (let i = 0; i < sudoku.length; i++) {
        const idx = this.calcIdx(sudoku[i]);
        const item = boardData[idx];
        if (item && !item.isCheck) {
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
     * 点击空白处递归方法
     */
    handleSpace(arr) {
      const { boardData } = this;
      const sudoku = this.requestPos(arr);
      for (let i = 0; i < sudoku.length; i++) {
        const idx = this.calcIdx(sudoku[i]);
        const item = boardData[idx];
        if (item == undefined) {
          continue;
        }
        if (item.isRepeat === "not") {
          item.isRepeat = "is";
          if (item.type !== "mine") {
            item.isCheck = true;
            item.isFlag = false;
          }
          if (item.type === "number") {
            continue;
          }
          if (item.type === "null") {
            this.handleSpace(item.pos);
          }
        }
      }
    },

    /**
     * 传入坐标返回九宫格的二维数组
     */
    requestPos([x, y]) {
      const [maxX, maxY] = this.boardSize;
      const arr = [
        [x - 1, y - 1],
        [x, y - 1],
        [x + 1, y - 1],
        [x - 1, y],
        [x + 1, y],
        [x - 1, y + 1],
        [x, y + 1],
        [x + 1, y + 1],
      ];
      const filterArr = arr.filter(
        ([posX, posY]) =>
          !(posX < 0 || posY < 0 || posX >= maxX || posY >= maxY)
      );
      return filterArr;
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
