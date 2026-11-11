import Vue from "vue";
import Vuex from "vuex";

import { GET_SESSION, DEL_SESSION } from "../utils/index.js";

Vue.use(Vuex);

const store = new Vuex.Store({
  state: {
    alertQueue: [],
    alertId: 0,
    alertClearTimer: null,
    cartoon: {},
  },
  mutations: {
    /**
     * 新增alert队列
     */
    handleAlert(state, data) {
      state.alertId += 1;
      const alertId = state.alertId;
      if (data.clear) {
        clearTimeout(state.alertClearTimer);
        state.alertQueue = [{ ...data, alertId }];
        state.alertClearTimer = setTimeout(() => {
          state.alertQueue = state.alertQueue.filter(
            (item) => item.alertId !== alertId
          );
        }, 2000);
        return;
      }
      state.alertQueue.push({ ...data, alertId });
      if (state.alertQueue.length > 3) {
        state.alertQueue.splice(0, state.alertQueue.length - 3);
      }
      setTimeout(() => {
        state.alertQueue = state.alertQueue.filter(
          (item) => item.alertId !== alertId
        );
      }, 2000);
    },

    /**
     * 显示暴漫图片
     */
    showCartoon(state, data) {
      state.cartoon = data;
    },

    /**
     * 公共方法设置state参数
     */
    submit(state, item) {
      for (const i in item) {
        state[i] = item[i];
      }
    },
  },
  actions: {
    /**
     * 初始化store（sessionStorage 快照恢复）
     */
    initStore(state, _this) {
      const snapshot = GET_SESSION("store");
      if (!snapshot) return;
      try {
        _this.$store.replaceState(
          Object.assign({}, state, JSON.parse(snapshot))
        );
      } catch (error) {
        // Ignore corrupted or unavailable browser storage snapshots
      }
      DEL_SESSION("store");
    },
  },
});
export default store;
