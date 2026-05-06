(function () {
  const bridge = window.OpenHarmonyBridge;
  window.RiscVOpenHarmony = {
    available: Boolean(bridge),
    getRuntimeInfo() {
      if (!bridge?.getRuntimeInfo) return { platform: "web", shell: "browser" };
      try {
        return JSON.parse(bridge.getRuntimeInfo());
      } catch {
        return { platform: "OpenHarmony", shell: "ArkWeb" };
      }
    },
    saveCase(payload) {
      if (!bridge?.saveCase) return { ok: false, reason: "OpenHarmony bridge is unavailable." };
      try {
        return JSON.parse(bridge.saveCase(JSON.stringify(payload)));
      } catch (error) {
        return { ok: false, reason: String(error) };
      }
    },
    loadCase() {
      if (!bridge?.loadCase) return { ok: false, reason: "OpenHarmony bridge is unavailable." };
      try {
        return JSON.parse(bridge.loadCase());
      } catch (error) {
        return { ok: false, reason: String(error) };
      }
    }
  };
})();
