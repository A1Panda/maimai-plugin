import plugin from '../../../lib/plugins/plugin.js'
import { playerInfo } from '../model/playerinfo.js'
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
                    reg: '^#?mai(mai)? ?(info|信息)$',
                    fnc: 'playerinfo'
                }
            ]
        })
    }

    async playerinfo(e) {
        try {
            // 获取目标用户ID
            let targetId = e.user_id
            
            // 如果有@，则使用@的用户ID
            if (e.at && e.at !== targetId) {
                targetId = e.at
            }
            
            let msg = await e.reply('正在渲染个人信息请稍后...', { at: true })
            
            const result = await playerInfo.getPlayerInfo(targetId)
            
            // 撤回等待消息（在发送结果前撤回，避免被后续发送打断）
            try {
                if (msg?.message_id && e.group) {
                    await e.group.recallMsg(msg.message_id)
                }
            } catch (recallErr) {
                logger.warn(`[maimai-plugin] 撤回playerinfo等待消息失败: ${recallErr.message}`)
            }
            
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
            logger.error('[maimai-plugin] 获取玩家信息失败')
            logger.error(err)
            await e.reply('获取玩家信息失败，请稍后再试')
            return false
        }
    }
}

