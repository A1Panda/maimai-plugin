import fetch from 'node-fetch'
import { ConfigManager } from '../utils/config.js'
import { ScreenshotManager } from '../utils/screenshot.js'

export class MaimaiPlayerInfo {
    constructor() {
        this.config = new ConfigManager()
        this.token = this.config.getToken()
        this.baseUrl = 'https://maimai.lxns.net/api/v0/maimai'
    }

    getFriendCode(qq) {
        return this.config.getFriendCode(qq)
    }

    async getPlayerInfo(qq) {
        try {
            const friendCode = this.getFriendCode(qq)
            if (!friendCode) {
                throw new Error('未绑定好友码，请先使用 #mai bind <好友码> 进行绑定')
            }

            const response = await fetch(`${this.baseUrl}/player/${friendCode}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': this.token
                }
            })

            const responseText = await response.text()
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} - ${responseText}`)
            }

            try {
                const result = JSON.parse(responseText)
                if (!result.success || !result.data) {
                    throw new Error('获取数据失败或数据格式不正确')
                }
                return result
            } catch (parseError) {
                console.error('JSON解析失败:', parseError)
                throw new Error(`响应数据解析失败: ${responseText}`)
            }
        } catch (error) {
            console.error('获取玩家信息失败:', error)
            throw error
        }
    }

    async formatPlayerInfo(playerInfo) {
        try {
            if (!playerInfo?.success || !playerInfo?.data) {
                throw new Error('获取数据失败或数据格式不正确')
            }

            // 生成图片
            const imageBuffer = await ScreenshotManager.makeImage(playerInfo.data)
            return imageBuffer
        } catch (error) {
            console.error('格式化玩家信息失败:', error)
            throw error
        }
    }
}
