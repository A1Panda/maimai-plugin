import fetch from 'node-fetch'
import fs from 'fs'
import YAML from 'yaml'
import { CryptoUtil } from '../utils/crypto.js'

export class MaimaiPlayerInfo {
    constructor() {
        // 读取配置文件
        const tokenFile = fs.readFileSync('./plugins/maimai-plugin/config/API_Token.yaml', 'utf8')
        const encryptedToken = YAML.parse(tokenFile).maimai_token
        // 解密token
        this.token = CryptoUtil.decrypt(encryptedToken)
        this.baseUrl = 'https://maimai.lxns.net/api/v0/maimai'
    }

    /**
     * 获取好友码
     * @param {string} qq QQ号
     * @returns {string|null} 好友码
     */
    getFriendCode(qq) {
        try {
            const configPath = './plugins/maimai-plugin/config/friendCode.yaml'
            if (!fs.existsSync(configPath)) {
                return null
            }
            const config = YAML.parse(fs.readFileSync(configPath, 'utf8'))
            return config[qq]
        } catch (error) {
            console.error('读取好友码配置失败:', error)
            return null
        }
    }

    /**
     * 获取玩家信息
     * @param {string} qq QQ号
     * @returns {Promise<Object>} 玩家信息
     */
    async getPlayerInfo(qq) {
        try {
            // 优先尝试使用好友码
            const friendCode = this.getFriendCode(qq)
            let response

            if (friendCode) {
                // 如果有绑定好友码，使用好友码获取信息
                response = await fetch(`${this.baseUrl}/player/${friendCode}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': this.token
                    }
                })

                if (response.ok) {
                    const data = await response.json()
                    return data
                }
            }

            // 如果没有好友码或者好友码请求失败，尝试使用QQ号
            response = await fetch(`${this.baseUrl}/player/qq/${qq}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': this.token
                }
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`API请求失败: ${response.status} - ${errorText}`)
            }

            const data = await response.json()
            return data
        } catch (error) {
            console.error('获取玩家信息失败:', error)
            throw error
        }
    }

    /**
     * 格式化玩家信息
     * @param {Object} playerInfo 玩家信息
     * @returns {string} 格式化后的信息
     */
    formatPlayerInfo(playerInfo) {
        try {
            // 检查数据结构
            if (!playerInfo?.success || !playerInfo?.data) {
                return '获取数据失败或数据格式不正确'
            }

            const data = playerInfo.data
            const trophy = data.trophy || {}
            const icon = data.icon || {}
            const namePlate = data.name_plate || {}
            const frame = data.frame || {}

            // 计算段位
            const classRanks = ['未知', '初段', '二段', '三段', '四段', '五段', '六段', '七段', '八段', '九段', '十段', '真传']
            const courseRanks = ['未知', '初心', '雀士', '雀傑', '雀豪', '雀王', '雀仙']

            return `玩家信息:
昵称: ${data.name}
Rating: ${data.rating}
好友码: ${data.friend_code}
课题等级: ${courseRanks[data.course_rank] || '未知'}
段位: ${classRanks[data.class_rank] || '未知'}
收藏: ${data.star} ⭐
称号: ${trophy.name || '无'}
头像: ${icon.name || '无'} (${icon.genre || '无'})
姓名框: ${namePlate.name || '无'} (${namePlate.genre || '无'})
底板: ${frame.name || '无'} (${frame.genre || '无'})
最后更新: ${new Date(data.upload_time).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`
        } catch (error) {
            console.error('格式化玩家信息失败:', error)
            return '数据格式化失败'
        }
    }
}
