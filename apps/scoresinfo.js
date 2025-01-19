import plugin from '../../../lib/plugins/plugin.js'
import { scoreInfo } from '../model/scoreinfo.js'
import fs from 'fs'

export class ScoreInfoHandler extends plugin {
    constructor() {
        super({
            name: 'maimai-scoreinfo',
            dsc: 'maimai分数信息',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#?mai(mai)? ?(查分|分数|成绩|score) ?(.+)?$',
                    fnc: 'getScore'
                }
            ]
        })
    }

    async getScore(e) {
        try {
            // 检查是否提供了歌曲名称/ID
            const songQuery = e.msg.match(/^#?mai(mai)? ?(查分|分数|成绩|score) ?(.+)?$/)[3]
            //logger.info(songQuery)
            if (!songQuery) {
                await e.reply('请提供要查询的歌曲名称或ID', { at: true })
                return false
            }

            // 获取目标用户ID
            let targetId = e.user_id
            
            // 如果有@，则使用@的用户ID
            if (e.at && e.at !== targetId) {
                targetId = e.at
            }
            
            // 发送等待消息
            let msg = await e.reply('正在获取分数信息请稍后...', { at: true })
            setTimeout(() => {
                if (msg?.message_id && e.group) e.group.recallMsg(msg.message_id)
            }, 6000)

            // 获取分数信息
            const result = await scoreInfo.getScoreInfo(songQuery, targetId)
            
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
            logger.error('[maimai-plugin] 获取分数信息失败')
            logger.error(err)
            await e.reply('获取分数信息失败，请稍后再试')
            return false
        }
    }
}

