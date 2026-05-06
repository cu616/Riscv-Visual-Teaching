# HDC 部署检查清单

日期：2026-05-05

本文档用于把 `openharmony-port/` 部署到香橙派 OpenHarmony 设备时快速定位问题。当前仓库侧已经完成 ArkWeb rawfile 移植原型，但真机部署仍需要本机 DevEco Studio、OpenHarmony SDK、签名配置和香橙派镜像共同配合。

## 1. 部署前确认

### 仓库侧

在仓库根目录执行：

```powershell
npm.cmd run oh:check
```

该命令会：

1. 从 `app/` 同步最新静态资源到 `openharmony-port/entry/src/main/resources/rawfile/app/`。
2. 自动注入 `openharmony-port.css` 和 `openharmony-bridge.js`。
3. 用轻量 `datapath.js` 替换数据流动画实现。
4. 检查 rawfile 页面、ArkTS 壳和关键资源是否齐备。

### 开发机侧

需要确认：

- DevEco Studio 能打开 `openharmony-port/`。
- OpenHarmony SDK 已配置。
- 工程签名配置有效。
- `hdc` 命令在终端可用。
- 香橙派 OpenHarmony 镜像已启动并允许 HDC 调试。

如果 DevEco Studio 提示：

```text
未找到 ArkTS 中的某版本 OpenHarmony SDK
```

先检查本机已安装 SDK 版本。例如当前开发机的 SDK 元信息位于：

```text
D:\Program Files\Huawei\DevEco Studio\sdk\default\openharmony\ets\oh-uni-package.json
```

其中 `apiVersion` 可用于判断本机 SDK 是否安装完整。当前工程已按这台电脑已安装的 ArkTS SDK 24，在 `build-profile.json5` 的 product 中声明 `compileSdkVersion: 24`、`compatibleSdkVersion: 24`、`targetSdkVersion: 24` 和 `runtimeOS: "OpenHarmony"`。注意：运行环境是 OpenHarmony 时，这三个 SDK 字段必须是数值，不能写成 `"5.0.0(12)"` 这类 HarmonyOS 字符串。

如果 DevEco Studio 提示：

```text
DevEco Studio配置的OpenHarmony SDK路径不合法
找不到以下SDK：
ArkTS:24
toolchains:24
```

先在仓库根目录执行：

```powershell
npm.cmd run oh:setup-sdk
```

该命令会生成本机 SDK 镜像：

```text
C:\Users\lbc\dachuang\openharmony-port\.oh-sdk
```

然后在 DevEco Studio 中打开：

```text
File > Settings > OpenHarmony SDK
```

把 OpenHarmony SDK 路径设置为：

```text
C:\Users\lbc\dachuang\openharmony-port\.oh-sdk
```

不要选：

```text
D:\Program Files\Huawei\DevEco Studio\sdk\default\openharmony
```

因为当前这台电脑上的 DevEco SDK 是 `openharmony/ets`、`openharmony/toolchains` 这种扁平目录，而 hvigor API 24 查找的是 `.oh-sdk/24/ets`、`.oh-sdk/24/toolchains`。项目内 `.oh-sdk` 只是 junction 镜像，不复制 SDK 大文件。

本仓库中的 `ohos_electron_hap/` 可作为 DevEco 工程结构参考。当前移植版已经按它的方式补齐 `AppScope/resources/base/` 下的应用级字符串、图标和 configuration；如果 DevEco 继续报索引失败，优先比较 `AppScope/app.json5` 与 `AppScope/resources/` 的资源引用是否一一存在。

## 2. 设备连接

### Orange Pi RV2 接线结论

根据 `docs/OrangePi_RV2_X1_用户手册_v1.1.pdf` 和 `docs/OPI RV2 V1_1_SCH_20250508(1).pdf`：

- RV2 的 Type-C 口是 5V/5A 供电口，不应作为 HDC 数据连接口。
- RV2 有 1 个 USB2.0 口支持 Device 或 HOST 模式。
- 手册配件章节明确要求 `USB2.0 公对公数据线`，用于烧录镜像和 ADB 等功能。
- 原理图中可见 `USB0_OTG_EN`、`USB0_DN`、`USB0_DP`，说明板上存在 USB0 OTG/Device 相关链路。

因此连接电脑时应使用：

```text
电脑 USB-A 口 <-> USB2.0 公对公数据线 <-> RV2 的 USB2.0 HOST/DEVICE 口
```

不要使用：

```text
电脑 USB-A <-> RV2 Type-C 电源口
电脑 USB-A <-> RV2 USB3.0 HOST 口
普通只能充电的 USB 线
```

烧录 eMMC 进入烧录模式时，手册要求按住 `BOOT` 再接电源；但运行已烧好的 OpenHarmony 应用时，一般应让系统正常启动，不要停留在烧录模式。

优先查看设备：

```powershell
hdc list targets
```

如果没有设备：

- 检查 USB 线或网络连接。
- 检查板卡是否开启调试。
- 检查开发机防火墙是否阻止 HDC。
- 如果使用网络 HDC，先确认设备 IP 和端口。

## 3. 构建与安装

推荐第一轮使用 DevEco Studio：

1. Open Project，选择 `openharmony-port/`。
2. 等待 Sync 完成。
3. 选择 `entry` 模块。
4. 选择已连接的香橙派设备。
5. Run。

如需命令行构建，优先在 DevEco Studio 成功同步后使用其生成的 hvigor 环境。命令行构建失败时，先不要修改 Web 资源，优先检查 SDK、签名和 hvigor 版本。

## 4. 首次运行验收

应用启动后依次确认：

