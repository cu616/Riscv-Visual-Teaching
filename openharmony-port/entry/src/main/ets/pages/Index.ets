import web_webview from '@ohos.web.webview';
import hilog from '@ohos.hilog';

const DOMAIN = 0x0001;
const WEB_ENTRY = 'app/index.html';

class RiscVTeachingBridge {
  getRuntimeInfo(): string {
    return JSON.stringify({
      platform: 'OpenHarmony',
      shell: 'ArkWeb',
      storage: 'web-local',
      note: 'The first port keeps save/import in the Web layer and reserves this bridge for native file APIs.'
    });
  }

  saveCase(payload: string): string {
    hilog.info(DOMAIN, 'RiscVTeaching', `saveCase requested, bytes=${payload.length}`);
    return JSON.stringify({
      ok: false,
      reason: 'Native file save is reserved for the next OpenHarmony iteration.'
    });
  }

  loadCase(): string {
    hilog.info(DOMAIN, 'RiscVTeaching', 'loadCase requested');
    return JSON.stringify({
      ok: false,
      reason: 'Native file load is reserved for the next OpenHarmony iteration.'
    });
  }
}

@Entry
@Component
struct Index {
  private controller: web_webview.WebviewController = new web_webview.WebviewController();
  private bridge: RiscVTeachingBridge = new RiscVTeachingBridge();

  build() {
    Column() {
      Web({
        src: $rawfile(WEB_ENTRY),
        controller: this.controller
      })
        .javaScriptAccess(true)
        .domStorageAccess(true)
        .fileAccess(true)
        .javaScriptProxy({
          object: this.bridge,
          name: 'OpenHarmonyBridge',
          methodList: ['getRuntimeInfo', 'saveCase', 'loadCase'],
          controller: this.controller
        })
        .width('100%')
        .height('100%');
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F8FAFC');
  }
}
