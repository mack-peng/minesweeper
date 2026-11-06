<template>
  <transition name="alanAlert">
    <div class="awe_back" v-if="cartoon.isShow" @click.self="hideThere">
      <div
        class="result-card"
        :class="cartoon.type === 'win' ? 'result-win' : 'result-lose'"
      >
        <div class="result-media">
          <img ref="resultImage" class="awe_img" :src="imgUrl" alt />
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
        <button
          class="result-btn result-btn--share"
          type="button"
          :disabled="sharing"
          @click="shareResult"
        >
          {{ sharing ? "生成中…" : "分享战绩" }}
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

const SHARE_TITLES = {
  win: {
    普通: "扫雷普通难度，谁来挑战我？",
    困难: "扫雷困难难度，这波通关了！",
    疯狂: "扫雷疯狂难度，我稳住了！",
    地狱: "扫雷地狱难度，我做到了！",
    default: "扫雷通关，谁来挑战我？",
  },
  fail: {
    普通: "扫雷普通难度，翻车了 😭",
    困难: "扫雷困难难度，求大神带！",
    疯狂: "扫雷疯狂难度，教我做人 😭",
    地狱: "扫雷地狱难度，我尽力了…",
    default: "扫雷翻车了，求大神带！",
  },
};

const SHARE_CTAS = {
  win: "你能比我更快吗？来一局试试，评论区晒晒你的成绩～",
  fail: "你们能撑到第几格？来一局帮我报仇～",
};

