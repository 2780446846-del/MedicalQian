export const ONECLICK_CONFIG = {
  univerify: {
    fullScreen: true,
    authButton: {
      normalColor: '#3478F6',
      highlightColor: '#2861C5',
      textColor: '#FFFFFF',
      title: '本机号码一键登录',
      borderRadius: '24px'
    },
    otherLoginButton: {
      visible: true,
      title: '其他方式登录',
      bgColor: 'rgba(0,0,0,0)'
    },
    privacyTerms: {
      defaultCheckBoxState: true,
      termsColor: '#666666',
      termsUnderlineColor: '#3478F6',
      buttonsColor: '#3478F6',
      privacyItems: [
        { title: '《用户协议》', url: 'https://www.example.com/agreement' },
        { title: '《隐私政策》', url: 'https://www.example.com/privacy' }
      ]
    }
  },
  serverVerify: {
    enable: true,
    type: 'uniCloud', // uniCloud | http
    functionName: 'testLogin', // 本地调试时调用的云函数名称
    http: {
      // 若需切回远端 HTTP 校验，请将 type 改为 'http' 并启用下方配置
      url: 'https://fc-mp-7a43517d-d8d4-4fa6-bf16-36b1c3fe2485.next.bspapp.com/getNumber',
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      extraData: {}
    }
  }
}

export default ONECLICK_CONFIG
