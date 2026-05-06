# OpenHarmony 移植版说明

本目录是当前非 Blockly 自研积木应用的 OpenHarmony/香橙派移植版本。

## 技术路线

```text
现有 app/
→ 静态资源化
→ OpenHarmony ArkTS 壳
→ ArkWeb 加载本地 rawfile 页面
→ 预留 JSBridge/文件接口
→ HDC 部署到香橙派
```

第一版不做 ArkUI 原生重写，原因是当前自研积木的拖拽、吸附、执行调试、保存导入逻辑都已在 Web 层形成闭环。ArkWeb 方案可以最快在香橙派 OpenHarmony 上复用现有成果。

## 当前完成内容

- 新增 Stage 模型 OpenHarmony 工程骨架。
- 新增工程级和模块级 `hvigorfile.ts`，便于 DevEco Studio 识别构建任务。
- `build-profile.json5` 按当前开发机已安装的 ArkTS SDK 24，在 product 中声明数值型 `compileSdkVersion: 24`、`compatibleSdkVersion: 24`、`targetSdkVersion: 24` 和 `runtimeOS: "OpenHarmony"`。
- 参考 `ohos_electron_hap/` 补齐 `AppScope/resources/`，应用级 `app.json5` 使用 `$media:app_icon`、`$string:app_name` 和 `$profile:configuration`。
- `entry/src/main/resources/rawfile/app/` 内放置静态 Web 资源。
- `Index.ets` 使用 ArkWeb 加载 `$rawfile('app/index.html')`。
- 新增 `npm.cmd run oh:sync`，可从根目录 `app/` 重新同步 rawfile 静态资源，并自动恢复 OpenHarmony 专用补丁。
- 预留 `OpenHarmonyBridge`：
  - `getRuntimeInfo`
  - `saveCase`
  - `loadCase`
- OpenHarmony 版本隐藏数据流动画面板。
- `datapath.js` 在移植版中替换为轻量 stub，只保留执行文案所需标签函数。

## 尚未完成

- 原生文件保存/导入尚未接入 picker 或应用沙箱文件。
- 未在真实香橙派 OpenHarmony 镜像上做 HDC 部署验证。
- ArkWeb 对 rawfile 中相对路径资源的加载需要在 DevEco Studio 真机/板卡上最终确认。
- 如果目标镜像缺少 ArkWeb 能力，需要换镜像或改为本地 HTTP 服务承载。

## 建议验证顺序

1. 在仓库根目录执行：
   ```powershell
   npm.cmd run oh:check
   ```
2. 用 DevEco Studio 打开 `openharmony-port/`。
3. Sync/Build 工程。
4. 通过 HDC 连接香橙派 OpenHarmony。
5. Run `entry`。
6. 检查页面是否加载：
   - 指令积木区
   - 机器状态区
   - 汇编预览
   - 执行日志
7. 验证不显示数据流动画面板。
8. 验证拖拽、吸附、单步执行、上一步、保存导出是否仍可用。

真机部署排查见：

```text
docs/HDC部署检查清单.md
```

## 与桌面 Web 主线的关系

`openharmony-port/` 是独立移植目录，不影响根目录 `app/`、一键启动脚本和当前桌面演示版。
