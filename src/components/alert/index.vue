<template>
  <div class="alert_box">
    <transition-group name="alanAlert">
      <div
        class="alert_style"
        :class="`toast-${item.type}`"
        v-for="item in alertQueue"
        :key="item.alertId"
      >
        <div :class="`alert alert-${item.type}`">{{ item.content }}</div>
      </div>
    </transition-group>
  </div>
</template>

<script>
import { mapState } from "vuex";
export default {
  computed: {
    ...mapState(["alertQueue"]),
  },
};
</script>

<style scoped>
.alert_box {
  position: fixed;
  top: 88px;
  top: calc(88px + var(--app-top-total, 0px));
  left: 0;
  right: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 16px;
  pointer-events: none;
}

.alert_style + .alert_style {
  margin-top: 8px;
}

.alert_style {
  --toast-accent: #94a3b8;
  position: relative;
  box-sizing: border-box;
  width: min(500px, 100%);
  min-height: 48px;
  display: flex;
  align-items: center;
  padding: 0 16px 0 38px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.94);
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}

.alert_style::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--toast-accent);
}

.alert_style::after {
  content: "";
  position: absolute;
  left: 16px;
  top: 50%;
  width: 8px;
  height: 8px;
  margin-top: -4px;
  border-radius: 50%;
  background: var(--toast-accent);
}

.toast-success {
  --toast-accent: #2dd4bf;
}

.toast-danger {
  --toast-accent: #f87171;
}

.toast-warning {
  --toast-accent: #fbbf24;
}

.toast-primary {
  --toast-accent: #60a5fa;
}

.toast-secondary {
  --toast-accent: #94a3b8;
}

.alert_style .alert {
  width: 100%;
  margin: 0;
  padding: 13px 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: #e2e8f0;
  font-family: "Neucha", sans-serif;
  font-size: 13px;
  line-height: 1.35;
}

@media (max-width: 1023.98px) {
  .alert_box {
    top: 96px;
    top: calc(96px + var(--app-top-total, 0px));
  }
}

@media (max-width: 767.98px) {
  .alert_box {
    top: 144px;
    top: calc(144px + var(--app-top-total, 0px));
  }
}

@media (max-height: 520px) {
  .alert_box {
    top: 64px;
    top: calc(64px + var(--app-top-total, 0px));
  }
}
</style>
