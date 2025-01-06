import fetch from 'node-fetch'
import fs from 'fs'
import YAML from 'yaml'
import { CryptoUtil } from '../utils/crypto.js'

export class MaimaiB50 {
    constructor() {
        // 读取配置文件
        const tokenFile = fs.readFileSync('./plugins/maimai-plugin/config/API_Token.yaml', 'utf8')
        const encryptedToken = YAML.parse(tokenFile).maimai_token
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
            const defaultPath = './plugins/maimai-plugin/config/default/friendCode.yaml'
            const configPath = './plugins/maimai-plugin/config/friendCode.yaml'
            
            // 确保配置文件存在
            if (!fs.existsSync(configPath)) {
                // 如果配置文件不存在，从默认配置复制
                if (fs.existsSync(defaultPath)) {
                    fs.copyFileSync(defaultPath, configPath)
                } else {
                    // 如果默认配置也不存在，创建空配置
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
     * 获取B50数据
     * @param {string} qq QQ号
     * @returns {Promise<Object>} B50数据
     */
    async getB50(qq) {
        try {
            const friendCode = this.getFriendCode(qq)
            if (!friendCode) {
                throw new Error('未绑定好友码，请先使用 #mai bind <好友码> 进行绑定')
            }

            console.log(`正在获取好友码 ${friendCode} 的B50数据...`)
            const response = await fetch(`${this.baseUrl}/player/${friendCode}/bests`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': this.token
                }
            })

            console.log('API响应状态:', response.status)
            const responseText = await response.text()
            console.log('API响应内容:', responseText)

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} - ${responseText}`)
            }

            try {
                const data = JSON.parse(responseText)
                return { data, friendCode }
            } catch (parseError) {
                console.error('JSON解析失败:', parseError)
                throw new Error(`响应数据解析失败: ${responseText}`)
            }
        } catch (error) {
            console.error('获取B50数据失败:', error)
            throw error
        }
    }

    /**
     * 格式化B50数据
     * @param {Object} b50Data B50数据
     * @param {string} friendCode 好友码
     * @returns {Array<string>} 格式化后的消息数组
     */
    formatB50(b50Data, friendCode) {
        try {
            if (!b50Data?.success || !b50Data?.data) {
                return ['获取数据失败或数据格式不正确']
            }

            const data = b50Data.data
            const allSongs = [...(data.standard || []), ...(data.dx || [])]
                .sort((a, b) => b.dx_rating - a.dx_rating)
                .slice(0, 50)  // 只取前50个

            // 构建消息数组
            const messages = []
            
            // 添加总览信息
            messages.push(`玩家 ${friendCode} \nStandard: ${data.standard_total}\nDX: ${data.dx_total}`)

            // 每5首歌为一组
            for (let i = 0; i < allSongs.length; i += 5) {
                const songGroup = allSongs.slice(i, i + 5)
                let groupMsg = ''

                songGroup.forEach((song, index) => {
                    groupMsg += `${i + index + 1}. ${song.song_name}\n`
                    groupMsg += `难度: ${song.level} (${song.type})\n`
                    groupMsg += `成绩: ${song.achievements.toFixed(4)}% [${song.rate.toUpperCase()}]\n`
                    groupMsg += `评价: ${song.dx_rating.toFixed(2)} (${song.fc || '-'}/${song.fs || '-'})\n`
                    if (index < songGroup.length - 1) {
                        groupMsg += '————————\n'
                    }
                })

                messages.push(groupMsg)
            }

            return messages

        } catch (error) {
            console.error('格式化B50数据失败:', error)
            return [`数据格式化失败: ${error.message}`]
        }
    }
} 