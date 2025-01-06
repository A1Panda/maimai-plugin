import plugin from '../../../lib/plugins/plugin.js'
import { MaimaiPlayerInfo } from '../model/getplayerinfo.js'
import fs from 'fs'
import path from 'path'

export class GetPlayerInfo extends plugin {
    constructor() {
        super({
            name: 'GetPlayerInfo',
            dsc: '获取玩家信息',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#mai(mai)? ?info ?.*$',
                    fnc: 'getInfo'
                }
            ]
        })
        this.maimaiApi = new MaimaiPlayerInfo()
    }

    async getInfo(e) {
        try {
            // 获取QQ号，如果没有指定则使用发送者的QQ号
            const qq = this.parseQQ(e)
            
            // 获取玩家信息，传递 e 对象
            const data = await this.maimaiApi.getPlayerInfo(qq, e)
            
            // 生成图片
            const imageBuffer = await this.maimaiApi.formatPlayerInfo(data, qq)
            
            // 创建临时文件目录
            const tempDir = path.join('./plugins/maimai-plugin/temp')
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true })
            }

            // 生成临时文件路径
            const tempFile = path.join(tempDir, `player_info_${qq}_${Date.now()}.png`)
            
            // 写入图片数据
            fs.writeFileSync(tempFile, imageBuffer)

            // 发送图片
            await e.reply(segment.image(tempFile))

            // 延迟删除临时文件
            setTimeout(() => {
                try {
                    if (fs.existsSync(tempFile)) {
                        fs.unlinkSync(tempFile)
                    }
                } catch (err) {
                    console.error('删除临时文件失败:', err)
                }
            }, 5000)

            return true
        } catch (error) {
            await e.reply('获取玩家信息失败：' + error.message)
            return false
        }
    }

    /**
     * 解析QQ号
     * @param {Object} e 消息事件对象
     * @returns {string} QQ号
     */
    parseQQ(e) {
        const msg = e.msg.trim()
        const match = msg.match(/^#mai(?:mai)? ?info ?(\d+)?$/)
        return match?.[1] || e.user_id
    }
}
