import fs from 'fs'
import YAML from 'yaml'
import { CryptoUtil } from './crypto.js'

export class ConfigManager {
    constructor() {
        this.basePath = './plugins/maimai-plugin/config'
    }

    /**
     * 获取API Token
     * @returns {string} 解密后的token
     */
    getToken() {
        try {
            const defaultPath = `${this.basePath}/default_config/API_Token.yaml`
            const configPath = `${this.basePath}/API_Token.yaml`
            
            // 确保配置文件存在
            if (!fs.existsSync(configPath)) {
                if (fs.existsSync(defaultPath)) {
                    fs.copyFileSync(defaultPath, configPath)
                } else {
                    throw new Error('默认API Token配置文件不存在')
                }
            }

            const tokenFile = fs.readFileSync(configPath, 'utf8')
            const encryptedToken = YAML.parse(tokenFile).maimai_token
            return CryptoUtil.decrypt(encryptedToken)
        } catch (error) {
            console.error('读取API Token配置失败:', error)
            throw error
        }
    }

    /**
     * 获取好友码
     * @param {string} qq QQ号
     * @returns {string|null} 好友码
     */
    getFriendCode(qq) {
        try {
            const defaultPath = `${this.basePath}/default_config/friendCode.yaml`
            const configPath = `${this.basePath}/friendCode.yaml`
            
            // 确保配置文件存在
            if (!fs.existsSync(configPath)) {
                if (fs.existsSync(defaultPath)) {
                    fs.copyFileSync(defaultPath, configPath)
                } else {
                    fs.writeFileSync(configPath, '# 好友码配置文件\n# 格式: QQ号: 好友码\n', 'utf8')
                }
            }

            const config = YAML.parse(fs.readFileSync(configPath, 'utf8'))
            return config?.[qq] || null
        } catch (error) {
            console.error('读取好友码配置失败:', error)
            return null
        }
    }

    /**
     * 获取帮助菜单配置
     * @returns {Object} 帮助菜单配置
     */
    getHelpConfig() {
        try {
            const defaultPath = `${this.basePath}/default_config/help.yaml`
            const configPath = `${this.basePath}/help.yaml`
            
            // 确保配置文件存在
            if (!fs.existsSync(configPath)) {
                if (fs.existsSync(defaultPath)) {
                    fs.copyFileSync(defaultPath, configPath)
                } else {
                    throw new Error('默认帮助菜单配置文件不存在')
                }
            }

            const config = YAML.parse(fs.readFileSync(configPath, 'utf8'))
            const helpMenu = config.help_menu || {}

            return {
                ...helpMenu,
                note: config.note || ''
            }
        } catch (error) {
            console.error('读取帮助菜单配置失败:', error)
            throw error
        }
    }
} 