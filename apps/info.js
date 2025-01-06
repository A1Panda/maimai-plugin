import plugin from '../../../lib/plugins/plugin.js'
import { MaimaiPlayerInfo } from '../model/getplayerinfo.js'
import common from '../../../lib/common/common.js'
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
                    reg: '^#mai(mai)? ?info$',
                    fnc: 'getInfo'
                }
            ]
        })
        this.maimaiApi = new MaimaiPlayerInfo()
    }

    async getInfo(e) {
        if (!e.user_id) {
            await e.reply('获取QQ号失败')
            return false
        }

        try {
            const playerInfo = await this.maimaiApi.getPlayerInfo(e.user_id)
            //console.log('API返回数据:', JSON.stringify(playerInfo.data, null, 2))
            const imageBuffer = await this.maimaiApi.formatPlayerInfo(playerInfo)
            
            // 创建临时文件目录
            const tempDir = path.join('./plugins/maimai-plugin/temp')
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true })
            }

            // 生成临时文件路径
            const tempFile = path.join(tempDir, `player_info_${e.user_id}_${Date.now()}.png`)
            
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
            await e.reply(`获取玩家信息失败: ${error.message}`)
            return false
        }
    }
}
