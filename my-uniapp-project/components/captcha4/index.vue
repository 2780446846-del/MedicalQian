<template>
  <view class="geetest_component"></view>
</template>
<script>
export default {
  data() {
    return {
      wv: null,
      lastTime: '',
      defaultConfig: {
        clientVersion: 'uniapp-v1.0',
        clientType: uni.getSystemInfoSync().platform,
        protocol: 'http://',
        mi: {
          geeid: {
            bd: '',
            d: '',
            e: '',
            fp: '',
            ts: '',
            ver: '',
            client_type: '',
          },
          packageName: '',
          displayName: '',
          appVer: '',
          build: '',
          clientVersion: '',
          process_id: '',
          process_id_test: '',
          zid: '',
        },
      },
    };
  },
  props: {
    config: {
      type: Object,
      default: function () {
        return {};
      },
    },
  },
  methods: {
    showCaptcha() {
      const that = this;
      // #ifdef APP-PLUS
      _assign(this.defaultConfig, this.config, {
        challenge: this.getUuid(),
      });

      this.wv = plus.webview.create(
        `hybrid/html/captcha4/index.html?data=${encodeURIComponent(
          JSON.stringify(this.defaultConfig)
        )}`,
        'gt_webview',
        {
          background: 'transparent',
          width: '100%',
          height: '100%',
        }
      );

      const currentWebview = this.$root.$scope.$getAppWebview();
      currentWebview.append(this.wv);

      plus.globalEvent.addEventListener('plusMessage', (msg) => {
        const result = msg.data.args.data;
        if (result.name === 'postMessage') {
          if (result.arg.time === that.lastTime) {
            return;
          }
          that.lastTime = result.arg.time;
          switch (result.arg.type) {
            case 'ready':
              that.captchaReady();
              break;
            case 'error':
              that.captchaError(result.arg.data);
              break;
            case 'fail':
              that.captchaFail();
              break;
            case 'close':
              that.captchaClose();
              break;
            case 'result':
              that.captchaSuccess(result.arg.data);
              break;
            default:
              break;
          }
        }
      });

      this.wv.overrideUrlLoading(
        {
          mode: 'reject',
        },
        (e) => {
          plus.runtime.openURL(e.url);
        }
      );
      // #endif
    },
    captchaReady() {
      this.$emit('captchaReady');
      this.wv.evalJS("jsBridge.callback('showBox')");
    },
    captchaSuccess(data) {
      this.$emit('captchaSuccess', data);
      this.wv.hide();
    },
    captchaClose() {
      this.$emit('captchaClose');
      this.wv.hide();
    },
    captchaError(e) {
      uni.showToast({
        title: JSON.stringify(e),
        icon: 'none',
        duration: 2000,
      });
      this.$emit('captchaError', e);
      this.wv.hide();
    },
    captchaFail() {
      this.$emit('captchaFail');
    },
    getUuid() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
  },
};

function _assign(target) {
  if (typeof Object.assign === 'function') {
    return Object.assign.apply(Object, arguments);
  }
  if (target == null) {
    throw new Error('Cannot convert undefined or null to object');
  }

  const newTarget = Object(target);
  for (let index = 1; index < arguments.length; index++) {
    const source = arguments[index];
    if (source !== null) {
      for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          newTarget[key] = source[key];
        }
      }
    }
  }
  return newTarget;
}
</script>
<style lang="scss"></style>
