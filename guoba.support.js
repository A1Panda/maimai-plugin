import path from 'path'
import fs from 'node:fs'
import yaml from 'yaml'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 配置文件路径
const CONFIG_DIR = path.join(__dirname, 'configs')
const DEFAULT_DIR = path.join(CONFIG_DIR, 'defaults')

const CONFIG_PATHS = {
  config: path.join(CONFIG_DIR, 'config.yaml'),
  configDefault: path.join(DEFAULT_DIR, 'config.yaml'),
  apiToken: path.join(CONFIG_DIR, 'API_Token.yaml'),
  apiTokenDefault: path.join(DEFAULT_DIR, 'API_Token.yaml'),
}

// 读取 YAML，不存在时回退到 defaults
function readYaml(activePath, defaultPath) {
  try {
    if (fs.existsSync(activePath)) {
      return yaml.parse(fs.readFileSync(activePath, 'utf8')) || {}
    }
    if (fs.existsSync(defaultPath)) {
      return yaml.parse(fs.readFileSync(defaultPath, 'utf8')) || {}
    }
  } catch {}
  return {}
}

// 写入 YAML
function writeYaml(filePath, data) {
  try {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(filePath, yaml.stringify(data), 'utf8')
    return true
  } catch (e) {
    logger.error('[maimai-plugin][Guoba] 写入配置失败:', e.message)
    return false
  }
}

