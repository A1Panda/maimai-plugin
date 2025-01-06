import fetch from 'node-fetch'
import { ConfigManager } from '../utils/config.js'
import { ScreenshotManager } from '../utils/screenshot.js'
import fs from 'fs'
import YAML from 'yaml'

export class MaimaiPlayerInfo {
    constructor() {
        this.config = new ConfigManager()
        this.token = this.config.getToken()
        this.baseUrl = 'https://maimai.lxns.net/api/v0/maimai'
    }

    /**
     * 获取玩家信息
     * @param {string} qq QQ号
     * @param {Object} e 事件对象
     * @returns {Promise<Object>} 玩家信息
     */
    async getPlayerInfo(qq, e) {
        try {
            // 先尝试使用QQ号查询
            let response = await this.fetchPlayerInfoByQQ(qq)
            
            // 如果QQ号查询成功，自动绑定好友码
            if (response.ok) {
                const data = await response.json()
                if (data?.success && data?.data?.friend_code) {
                    await this.autoBindFriendCode(qq, data.data.friend_code, e)
                }
                return data
            }
            
            // 如果QQ号查询失败，尝试使用绑定的好友码
            const friendCode = this.config.getFriendCode(qq)
            if (!friendCode) {
                throw new Error('未绑定好友码，请先使用 #mai bind <好友码> 进行绑定')
            }
            response = await this.fetchPlayerInfoByFriendCode(friendCode)

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`)
            }

            const data = await response.json()
            if (!data?.success || !data?.data) {
                throw new Error('获取数据失败或数据格式不正确')
            }
            return data
        } catch (error) {
            console.error('获取玩家信息失败:', error)
            throw error
        }
    }

    /**
     * 自动绑定好友码
     * @param {string} qq QQ号
     * @param {string} friendCode 好友码
     * @param {Object} e 事件对象
     */
    async autoBindFriendCode(qq, friendCode, e) {
        try {
            const configPath = './plugins/maimai-plugin/config/friendCode.yaml'
            let config = {}

            // 读取现有配置
            if (fs.existsSync(configPath)) {
                const content = fs.readFileSync(configPath, 'utf8')
                config = YAML.parse(content) || {}
            }

            // 如果该QQ号未绑定好友码，则自动绑定
            if (!config[qq]) {
                // 确保QQ号和好友码都是字符串格式
                const formattedQQ = String(qq)
                const formattedFriendCode = String(friendCode)
                
                // 使用标准格式写入
                config[formattedQQ] = formattedFriendCode
                
                // 将配置转换为YAML字符串，确保格式正确
                const yamlStr = Object.entries(config)
                    .map(([key, value]) => `"${key}": "${value}"`)
                    .join('\n')
                
                fs.writeFileSync(configPath, yamlStr + '\n', 'utf8')
                await e.reply(`已自动绑定QQ ${formattedQQ} 的好友码: ${formattedFriendCode}`)
            }
        } catch (error) {
            console.error('自动绑定好友码失败:', error)
            // 不抛出错误，因为这只是一个辅助功能
        }
    }

    /**
     * 使用QQ号获取玩家信息
     * @param {string} qq QQ号
     * @returns {Promise<Response>} API响应
     */
    async fetchPlayerInfoByQQ(qq) {
        return fetch(`${this.baseUrl}/player/qq/${qq}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': this.token
            }
        })
    }

    /**
     * 使用好友码获取玩家信息
     * @param {string} friendCode 好友码
     * @returns {Promise<Response>} API响应
     */
    async fetchPlayerInfoByFriendCode(friendCode) {
        return fetch(`${this.baseUrl}/player/${friendCode}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': this.token
            }
        })
    }

    /**
     * 格式化玩家信息
     * @param {Object} playerData 玩家数据
     * @param {string} qq QQ号
     * @returns {Promise<Buffer>} 图片buffer
     */
    async formatPlayerInfo(playerData, qq) {
        try {
            if (!playerData?.success || !playerData?.data) {
                throw new Error('获取数据失败或数据格式不正确')
            }

            const data = playerData.data
            // 准备模板数据
            const templateData = {
                qq: qq,
                ...data,
                upload_time: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
            }

            // 生成图片
            const imageBuffer = await ScreenshotManager.makeImage(templateData, 'player-info.html')
            return imageBuffer
        } catch (error) {
            console.error('格式化玩家信息失败:', error)
            throw error
        }
    }
}
