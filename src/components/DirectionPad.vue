<template>
  <div class="dpad">
    <button class="pad up" @touchstart.prevent="tap('up')">▲</button>
    <button class="pad left" @touchstart.prevent="tap('left')">◀</button>
    <button class="pad right" @touchstart.prevent="tap('right')">▶</button>
    <button class="pad down" @touchstart.prevent="tap('down')">▼</button>
  </div>
</template>

<script>
export default {
  name: "DirectionPad",
  methods: {
    tap(dir) {
      this.$emit("dir", dir);
    },
  },
};
</script>

<style scoped lang="scss">
.dpad {
  --pad: clamp(44px, 14vw, 64px);
  display: grid;
  grid-template-columns: repeat(3, var(--pad));
  grid-template-rows: repeat(2, calc(var(--pad) * 0.9));
  gap: clamp(4px, 1vw, 8px);
  justify-content: center;
  user-select: none;
  touch-action: manipulation;
}
.pad {
  border: 2px solid #41403e;
  border-radius: 5px;
  box-shadow: 2px 2px 0 #41403e;
  background: #fafafa;
  color: #41403e;
  font-size: clamp(14px, 3.2vw, 18px);
  cursor: pointer;
}
.pad:active {
  box-shadow: inset 2px 2px 0 #41403e;
  background: #d0dbc2;
}
.up { grid-column: 2; grid-row: 1; }
.left { grid-column: 1; grid-row: 2; }
.right { grid-column: 3; grid-row: 2; }
.down { grid-column: 2; grid-row: 2; }
@media (min-width: 1024px) {
  .dpad { display: none; }
}
</style>
