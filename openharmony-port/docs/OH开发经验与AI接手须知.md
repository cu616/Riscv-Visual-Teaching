# OH 开发经验与 AI 接手须知

日期：2026-05-06

本文档面向后续接手本仓库的 AI 或团队成员。OpenHarmony 开发很依赖环境、SDK、板卡和 DevEco Studio 经验，不能只按普通 Web/Electron 项目理解。本项目当前采用 `ArkTS 壳 + ArkWeb + rawfile 静态资源` 的轻量移植路线，不走完整 Electron HAP 路线。

## 1. 当前路线判断

当前主线仍是：

```text
app/
→ openharmony-port/scripts/sync-rawfile.mjs
→ entry/src/main/resources/rawfile/app/
→ ArkTS Index.ets
→ ArkWeb 加载 $rawfile('app/index.html')
→ HDC 部署到 Orange Pi RV2
```

不要轻易把方案改成 Electron HAP。仓库里的 `ohos_electron_hap/` 是参考工程，主要用于对照 DevEco/Hvigor 工程结构、`AppScope` 资源组织和 HAP 构建经验。它包含 Chromium/Electron/native so，工程量和架构风险远高于当前 ArkWeb rawfile 路线，且 RV2 是 RISC-V 板卡，原生库兼容风险更高。

## 2. 必须先跑的仓库命令

每次修改 `app/` 或 `openharmony-port/` 后，先在仓库根目录执行：

```powershell
npm.cmd run oh:check
```

它会先执行 `oh:sync`，把 `app/` 同步到 rawfile，再执行 `oh:smoke`。不要手工复制 `app/src` 到 rawfile，除非你正在修同步脚本本身。

当前 `oh:smoke` 不只是检查 HTML，还会检查：

- ArkTS 入口文件。
- rawfile 页面资源。
- OpenHarmony 专用 CSS 和 JSBridge。
- 轻量数据流 stub。
- `AppScope/resources/base/` 应用级资源。
- `build-profile.json5` 的 OpenHarmony SDK 字段类型。

## 3. DevEco build-profile 经验

当前 DevEco Studio / OpenHarmony SDK 环境：

```text
D:\Program Files\Huawei\DevEco Studio\sdk\default\openharmony\ets\oh-uni-package.json
apiVersion: 24
```

2026-05-06 命令行验证时还发现，本机 SDK 实际安装为：

```text
D:\Program Files\Huawei\DevEco Studio\sdk\default\openharmony\ets
D:\Program Files\Huawei\DevEco Studio\sdk\default\openharmony\js
D:\Program Files\Huawei\DevEco Studio\sdk\default\openharmony\native
D:\Program Files\Huawei\DevEco Studio\sdk\default\openharmony\previewer
D:\Program Files\Huawei\DevEco Studio\sdk\default\openharmony\toolchains
```

而 hvigor 6.24.1 按 API 24 期望组件位于：

```text
...\openharmony\24\ets
...\openharmony\24\js
...\openharmony\24\native
...\openharmony\24\previewer
...\openharmony\24\toolchains
```

为避免改动 DevEco 安装目录，当前命令行验证使用项目内本地 SDK 镜像：

```text
openharmony-port/.oh-sdk/24/*
```

其中各组件是指向 DevEco SDK 实际目录的 junction，`local.properties` 指向：

```properties
sdk.dir=C:/Users/lbc/dachuang/openharmony-port/.oh-sdk
```

`.oh-sdk/` 和 `local.properties` 是本机环境产物，已加入 `.gitignore`。如果换电脑或用 DevEco Studio 图形界面，优先按该机器的 SDK 布局重新生成或改回 IDE 自动识别的配置。

一键生成本机 SDK 镜像：

```powershell
npm.cmd run oh:setup-sdk
```

如果 DevEco Settings 报 OpenHarmony SDK 路径不合法，路径应选：

```text
C:\Users\lbc\dachuang\openharmony-port\.oh-sdk
```

不要选原始扁平目录：

```text
D:\Program Files\Huawei\DevEco Studio\sdk\default\openharmony
```

因为 `runtimeOS` 是 `OpenHarmony`，工程级 `build-profile.json5` 的 product 中 SDK 字段必须用数值：

```json5
{
  "name": "default",
  "signingConfig": "default",
  "compileSdkVersion": 24,
  "compatibleSdkVersion": 24,
  "targetSdkVersion": 24,
  "runtimeOS": "OpenHarmony"
}
```

不要写成 HarmonyOS 字符串，例如：

```json5
"compatibleSdkVersion": "5.0.0(12)"
```

DevEco 会报：

```text
compileSdkVersion、compatibleSdkVersion 或 targetSdkVersion 的值不正确
```

如果报：

```text
请在product字段下配置compileSdkVersion
```

说明 `compileSdkVersion` 放错层级或缺失。当前版本应放在 `app.products[0]` 下，而不是单独放在 `app` 根部。

## 4. AppScope 资源经验

`AppScope/app.json5` 中的资源引用解析的是应用级资源，位置是：

```text
openharmony-port/AppScope/resources/base/
```

当前必须保留：

```text
AppScope/resources/base/element/string.json
AppScope/resources/base/media/app_icon.png
AppScope/resources/base/media/icon.png
AppScope/resources/base/media/startIcon.png
AppScope/resources/base/profile/configuration.json
```

不要只在 `entry/src/main/resources/base/` 下放图标。那是模块级资源，不等价于应用级 `AppScope` 资源。

`ohos_electron_hap/` 对这里很有参考价值，它的 `AppScope/app.json5` 使用：

```json5
"icon": "$media:app_icon",
"label": "$string:app_name",
"configuration": "$profile:configuration"
```

当前移植版也按这个方向补齐了 AppScope 资源。

