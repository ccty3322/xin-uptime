window.Config = {

  // [v2.0] 显示标题
  SiteName: 'UpTime',

  // [v2.0] UptimeRobot Api Keys
  // 支持 Monitor-Specific 和 Read-Only
  ApiKeys: [
    'ur2895179-3f53714943878fe8f96aabc2',
    'ur3267589-8f0b05c0ab405dece1d597f8',
  ],

  // [v2.0] 日志天数
  // 建议 60 或 90，显示效果比较好
  CountDays: 90,

  // [v2.0] 是否显示检测站点的链接
  ShowLink: true,

  // [v2.0] 导航栏菜单
  Navi: [
    {
      text: 'ip查询',
      url: 'https://ping0.cc/'
    },
    {
      text: 'GitHub',
      url: 'https://github.com/ccty3322/xin-uptime'
    },
    {
      text: '域名邮箱',
      url: 'https://mail.xccdee.nyc.mn/sent/'
    },
  ],

  // [v2.1] Umami 统计站点的 ID (可选)
  UmamiId: '',

  // [v2.1] Umami 统计站点的服务器地址 (可选)
  UmamiServer: '',

  // [v2.1] SEO 描述 (可选)
  SEO_Description: '一个基于 UptimeRobot API 的在线状态面板',

  // [v2.1] SEO 关键词 (可选)
  SEO_Keywords: 'uptime, status, monitor',

  // [v2.1] 自定义 CSS (可选)
  // 例如: #footer { display: none; }
  CustomCSS: '',

  // [v2.1] 自定义 JS (可选)
  CustomJS: '',
};
