<template>
  <transition name="alanAlert">
    <div class="awe_back" v-if="cartoon.isShow" @click.self="hideThere">
      <div
        class="result-card"
        :class="cartoon.type === 'win' ? 'result-win' : 'result-lose'"
      >
        <div class="result-media">
          <img class="awe_img" :src="imgUrl" alt />
          <span class="result-badge">{{ cartoon.type === "win" ? "WIN" : "LOSE" }}</span>
          <button class="result-close" type="button" @click="hideThere">×</button>
        </div>
        <h2 class="result-title">
          {{ cartoon.type === "win" ? "你赢了" : "游戏失败" }}
        </h2>
        <p class="result-subtitle">{{ subtitle }}</p>
        <div class="result-stats">
          <div>
            <span>用时</span>
            <strong>{{ cartoon.time || "00:00:00" }}</strong>
          </div>
          <div>
            <span>翻开</span>
            <strong>{{ cartoon.opened || 0 }}</strong>
          </div>
          <div>
            <span>{{
              cartoon.type === "win"
                ? "地雷"
                : cartoon.reason === "chord"
                ? "误判"
                : "踩雷"
            }}</span>
            <strong>{{ cartoon.type === "win" ? cartoon.mines || 0 : 1 }}</strong>
          </div>
        </div>
        <button class="result-btn result-btn--primary" type="button" @click="restart">
          再来一局
        </button>
        <button class="result-btn result-btn--ghost" type="button" @click="hideThere">
          关闭
        </button>
      </div>
    </div>
  </transition>
</template>

<script>
import { mapState } from "vuex";
const imgs = import.meta.glob("../../assets/img/winOrFail/*.jpg", {
  eager: true,
  import: "default",
});

export default {
  computed: {
    imgUrl() {
      const { type } = this.cartoon;
      if (!type) return "";
      const pool = Object.keys(imgs).filter((key) => key.includes(`/${type}_`));
      const picked = pool[Math.floor(Math.random() * pool.length)];
      return picked ? imgs[picked] : "";
    },
    subtitle() {
      const { type, difficulty, reason } = this.cartoon;
      const mode = difficulty ? `${difficulty}难度` : "";
      const result =
        type === "win"
          ? "全部安全格已翻开"
          : reason === "chord"
          ? "九宫格旗数校验失败"
          : "踩到地雷";
      return [mode, result].filter(Boolean).join(" · ");
    },
    ...mapState(["cartoon"]),
  },
  methods: {
    hideThere() {
      this.HiImg({ isShow: "hide" });
    },
    restart() {
      this.$root.$emit("minesweeper:restart");
    },
  },
};
</script>

<style scoped>
.awe_back {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(2, 4, 8, 0.72);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  user-select: none;
}

.result-card {
  box-sizing: border-box;
  width: min(420px, 100%);
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  padding: 24px;
  border-radius: 24px;
  background: rgba(15, 23, 42, 0.97);
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.55);
  color: #e2e8f0;
  font-family: "Neucha", sans-serif;
}

.result-media {
  position: relative;
}

.awe_img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 372 / 220;
  object-fit: contain;
  border-radius: 16px;
  background: #fff;
}

.result-badge {
  position: absolute;
  top: 0;
  left: 0;
  padding: 4px 10px;
  border-radius: 999px;
  background: #2dd4bf;
  color: #0b1220;
  font-family: "Patrick Hand SC", cursive;
  font-size: 11px;
  letter-spacing: 1px;
}

.result-lose .result-badge {
  background: #f87171;
}

.result-close {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(2, 4, 8, 0.55);
  color: #e2e8f0;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.result-title {
  margin: 20px 0 4px;
  font-family: "Patrick Hand SC", cursive;
  font-size: 34px;
  font-weight: 400;
  line-height: 1.1;
  color: #e2e8f0;
}

.result-subtitle {
  margin: 0;
  color: #94a3b8;
  font-size: 14px;
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 18px 0;
  padding-top: 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.result-stats span {
  display: block;
  margin-bottom: 4px;
  color: #94a3b8;
  font-size: 11px;
}

.result-stats strong {
  color: #e2e8f0;
  font-size: 16px;
  font-weight: 400;
}

.result-btn {
  display: block;
  width: 100%;
  height: 48px;
  border: 1px solid transparent;
  border-radius: 12px;
  font-family: "Neucha", sans-serif;
  font-size: 15px;
  cursor: pointer;
}

.result-btn--primary {
  background: #2dd4bf;
  color: #0b1220;
  font-weight: 600;
}

.result-btn--ghost {
  margin-top: 10px;
  background: rgba(148, 163, 184, 0.08);
  border-color: rgba(148, 163, 184, 0.25);
  color: #e2e8f0;
}

@media (max-width: 767.98px) {
  .result-card {
    padding: 20px;
    border-radius: 20px;
  }

  .result-title {
    font-size: 30px;
  }
}
</style>
