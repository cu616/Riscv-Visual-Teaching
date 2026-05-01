import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("riscvDesktop", {
  platform: process.platform
});
