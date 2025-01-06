import fetch from 'node-fetch'
import { ConfigManager } from '../utils/config.js'
import { ScreenshotManager } from '../utils/screenshot.js'

export class MaimaiB50 {
    constructor() {
        this.config = new ConfigManager()
        this.token = this.config.getToken()
        this.baseUrl = 'https://maimai.lxns.net/api/v0/maimai'
    }

    getFriendCode(qq) {
        return this.config.getFriendCode(qq)
    }

    async getB50(qq) {
        try {
            const friendCode = this.getFriendCode(qq)
            if (!friendCode) {
                throw new Error('未绑定好友码，请先使用 #mai bind <好友码> 进行绑定')
            }

            const response = await fetch(`${this.baseUrl}/player/${friendCode}/bests`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': this.token
                }
            })

            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`)
            }

            const data = await response.json()
            return { data, friendCode }
        } catch (error) {
            console.error('获取B50数据失败:', error)
            throw error
        }
    }

    async formatB50(b50Data, friendCode) {
        try {
            if (!b50Data?.success || !b50Data?.data) {
                throw new Error('获取数据失败或数据格式不正确')
            }

            const data = b50Data.data
            // 合并标准和DX歌曲，并按照dx_rating排序
            const allSongs = [
                ...(data.standard || []).map(song => ({ ...song, source: 'standard' })),
                ...(data.dx || []).map(song => ({ ...song, source: 'dx' }))
            ]
                .sort((a, b) => b.dx_rating - a.dx_rating)
                .slice(0, 50)  // 只取前50个
                .map((song, index) => ({
                    ...song,
                    index: index + 1,  // 添加序号
                    type: song.type.toUpperCase(),  // 大写类型
                    dx_rating: song.dx_rating.toFixed(2),  // 格式化rating
                }))

            // 准备模板数据
            const templateData = {
                friend_code: friendCode,
                standard_total: data.standard_total.toFixed(2),
                dx_total: data.dx_total.toFixed(2),
                total_rating: (data.standard_total + data.dx_total).toFixed(2),
                songs: allSongs,
                upload_time: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
            }

            // 生成图片
            const imageBuffer = await ScreenshotManager.makeImage(templateData, 'b50-info.html')
            return imageBuffer
        } catch (error) {
            console.error('格式化B50数据失败:', error)
            throw error
        }
    }
} 