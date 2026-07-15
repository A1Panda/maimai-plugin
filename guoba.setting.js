// ==================== 锅巴设置项 Schema ====================
// 三组配置分别对应 guoba.support.js 中 menuConfig 的三个 mode

export default {
  // ---- 基础配置 ----
  basic: {
    title: '基础配置',
    schema: [
      {
        key: 'defaultAPI',
        label: '默认API',
        type: 'select',
        default: 2,
        required: true,
        options: [
          { label: '落雪 API (maimai.lxns.net)', value: 1 },
          { label: '水鱼 API (diving-fish.com)', value: 2 },
        ],
        help: '选择默认使用的查分数据源',
      },
      {
        key: 'autoClearCache',
        label: '定时清除缓存',
        type: 'boolean',
        default: true,
        help: '是否开启定时清除临时缓存文件',
      },
      {
        key: 'clearCacheTime',
        label: '缓存清除时间 (cron表达式)',
        type: 'string',
        default: '0 0 4 * * * *',
        placeholder: '0 0 4 * * * *',
        help: 'cron表达式，默认每天凌晨4点。格式: 秒 分 时 日 月 周',
      },
      {
        key: 'tempPath',
        label: '临时文件路径',
        type: 'string',
        default: './plugins/maimai-plugin/temp',
        placeholder: './plugins/maimai-plugin/temp',
        help: '曲绘、头像等资源文件的本地缓存路径',
      },
    ]
  },

  // ---- 落雪 API ----
  lxapi: {
    title: '落雪API配置',
    schema: [
      {
        key: 'lxToken',
        label: '落雪开发者 Token',
        type: 'password',
        default: '',
        placeholder: '请输入落雪开发者API Token',
        help: '在 https://maimai.lxns.net 申请获取',
      },
      {
        key: 'lxUserToken',
        label: '落雪个人用户 Token',
        type: 'password',
        default: '',
        placeholder: '请输入落雪个人用户API Token（可选）',
        help: '用于 /api/v0/user/* 端点，部分功能需要',
      },
      {
        key: 'lxBaseURL',
        label: '落雪 API 地址',
        type: 'string',
        default: 'https://maimai.lxns.net',
        placeholder: 'https://maimai.lxns.net',
        help: '落雪API的基础URL地址',
      },
      {
        key: 'lxAssetsURL',
        label: '落雪 资源CDN地址',
        type: 'string',
        default: 'https://assets2.lxns.net',
        placeholder: 'https://assets2.lxns.net',
        help: '曲绘、头像等静态资源的CDN地址',
      },
    ]
  },

  // ---- 水鱼 API ----
  syapi: {
    title: '水鱼API配置',
    schema: [
      {
        key: 'syToken',
        label: '水鱼开发者 Token',
        type: 'password',
        default: '',
        placeholder: '请输入水鱼开发者Token',
        help: '在 https://www.diving-fish.com 申请，用于访问 /dev/* 端点',
      },
      {
        key: 'syBaseURL',
        label: '水鱼 API 地址',
        type: 'string',
        default: 'https://www.diving-fish.com',
        placeholder: 'https://www.diving-fish.com',
        help: '水鱼查分器API的基础URL地址',
      },
    ]
  }
}