- 页面不是白屏。
- 顶部标题和工作台 Tab 正常显示。
- 左侧指令积木素材显示。
- 中间指令编辑区显示。
- 右侧寄存器、内存、教学备注显示。
- 数据流可视化面板不显示。
- 示例案例可以加载。
- 单步执行、上一步、暂停、重置按钮可点击。

## 5. 常见问题定位

### 白屏

优先检查：

- `Index.ets` 中是否仍加载 `$rawfile('app/index.html')`。
- rawfile 目录是否存在 `index.html`、`styles.css`、`src/app.js`。
- ArkWeb 是否允许 JavaScript：`javaScriptAccess(true)`。
- 设备镜像是否包含 ArkWeb 能力。

### 安装或运行时报 00401004 系统能力不匹配

如果报错类似：

```text
错误码: 00401004
当前设备的rpcid.json文件中不包含以下系统能力属性：
SystemCapability.Multimedia.Media.AVTranscoder
SystemCapability.Communication.FusionConnectivity.Core
...
```

说明应用生成的 `rpcid.json` 要求了目标设备不具备的系统能力。当前应用是 ArkWeb 静态页面壳，不需要 AV 转码、3D、PerfTest、智能场景等能力，因此已在：

```text
entry/src/main/syscap.json
```

通过 `production.removedSysCaps` 移除已知缺失项。处理后需要在 DevEco Studio 中：

1. Clean Project。
2. 重新 Build Hap(s)。
3. 重新 Run 到设备。

如果设备继续报新的缺失 syscap，把完整列表加入 `removedSysCaps` 后重新构建。不要删除 `SystemCapability.Web.Webview.Core`，它是 ArkWeb 页面运行所需能力。

### 安装或运行时报 00401019 SDK 版本不匹配

如果报错：

```text
错误码: 00401019
应用的compatibleSdkVersion和releaseType与设备上的apiVersion和releaseType不匹配
```

先读取板端真实版本：

```powershell
"D:\Program Files\Huawei\DevEco Studio\sdk\default\openharmony\toolchains\hdc.exe" shell param get const.ohos.apiversion
"D:\Program Files\Huawei\DevEco Studio\sdk\default\openharmony\toolchains\hdc.exe" shell param get const.ohos.releasetype
"D:\Program Files\Huawei\DevEco Studio\sdk\default\openharmony\toolchains\hdc.exe" shell param get const.ohos.fullname
```

当前 RV2 读到的是：

```text
const.ohos.apiversion = 12
const.ohos.releasetype = Release
const.ohos.fullname = OpenHarmony-5.0.0.71
```

因此 `build-profile.json5` 当前配置为：

```json5
"compileSdkVersion": 24,
"compatibleSdkVersion": 12,
"compatibleSdkVersionStage": "release",
"targetSdkVersion": 12,
"runtimeOS": "OpenHarmony"
```

并且 `npm.cmd run oh:setup-sdk` 会把本机 `.oh-sdk` 镜像中的 SDK 组件元数据映射为 `Release`。重新构建前应执行：

```powershell
npm.cmd run oh:setup-sdk
npm.cmd run oh:check
```

然后在 DevEco Studio 中 Clean Project、Build Hap(s)、Run。

### 页面有样式但按钮无反应

优先检查：

- `index.html` 末尾脚本顺序是否为依赖模块先于 `src/app.js`。
- `openharmony-bridge.js` 是否在 `src/app.js` 前加载。
- ArkWeb 控制台或 hilog 是否有 JavaScript 异常。

### 保存/导入体验不完整

当前属于已知限制。Web 侧浏览器下载和 `<input type="file">` 在 ArkWeb 上可能受系统能力限制；下一阶段需要把 `OpenHarmonyBridge.saveCase/loadCase` 接入原生文件选择器或应用沙箱文件。

### 拖拽手感异常

优先记录：

- 是鼠标、触控还是触控板输入。
- 指令积木拖拽异常，还是小积木拖拽异常。
- 是否只在高 DPI 或特定分辨率下出现。

这类问题通常需要在 `app/src/app.js` 的拖拽阈值和释放判定上调参，然后重新执行 `npm.cmd run oh:check` 同步到移植版。

## 6. 建议反馈格式

```text
设备型号：
OpenHarmony 镜像版本：
部署方式：DevEco Studio / hdc 命令行
是否白屏：
能否看到工作台：
能否拖拽指令积木：
能否单步执行：
保存/导入现象：
hilog 或报错截图：
```

## 7. 1024x600 真机交互专项检查

当前 RV2 7 寸 HDMI 屏建议按以下顺序验收：

```text
1. 应用是否生成并安装 entry-default-signed.hap。
2. 启动后是否直接进入正式 app/index.html。
3. 顶部调试按钮是否横向紧凑排列。
4. 左侧是否为积木栏，中间是否为拼接区，右侧是否为机器状态/备注。
5. 鼠标点击 addi/add/sub 是否能加入拼接区。
6. 鼠标点击 x1/立即数后，再点槽位是否能写入。
7. 鼠标拖 addi 到拼接区是否稳定。
8. 鼠标拖 x1/立即数到槽位是否能吸附。
9. 触屏拖 addi 到拼接区是否稳定。
10. 触屏拖 x1/立即数到槽位是否能吸附。
```

注意：

- OpenHarmony 运行时已禁用 ArkWeb 原生 HTML5 `drag/drop`，改用自定义鼠标/触屏拖拽层。
- 如果拖拽失败但点击式编辑可用，优先记录为“自定义拖拽命中/手感问题”，不要重新回退到原生 `draggable`。
- 如果一移动就 cppcrash，优先抓取 `/data/log/faultlog/faultlogger/cppcrash-com.riscv.visualteaching-*` 的头部 120 行。
