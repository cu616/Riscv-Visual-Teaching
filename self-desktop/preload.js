const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("riscvSelfDesktop", {
  platform: process.platform,
  flavor: "self-built-blocks"
});