export default {
  data() {
    return {
      sharing: false,
    };
  },
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
    async shareResult() {
      if (this.sharing) return;
      const miniTool = window.xhs && window.xhs.miniTool;
      if (!miniTool) {
        this.HiAlert({
          type: "warning",
          content: "当前环境不支持分享，请在小红书 App 内打开",
        });
        return;
      }

      this.sharing = true;
      try {
        const dataUrl = await this.buildShareImage();
        let filePath = dataUrl;

        if (typeof miniTool.writeTempFile === "function") {
          try {
            const temp = await miniTool.writeTempFile({ data: dataUrl });
            if (temp && temp.filePath) filePath = temp.filePath;
          } catch (error) {
            // 回退到 data URI
          }
        }

        if (typeof miniTool.postNote === "function") {
          await miniTool.postNote({
            title: this.shareTitle(),
            content: this.shareContent(),
            pageType: "photo_publish",
            mediaInfo: {
              image_resources: [{ url: filePath }],
            },
          });
          return;
        }

        if (typeof miniTool.saveImageToPhotosAlbum === "function") {
          await miniTool.saveImageToPhotosAlbum({ filePath });
          this.HiAlert({
            type: "success",
            content: "战绩图已保存到相册",
          });
          return;
        }

        this.HiAlert({
          type: "warning",
          content: "当前客户端暂不支持分享",
        });
      } catch (error) {
        const message = (error && (error.errMsg || error.message)) || "";
        if (!/cancel|取消/i.test(message)) {
          this.HiAlert({
            type: "warning",
            content: "分享未完成，请稍后重试",
          });
        }
      } finally {
        this.sharing = false;
      }
    },
    buildShareImage() {
      return new Promise((resolve, reject) => {
        const image = this.$refs.resultImage;
        const draw = () => {
          try {
            resolve(this.drawShareImage(image));
          } catch (error) {
            reject(error);
          }
        };
        if (!image || image.complete) {
          draw();
          return;
        }

        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          draw();
        };
        const timer = setTimeout(finish, 1000);
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
      });
    },
    drawShareImage(image, withoutImage) {
      const canvas = document.createElement("canvas");
      canvas.width = 750;
      canvas.height = 1000;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");

      const win = this.cartoon.type === "win";
      const accent = win ? "#2dd4bf" : "#f87171";
      const font =
        '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

      const background = ctx.createLinearGradient(0, 0, 750, 1000);
      background.addColorStop(0, win ? "#123236" : "#33191f");
      background.addColorStop(0.45, "#0b1220");
      background.addColorStop(1, "#070b14");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, 750, 1000);

      const glow = ctx.createRadialGradient(375, 150, 0, 375, 150, 520);
      glow.addColorStop(
        0,
        win ? "rgba(45,212,191,0.2)" : "rgba(248,113,113,0.18)"
      );
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 750, 1000);

      const card = { x: 44, y: 44, width: 662, height: 912, radius: 36 };
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 46;
      ctx.shadowOffsetY = 18;
      ctx.fillStyle = "#0f1a2e";
      this.roundRect(
        ctx,
        card.x,
        card.y,
        card.width,
        card.height,
        card.radius
      );
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = "rgba(148,163,184,0.24)";
      ctx.lineWidth = 2;
      this.roundRect(
        ctx,
        card.x,
        card.y,
        card.width,
        card.height,
        card.radius
      );
      ctx.stroke();

      const media = { x: 66, y: 66, width: 618, height: 366, radius: 22 };
      ctx.save();
      this.roundRect(
        ctx,
        media.x,
        media.y,
        media.width,
        media.height,
        media.radius
      );
      ctx.clip();

      if (image && image.naturalWidth) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(media.x, media.y, media.width, media.height);
        const scale = Math.min(
          media.width / image.naturalWidth,
          media.height / image.naturalHeight
        );
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        ctx.drawImage(
          image,
          media.x + (media.width - width) / 2,
          media.y + (media.height - height) / 2,
          width,
          height
        );
      } else {
        const mediaGradient = ctx.createLinearGradient(
          media.x,
          media.y,
          media.x + media.width,
          media.y + media.height
        );
        mediaGradient.addColorStop(0, "#1e293b");
        mediaGradient.addColorStop(1, "#0b1220");
        ctx.fillStyle = mediaGradient;
        ctx.fillRect(media.x, media.y, media.width, media.height);
      }

      const shade = ctx.createLinearGradient(
        0,
        media.y + media.height - 100,
        0,
        media.y + media.height
      );
      shade.addColorStop(0, "rgba(11,18,32,0)");
      shade.addColorStop(1, "rgba(11,18,32,0.55)");
      ctx.fillStyle = shade;
      ctx.fillRect(
        media.x,
        media.y + media.height - 100,
        media.width,
        100
      );
      ctx.restore();

      ctx.fillStyle = accent;
      this.roundRect(ctx, media.x + 22, media.y + 22, 96, 44, 22);
      ctx.fill();
      ctx.fillStyle = "#0b1220";
      ctx.font = "bold 22px " + font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        win ? "WIN" : "LOSE",
        media.x + 22 + 48,
        media.y + 22 + 22
      );

      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 56px " + font;
      ctx.fillText(win ? "你赢了" : "游戏失败", 66, 476);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "26px " + font;
      ctx.fillText(this.subtitle, 66, 554);

      ctx.strokeStyle = "rgba(148,163,184,0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(66, 614);
      ctx.lineTo(684, 614);
      ctx.stroke();

      const stats = this.shareStats();
      const columns = [66, 274, 482];
      stats.forEach((item, index) => {
        const x = columns[index];
        ctx.fillStyle = "#94a3b8";
        ctx.font = "24px " + font;
        ctx.fillText(item.label, x, 648);
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "36px " + font;
        ctx.fillText(item.value, x, 684);
      });

      ctx.textAlign = "left";
      ctx.fillStyle = "#94a3b8";
      ctx.font = "22px " + font;
      ctx.fillText("扫雷 · MINESWEEPER", 66, 906);

      try {
        return canvas.toDataURL("image/png");
      } catch (error) {
        if (withoutImage) throw error;
        return this.drawShareImage(null, true);
      }
    },
    roundRect(ctx, x, y, width, height, radius) {
      const r = Math.min(radius, width / 2, height / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + width, y, x + width, y + height, r);
      ctx.arcTo(x + width, y + height, x, y + height, r);
      ctx.arcTo(x, y + height, x, y, r);
      ctx.arcTo(x, y, x + width, y, r);
      ctx.closePath();
    },
    shareStats() {
      const win = this.cartoon.type === "win";
      const thirdLabel = win
        ? "地雷"
        : this.cartoon.reason === "chord"
        ? "误判"
        : "踩雷";
      return [
        { label: "用时", value: this.cartoon.time || "00:00:00" },
        { label: "翻开", value: String(this.cartoon.opened || 0) },
        {
          label: thirdLabel,
          value: String(win ? this.cartoon.mines || 0 : 1),
        },
      ];
    },
    shareTitle() {
      const titles =
        this.cartoon.type === "win" ? SHARE_TITLES.win : SHARE_TITLES.fail;
      const title =
        titles[this.cartoon.difficulty] || titles.default;
      return Array.from(title).slice(0, 20).join("");
    },
    shareContent() {
      const win = this.cartoon.type === "win";
      const result = win
        ? `${this.cartoon.mines || 0} 颗雷全部排除`
        : this.cartoon.reason === "chord"
        ? "九宫格误判"
        : "踩到地雷";
      const cta = win ? SHARE_CTAS.win : SHARE_CTAS.fail;
      return `用时 ${this.cartoon.time || "00:00:00"}，翻开 ${
        this.cartoon.opened || 0
      } 格，${result}。${cta} #扫雷 #小游戏`;
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
  max-height: calc(100vh - 32px);
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
  grid-gap: 12px;
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

.result-btn--share {
  margin-top: 10px;
  background: rgba(45, 212, 191, 0.12);
  border-color: rgba(45, 212, 191, 0.45);
  color: #2dd4bf;
  font-weight: 600;
}

.result-btn[disabled] {
  opacity: 0.6;
  cursor: default;
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
