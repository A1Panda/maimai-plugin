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

      // 前端保存配置（data 是扁平键值对，如 { "config.defaultAPI": 2, "apiToken.syToken": "xxx" }）
      setConfigData(data, { Result }) {
        try {
          // 将扁平键值对按前缀分组后写入对应的 YAML 文件
          // data 格式: { "config.defaultAPI": 2, "apiToken.lxToken": "abc", ... }
          const configUpdates = {}   // 对应 config.yaml 的键值
          const apiTokenUpdates = {} // 对应 API_Token.yaml 的键值

          for (const [key, value] of Object.entries(data)) {
            if (key.startsWith('config.')) {
              // config.defaultAPI → defaultAPI
              const configKey = key.slice('config.'.length)
              configUpdates[configKey] = value
            } else if (key.startsWith('apiToken.')) {
              // apiToken.lxToken → lxToken
              const tokenKey = key.slice('apiToken.'.length)
              apiTokenUpdates[tokenKey] = value
            }
          }

          // ---- 写 config.yaml ----
          if (Object.keys(configUpdates).length > 0) {
            const config = readYaml(CONFIG_PATHS.config, CONFIG_PATHS.configDefault)
            if (configUpdates.defaultAPI !== undefined) config.defaultAPI = configUpdates.defaultAPI
            if (configUpdates.autoClearCache !== undefined) config.autoClearCache = configUpdates.autoClearCache
            if (configUpdates.clearCacheTime !== undefined) config.clearCacheTime = configUpdates.clearCacheTime
            if (configUpdates.tempPath !== undefined) config.tempPath = configUpdates.tempPath
            writeYaml(CONFIG_PATHS.config, config)
          }

          // ---- 写 API_Token.yaml ----
          if (Object.keys(apiTokenUpdates).length > 0) {
            const apiToken = readYaml(CONFIG_PATHS.apiToken, CONFIG_PATHS.apiTokenDefault)
            if (!apiToken.LXapi) apiToken.LXapi = {}
            if (!apiToken.SYapi) apiToken.SYapi = {}

            if (apiTokenUpdates.lxToken !== undefined) apiToken.LXapi.token = apiTokenUpdates.lxToken
            if (apiTokenUpdates.lxUserToken !== undefined) apiToken.LXapi.userToken = apiTokenUpdates.lxUserToken
            if (apiTokenUpdates.lxBaseURL !== undefined) apiToken.LXapi.baseURL = apiTokenUpdates.lxBaseURL
            if (apiTokenUpdates.lxAssetsURL !== undefined) apiToken.LXapi.assetsURL = apiTokenUpdates.lxAssetsURL

            if (apiTokenUpdates.syToken !== undefined) apiToken.SYapi.token = apiTokenUpdates.syToken
            if (apiTokenUpdates.syBaseURL !== undefined) apiToken.SYapi.baseURL = apiTokenUpdates.syBaseURL
            writeYaml(CONFIG_PATHS.apiToken, apiToken)
          }

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
