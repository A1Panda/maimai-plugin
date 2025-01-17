import plugin from '../../../lib/plugins/plugin.js'
import { b50 } from '../model/b50.js'
import fs from 'fs'

export class PlayerInfoHandler extends plugin {
    constructor() {
        super({
            name: 'maimai-playerinfo',
            dsc: 'maimai玩家信息',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#?mai(mai)? ?(b50|b50信息)$',
                    fnc: 'b50'
                }
            ]
        })
    }

    async b50(e) {
        try {
            let msg = await e.reply('正在渲染b50信息请稍后...', { at: true })
            setTimeout(() => {
                if (msg?.message_id) e.group.recallMsg(msg.message_id)
            }, 3000)
            const result = await b50.getB50(e.user_id)
            
            // 如果是错误消息，直接返回
            if (!result.isImage) {
                await e.reply(result.message, { at: true })
                return true
            }
            
            // 发送图片并删除临时文件
            await e.reply(segment.image(result.message))
            if (fs.existsSync(result.message)) {
                fs.unlinkSync(result.message)
            }
            return true
        } catch (err) {
            logger.error('[maimai-plugin] 获取b50信息失败')
            logger.error(err)
            await e.reply('获取b50信息失败，请稍后再试')
            return false
        }
    }
}

