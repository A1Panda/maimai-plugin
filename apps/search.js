import plugin from '../../../lib/plugins/plugin.js'
import { musicInfo } from '../model/musicinfo.js'
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
                    reg: '^#?mai(mai)? ?(search|搜索) ?(歌曲|歌名|曲名|歌谱|曲谱|song) ?(.+)$',
                    fnc: 'searchsong'
                },
                {
                    reg: '^#?mai(mai)? ?(search|搜索) ?(姓名框|名字|名字框|name) ?(.+)$',
                    fnc: 'searchname'
                },
                {
                    reg: '^#?mai(mai)? ?(search|搜索) ?(头像|头像框|头像框|avatar) ?(.+)$',
                    fnc: 'searchavatar'
                },
                {
                    reg: '^#?mai(mai)? ?(search|搜索) ?(背景|背景框|背景框|background) ?(.+)$',
                    fnc: 'searchbackground'
                },
                {
                    reg: '^#?mai(mai)? ?(search|搜索) ?(称号|称号|title) ?(.+)$',
                    fnc: 'searchtitle'
                }
            ]
        })
    }

    async searchsong(e) {
        try {
            let msg = await e.reply('正在渲染搜索结果请稍后...', { at: true })
            setTimeout(() => {
                if (msg?.message_id && e.group) e.group.recallMsg(msg.message_id)
            }, 3000)
            const result = await musicInfo.getMusicInfo(e.msg.match(/^#?mai(mai)? ?(search|搜索) ?(.+)$/)[3])
            logger.info(JSON.stringify(result))
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
            logger.error('[maimai-plugin] 获取搜索结果失败')
            logger.error(err)
            await e.reply('获取搜索结果失败，请稍后再试')
            return false
        }
    }

    async searchname(e) {
        const result = await musicInfo.getMusicInfo(e.msg.match(/^#?mai(mai)? ?(search|搜索) ?(.+)$/)[3])
    }

    async searchavatar(e) {
        const result = await musicInfo.getMusicInfo(e.msg.match(/^#?mai(mai)? ?(search|搜索) ?(.+)$/)[3])
    }

    async searchbackground(e) {
        const result = await musicInfo.getMusicInfo(e.msg.match(/^#?mai(mai)? ?(search|搜索) ?(.+)$/)[3])
    }

    async searchtitle(e) {
        const result = await musicInfo.getMusicInfo(e.msg.match(/^#?mai(mai)? ?(search|搜索) ?(.+)$/)[3])
    }
}