## 5. DevEco 同步排错经验

DevEco 右侧通知里的：

```text
Scan files to index fail
```

通常不是根因，只是索引器失败的泛化提示。真正原因通常在同一时间线下面的红色 `同步失败` 里，例如：

- 未找到某版本 SDK。
- product 字段缺 `compileSdkVersion`。
- SDK 字段类型错误。
- AppScope 或 module 中引用了不存在的资源。

后续 AI 不要只围绕 `Scan files to index fail` 猜。应该要求用户提供右侧通知中 `同步失败` 下方的具体文字，或让用户点击 `了解更多` 看字段说明。

如果 DevEco 仍旧显示旧错误：

1. 关闭 DevEco Studio。
2. 删除 `openharmony-port/.idea`。
3. 重新打开 `C:\Users\lbc\dachuang\openharmony-port`。
4. 点左上角 `文件(F)` 下的 `同步并刷新项目`。

命令行同步经验：

- DevEco 自带 `hvigorw.bat` 会使用当前 Node 所在目录推导 `npm.cmd`，如果 Node 位于 `C:\Program Files\nodejs`，可能因为路径空格导致 pnpm/npm 安装链路异常。
- 当前仓库保留 `openharmony-port/tools/npm.cmd` 作为无空格路径包装器；命令行验证时曾临时复制 `node.exe` 到 `openharmony-port/tools/node.exe`，该大文件已加入忽略规则。
- `openharmony-port/hvigor/hvigor-config.json5` 已设置 `"hvigor.dependency.useNpm": true`，用于避开 pnpm 自动安装链路。
- 直接运行 DevEco 的 `hvigor.js` 可完成同步：

```powershell
$env:HVIGOR_USER_HOME = "C:\Users\lbc\dachuang\openharmony-port\.hvigor-user2"
& "C:\Users\lbc\dachuang\openharmony-port\tools\node.exe" `
  "D:\Program Files\Huawei\DevEco Studio\tools\hvigor\hvigor\bin\hvigor.js" `
  --sync -p product=default --analyze=normal --parallel --incremental --no-daemon
```

在当前 Codex 沙箱内，`assembleApp` 已推进到 `:entry:default@CompileResource`，随后被沙箱阻止外部资源编译工具 `spawn EPERM`。这不是项目配置错误；应在 DevEco Studio 或获得外部命令权限的终端中继续跑。

## 6. Orange Pi RV2 / HDC 经验

RV2 的 Type-C 是供电口，不是 HDC 数据口。连接电脑时应使用：

```text
电脑 USB-A 口 <-> USB2.0 公对公数据线 <-> RV2 的 USB2.0 HOST/DEVICE 口
```

不要用：

```text
电脑 USB-A <-> RV2 Type-C 电源口
电脑 USB-A <-> RV2 USB3.0 HOST 口
普通只能充电的 USB 线
```

手册依据：

- `docs/OrangePi_RV2_X1_用户手册_v1.1.pdf`
- `docs/OPI RV2 V1_1_SCH_20250508(1).pdf`

本机 hdc 路径：

```text
D:\Program Files\Huawei\DevEco Studio\sdk\default\openharmony\toolchains\hdc.exe
```

临时加入当前 PowerShell：

```powershell
$env:Path += ";D:\Program Files\Huawei\DevEco Studio\sdk\default\openharmony\toolchains"
hdc kill
hdc start -r
hdc list targets
```

当前已成功识别过 RV2，设备号：

```text
0123456789ABCDEF
```

进入 `hdc shell` 后提示符会变成：

```text
#
```

此时已经在板端 shell 里，不能执行 Windows 路径或 `npm.cmd`。要运行 `npm.cmd run oh:check` 必须先 `exit` 回到 Windows PowerShell。

## 7. ArkWeb 移植边界

当前 `Index.ets` 负责：

- 创建 ArkWeb。
- 加载 `$rawfile('app/index.html')`。
- 打开 JavaScript、DOM Storage、file access。
- 挂载 `OpenHarmonyBridge`。

当前 JSBridge 只做预留：

```text
getRuntimeInfo 已实现
saveCase 返回“原生文件接口待实现”
loadCase 返回“原生文件接口待实现”
```

不要把保存/导入问题误判为主线 Web 逻辑坏了。ArkWeb 中 `<input type="file">` 和浏览器下载能力可能受系统限制，下一阶段应通过 OpenHarmony 原生文件 picker 或应用沙箱文件实现。

## 8. 数据流动画处理

用户明确允许 OpenHarmony 移植版删去数据流动画部分。当前策略是：

- `openharmony-port.css` 隐藏 `.visual-panel`。
- rawfile 里的 `src/datapath.js` 使用 `scripts/templates/datapath-openharmony-stub.js` 生成。
- stub 只保留执行说明需要的函数，不做动画。

不要从 `app/src/datapath.js` 手工恢复完整动画到移植版。每次 `oh:sync` 都会重新用 stub 覆盖 rawfile 的 `datapath.js`。

## 9. 后续优先级

优先级从高到低：

1. 先让 DevEco 同步成功，顶部运行配置出现 `entry`。
2. 跑到 RV2 上，确认不是白屏。
3. 验证 ArkWeb rawfile 相对路径和脚本加载。
4. 验证拖拽和单步执行触控/鼠标手感。
5. 再做原生保存/导入。
6. 最后才考虑 ArkUI 原生化或 Electron HAP 方案。

后续 AI 接手时，先读本文档，再读：

```text
openharmony-port/docs/2026-05-09_UI与OpenHarmony展示移植方案.md
openharmony-port/docs/HDC部署检查清单.md
openharmony-port/docs/移植记录.md
openharmony-port/README.md
```
