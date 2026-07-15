import fs from 'node:fs'
import yaml from 'yaml'

const CONFIG_DIR = './plugins/maimai-plugin/configs'

class ConfigManager {
    constructor() {
        this._main = null
        this._apiToken = null
    }

    _readYaml(filename) {
        const defaultPath = `${CONFIG_DIR}/defaults/${filename}`
        const activePath = `${CONFIG_DIR}/${filename}`
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

    // 主配置
    get main() {
        if (!this._main) this._main = this._readYaml('config.yaml')
        return this._main
    }

    // API Token 配置
    get apiToken() {
        if (!this._apiToken) this._apiToken = this._readYaml('API_Token.yaml')
        return this._apiToken
    }

    // 便捷属性
    get tempPath()           { return this.main.tempPath || './plugins/maimai-plugin/temp' }
    get defaultAPI()         { return this.main.defaultAPI || 2 }
    get autoClearCache()     { return this.main.autoClearCache ?? true }
    get clearCacheTime()     { return this.main.clearCacheTime || '0 0 4 * * * *' }

    // LXAPI 配置
    get lxBaseURL()          { return this.apiToken.LXapi?.baseURL || 'https://maimai.lxns.net' }
    get lxToken()            { return this.apiToken.LXapi?.token || 'O-0yIEngnVsHgid6m5M2wlvQvmoDDLKIwEIfHtt0HEM=' }
    get lxUserToken()        { return this.apiToken.LXapi?.userToken || '' }
    get lxAssetsURL()        { return this.apiToken.LXapi?.assetsURL || 'https://assets2.lxns.net' }

    // SYAPI 配置
    get syBaseURL()          { return this.apiToken.SYapi?.baseURL || 'https://www.diving-fish.com' }
    get syToken()            { return this.apiToken.SYapi?.token || 'xkZf95e2cTwdRAlvrNoHPCq3y70YBKQU' }
}

// 单例导出
const configManager = new ConfigManager()
export default configManager
