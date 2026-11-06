import { defineConfig } from "vite";
import vue2 from "@vitejs/plugin-vue2";
import path from "node:path";

function classicScript() {
  return {
    name: "classic-script",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        return html
          .replace(
            /<script type="module" crossorigin src=/g,
            "<script defer src="
          )
          .replace(/ crossorigin/g, "")
          .replace(/<link rel="modulepreload"[^>]*>\s*/g, "");
      },
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [vue2(), classicScript()],
  build: {
    target: ["es2017", "chrome61"],
    cssTarget: "chrome61",
    copyPublicDir: false,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@image": path.resolve(__dirname, "src/assets/img"),
      "@style": path.resolve(__dirname, "src/assets/css"),
      "@constants": path.resolve(__dirname, "src/constants/index.js"),
      "@mixin-scss": path.resolve(__dirname, "src/utils/common.scss"),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
    },
  },
});