// ==================== 锅巴支持 ====================
export function supportGuoba() {
  return {
    pluginInfo: {
      name: 'maimai-plugin',
      title: '舞萌DX查分器',
      description: 'maimai DX 舞萌查分器插件，支持B50查询、单曲成绩、随机推歌、猜谜游戏等',
      author: 'A1Panda',
      authorLink: 'https://github.com/A1Panda',
      link: 'https://github.com/A1Panda/maimai-plugin',
      isV3: true,
      isV2: false,
      showInMenu: 'auto',
      icon: 'mdi:music-clef-treble',
      iconColor: '#e91e63',
    },

    configInfo: {
      schemas: [
        // ---- 分组：基础配置 ----
        { label: '基础配置', component: 'SOFT_GROUP_BEGIN' },
        {
          field: 'config.defaultAPI',
          label: '默认API',
          bottomHelpMessage: '选择默认使用的查分数据源',
          component: 'Select',
          componentProps: {
            options: [
              { label: '落雪 API (maimai.lxns.net)', value: 1 },
              { label: '水鱼 API (diving-fish.com)', value: 2 },
            ],
          },
        },
        {
          field: 'config.autoClearCache',
          label: '定时清除缓存',
          bottomHelpMessage: '是否开启定时清除临时缓存文件',
          component: 'Switch',
        },
        {
          field: 'config.clearCacheTime',
          label: '缓存清除时间',
          bottomHelpMessage: 'cron表达式，默认每天凌晨4点。格式: 秒 分 时 日 月 周',
          component: 'Input',
          componentProps: { placeholder: '0 0 4 * * * *' },
        },
        {
          field: 'config.tempPath',
          label: '临时文件路径',
          bottomHelpMessage: '曲绘、头像等资源文件的本地缓存路径',
          component: 'Input',
          componentProps: { placeholder: './plugins/maimai-plugin/temp' },
        },

        // ---- 分组：落雪API ----
        { label: '落雪API', component: 'SOFT_GROUP_BEGIN' },
        {
          field: 'apiToken.lxToken',
          label: '开发者 Token',
          bottomHelpMessage: '在 https://maimai.lxns.net 申请获取',
          component: 'InputPassword',
          componentProps: { placeholder: '请输入落雪开发者API Token' },
        },
        {
          field: 'apiToken.lxUserToken',
          label: '个人用户 Token',
          bottomHelpMessage: '用于 /api/v0/user/* 端点，部分功能需要',
          component: 'InputPassword',
          componentProps: { placeholder: '请输入落雪个人用户API Token（可选）' },
        },
        {
          field: 'apiToken.lxBaseURL',
          label: 'API 地址',
          bottomHelpMessage: '落雪API的基础URL地址',
          component: 'Input',
          componentProps: { placeholder: 'https://maimai.lxns.net' },
        },
        {
          field: 'apiToken.lxAssetsURL',
          label: '资源CDN地址',
          bottomHelpMessage: '曲绘、头像等静态资源的CDN地址',
          component: 'Input',
          componentProps: { placeholder: 'https://assets2.lxns.net' },
        },

        // ---- 分组：水鱼API ----
        { label: '水鱼API', component: 'SOFT_GROUP_BEGIN' },
        {
          field: 'apiToken.syToken',
          label: '开发者 Token',
          bottomHelpMessage: '在 https://www.diving-fish.com 申请，用于访问 /dev/* 端点',
          component: 'InputPassword',
          componentProps: { placeholder: '请输入水鱼开发者Token' },
        },
        {
          field: 'apiToken.syBaseURL',
          label: 'API 地址',
          bottomHelpMessage: '水鱼查分器API的基础URL地址',
          component: 'Input',
          componentProps: { placeholder: 'https://www.diving-fish.com' },
        },
      ],

      // 前端读取配置
      getConfigData() {
        const config = readYaml(CONFIG_PATHS.config, CONFIG_PATHS.configDefault)
        const apiToken = readYaml(CONFIG_PATHS.apiToken, CONFIG_PATHS.apiTokenDefault)

        return {
          config: {
            defaultAPI: config.defaultAPI ?? 2,
            autoClearCache: config.autoClearCache ?? true,
            clearCacheTime: config.clearCacheTime ?? '0 0 4 * * * *',
            tempPath: config.tempPath ?? './plugins/maimai-plugin/temp',
          },
          apiToken: {
            lxToken: apiToken?.LXapi?.token ?? '',
            lxUserToken: apiToken?.LXapi?.userToken ?? '',
            lxBaseURL: apiToken?.LXapi?.baseURL ?? 'https://maimai.lxns.net',
            lxAssetsURL: apiToken?.LXapi?.assetsURL ?? 'https://assets2.lxns.net',
            syToken: apiToken?.SYapi?.token ?? '',
            syBaseURL: apiToken?.SYapi?.baseURL ?? 'https://www.diving-fish.com',
          },
        }
      },

      // 前端保存配置
      setConfigData(data, { Result }) {
        try {
          // ---- 写 config.yaml ----
          const config = readYaml(CONFIG_PATHS.config, CONFIG_PATHS.configDefault)
          const cfgData = data.config || {}
          if (cfgData.defaultAPI !== undefined) config.defaultAPI = cfgData.defaultAPI
          if (cfgData.autoClearCache !== undefined) config.autoClearCache = cfgData.autoClearCache
          if (cfgData.clearCacheTime !== undefined) config.clearCacheTime = cfgData.clearCacheTime
          if (cfgData.tempPath !== undefined) config.tempPath = cfgData.tempPath
          writeYaml(CONFIG_PATHS.config, config)

          // ---- 写 API_Token.yaml ----
          const apiToken = readYaml(CONFIG_PATHS.apiToken, CONFIG_PATHS.apiTokenDefault)
          const tkData = data.apiToken || {}
          if (!apiToken.LXapi) apiToken.LXapi = {}
          if (!apiToken.SYapi) apiToken.SYapi = {}

          if (tkData.lxToken !== undefined) apiToken.LXapi.token = tkData.lxToken
          if (tkData.lxUserToken !== undefined) apiToken.LXapi.userToken = tkData.lxUserToken
          if (tkData.lxBaseURL !== undefined) apiToken.LXapi.baseURL = tkData.lxBaseURL
          if (tkData.lxAssetsURL !== undefined) apiToken.LXapi.assetsURL = tkData.lxAssetsURL

          if (tkData.syToken !== undefined) apiToken.SYapi.token = tkData.syToken
          if (tkData.syBaseURL !== undefined) apiToken.SYapi.baseURL = tkData.syBaseURL
          writeYaml(CONFIG_PATHS.apiToken, apiToken)

          logger.mark('[maimai-plugin][Guoba] 配置已通过锅巴面板更新')
          return Result.ok({}, '配置保存成功~')
        } catch (err) {
          logger.error('[maimai-plugin][Guoba] 保存配置失败:', err.message)
          return Result.error({}, `保存失败: ${err.message}`)
        }
      },
    },
  }
}
