import fs from 'node:fs'
import path from 'node:path'
import yaml from 'yaml'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ==================== 插件元数据 ====================
export const pluginInfo = {
  name: 'maimai-plugin',
  displayName: '舞萌DX查分器',
  description: 'maimai DX 舞萌查分器插件，支持B50查询、单曲成绩、随机推歌、猜谜游戏等',
  version: '1.4.6',
  author: 'A1Panda',
  homepage: 'https://github.com/A1Panda/maimai-plugin',
}

// ==================== 菜单配置 ====================
export const menuConfig = {
  groups: [
    {
      name: '插件设置',
      items: [
        { name: '基础配置', target: 'setting', mode: 'basic' },
        { name: '落雪API', target: 'setting', mode: 'lxapi' },
        { name: '水鱼API', target: 'setting', mode: 'syapi' },
      ]
    }
  ]
}

// ==================== 配置文件路径 ====================
const CONFIG_DIR = path.join(__dirname, 'configs')
const DEFAULT_DIR = path.join(CONFIG_DIR, 'defaults')

const CONFIG_FILES = {
  config: {
    path: path.join(CONFIG_DIR, 'config.yaml'),
    default: path.join(DEFAULT_DIR, 'config.yaml'),
  },
  apiToken: {
    path: path.join(CONFIG_DIR, 'API_Token.yaml'),
    default: path.join(DEFAULT_DIR, 'API_Token.yaml'),
  },
}

// 读取 YAML，不存在时回退到 defaults
function readYaml(fileKey) {
  const { path: filePath, default: defaultPath } = CONFIG_FILES[fileKey]
  try {
    if (fs.existsSync(filePath)) {
      return yaml.parse(fs.readFileSync(filePath, 'utf8')) || {}
    }
    // 回退到默认配置
    if (fs.existsSync(defaultPath)) {
      return yaml.parse(fs.readFileSync(defaultPath, 'utf8')) || {}
    }
  } catch (err) {
    logger.error(`[maimai-plugin][Guoba] 读取配置文件失败: ${fileKey}`, err)
  }
  return {}
}

// 写入 YAML
function writeYaml(fileKey, data) {
  const { path: filePath } = CONFIG_FILES[fileKey]
  try {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, yaml.stringify(data), 'utf8')
    return true
  } catch (err) {
    logger.error(`[maimai-plugin][Guoba] 写入配置文件失败: ${fileKey}`, err)
    return false
  }
}

// ==================== Support 方法：锅巴配置读写 ====================
export function supportGuoba() {
  return {
    /**
     * 锅巴读取当前全部设置（从 YAML 文件加载并展平返回）
     */
    getConfig() {
      const config = readYaml('config')
      const apiToken = readYaml('apiToken')

      return {
        // 基础配置 (config.yaml)
        defaultAPI: config.defaultAPI ?? 1,
        autoClearCache: config.autoClearCache ?? true,
        clearCacheTime: config.clearCacheTime ?? '0 0 4 * * * *',
        tempPath: config.tempPath ?? './plugins/maimai-plugin/temp',

        // 落雪 API (API_Token.yaml → LXapi)
        lxToken: apiToken?.LXapi?.token ?? '',
        lxUserToken: apiToken?.LXapi?.userToken ?? '',
        lxBaseURL: apiToken?.LXapi?.baseURL ?? 'https://maimai.lxns.net',
        lxAssetsURL: apiToken?.LXapi?.assetsURL ?? 'https://assets2.lxns.net',

        // 水鱼 API (API_Token.yaml → SYapi)
        syToken: apiToken?.SYapi?.token ?? '',
        syBaseURL: apiToken?.SYapi?.baseURL ?? 'https://www.diving-fish.com',
      }
    },

    /**
     * 锅巴保存设置（接收表单数据，拆开写回两个 YAML 文件）
     */
    setConfig(data) {
      try {
        // ---- 写 config.yaml ----
        const config = readYaml('config')
        if (data.defaultAPI !== undefined) config.defaultAPI = data.defaultAPI
        if (data.autoClearCache !== undefined) config.autoClearCache = data.autoClearCache
        if (data.clearCacheTime !== undefined) config.clearCacheTime = data.clearCacheTime
        if (data.tempPath !== undefined) config.tempPath = data.tempPath
        writeYaml('config', config)

        // ---- 写 API_Token.yaml ----
        const apiToken = readYaml('apiToken')
        if (!apiToken.LXapi) apiToken.LXapi = {}
        if (!apiToken.SYapi) apiToken.SYapi = {}

        if (data.lxToken !== undefined) apiToken.LXapi.token = data.lxToken
        if (data.lxUserToken !== undefined) apiToken.LXapi.userToken = data.lxUserToken
        if (data.lxBaseURL !== undefined) apiToken.LXapi.baseURL = data.lxBaseURL
        if (data.lxAssetsURL !== undefined) apiToken.LXapi.assetsURL = data.lxAssetsURL

        if (data.syToken !== undefined) apiToken.SYapi.token = data.syToken
        if (data.syBaseURL !== undefined) apiToken.SYapi.baseURL = data.syBaseURL
        writeYaml('apiToken', apiToken)

        logger.mark(logger.green('[maimai-plugin][Guoba] 配置已通过锅巴面板更新'))
        return { success: true, message: '配置保存成功' }
      } catch (err) {
        logger.error('[maimai-plugin][Guoba] 保存配置失败', err)
        return { success: false, message: `保存失败: ${err.message}` }
      }
    },
  }
}
