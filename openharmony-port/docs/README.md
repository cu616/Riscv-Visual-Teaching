# OpenHarmony 文档目录向导

更新时间：2026-05-09

本文是 `openharmony-port/docs/` 的入口。OpenHarmony 方向当前不是 ArkUI 原生重写，也不是继续维护 `ohos_electron_hap/` 作为主线，而是：

```text
app/ 非 Blockly 自研积木
→ npm.cmd run oh:check
→ rawfile 静态资源
→ ArkTS Index.ets + ArkWeb 加载本地页面
→ 预留 OpenHarmonyBridge
```

## 1. 推荐阅读顺序

| 顺序 | 文档 | 状态 | 用途 |
| --- | --- | --- | --- |
| 1 | [OpenHarmony ArkWeb 移植版说明](../README.md) | 当前入口 | 移植版总体路线、已完成内容和验证顺序。 |
| 2 | [OH 开发经验与 AI 接手须知](OH开发经验与AI接手须知.md) | 当前有效 | DevEco、SDK、AppScope、HDC、ArkWeb 和 RV2 经验。 |
| 3 | [2026-05-09 UI 与 OpenHarmony 展示移植方案](2026-05-09_UI与OpenHarmony展示移植方案.md) | 当前有效 | 新 UI、机器状态动画和 OpenHarmony 展示同步到 ArkWeb 的方案。 |
| 4 | [HDC 部署检查清单](HDC部署检查清单.md) | 当前有效 | 真机连接、构建安装、运行验收和排错。 |
| 5 | [OpenHarmony / 香橙派移植记录](移植记录.md) | 阶段记录 | 迁移过程、风险和命令行构建推进记录。 |

## 2. 按任务阅读

### 2.1 只想确认本地结构是否正确

读 [OpenHarmony ArkWeb 移植版说明](../README.md)，然后在仓库根目录运行：

```powershell
npm.cmd run oh:check
```

这会同步 `app/` 到 rawfile，生成诊断页，并执行结构 smoke。它不等价于 DevEco 构建成功，也不等价于真机运行成功。

### 2.2 要在 DevEco Studio 打开或修构建

先读：

1. [OH 开发经验与 AI 接手须知](OH开发经验与AI接手须知.md)
2. [OpenHarmony ArkWeb 移植版说明](../README.md)
3. [OpenHarmony / 香橙派移植记录](移植记录.md)

重点关注：

```text
build-profile.json5
AppScope/app.json5
entry/src/main/module.json5
entry/src/main/ets/pages/Index.ets
entry/src/main/resources/rawfile/app/
```

### 2.3 要上香橙派 RV2 真机

先读：

1. [HDC 部署检查清单](HDC部署检查清单.md)
2. [OH 开发经验与 AI 接手须知](OH开发经验与AI接手须知.md)
3. [2026-05-09 UI 与 OpenHarmony 展示移植方案](2026-05-09_UI与OpenHarmony展示移植方案.md)

重点验证：

- ArkWeb 页面不是白屏。
- 左侧素材栏、画布、右侧辅助栏在 1024x600 下可用。
- 触屏或鼠标拖拽不与页面滚动冲突。
- 单步执行能显示机器状态格动画。
- OpenHarmony 展示打开、切换、收起和动画让位逻辑正常。

### 2.4 要同步主线 UI 到 OpenHarmony

先改 `app/`，然后运行：

```powershell
npm.cmd run oh:check
```

不要直接手工修改以下同步产物里的主线文件：

```text
openharmony-port/entry/src/main/resources/rawfile/app/index.html
openharmony-port/entry/src/main/resources/rawfile/app/styles.css
openharmony-port/entry/src/main/resources/rawfile/app/src/
```

可以维护的 OpenHarmony 专用覆盖层：

```text
openharmony-port/entry/src/main/resources/rawfile/app/openharmony-port.css
openharmony-port/entry/src/main/resources/rawfile/app/openharmony-bridge.js
openharmony-port/scripts/templates/datapath-openharmony-stub.js
openharmony-port/entry/src/main/ets/pages/Index.ets
```

## 3. 与 `ohos_electron_hap/` 的关系

`ohos_electron_hap/` 是 OpenHarmony Electron 参考工程，体量较大，主要用来查 ArkTS、WebEngine、Electron HAP 和原生能力适配经验。当前产品主线不直接基于它继续开发。

需要查参考工程时，优先只读相关文件或文档，不要把整个参考工程的构建逻辑混入 `openharmony-port/`。
