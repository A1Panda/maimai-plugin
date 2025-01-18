import plugin from '../../../lib/plugins/plugin.js'
import { random } from '../model/random.js'
import { musicInfo } from '../model/musicinfo.js'
import { plateInfo } from '../model/Plateinfo.js'
import { iconInfo } from '../model/iconinfo.js'
import { uploadAssets } from '../model/uploadass.js'

export class RandomHandler extends plugin {
    constructor() {
        super({
            name: 'maimai-random',
            dsc: 'maimai随机数据',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#?mai(mai)? ?(随机|random) ?(歌曲|姓名框|头像|背景框|收藏品|曲绘)( ?\\d+)?$',
                    fnc: 'random'
                }
            ]
        })
    }

    async random(e) {
        try {
            let msg = await e.reply('正在渲染随机数据请稍后...', { at: true })
            setTimeout(() => {
                if (msg?.message_id && e.group) e.group.recallMsg(msg.message_id)
            }, 6000)
            // 从消息中提取类型
            const type = e.msg.match(/(歌曲|姓名框|头像|背景框|收藏品|曲绘)/)[0]
            // 提取难度限制
            const difficulty = e.msg.match(/\d+$/)?.[0]
            
            // 获取随机ID
            const id = await random.getRandomId(type, difficulty)
            
            if (!id) {
                await e.reply(`随机获取${type}失败，请稍后再试`, { at: true })
                return false
            }
            
            // 获取资源文件
            const asset = await uploadAssets.uploadRandom(type, id)
            
            // 获取资源信息
            let result
            switch(type) {
                case '歌曲':
                case '曲绘':
                    result = await musicInfo.getMusicInfo(id)
                    break
                case '姓名框':
                    result = await plateInfo.getPlateInfo(id)
                    break
                case '头像':
                    result = await iconInfo.getIconInfo(id)
                    break
                default:
                    if (asset) {
                        await e.reply([
                            `随机${type}ID为: ${id}`,
                            segment.image(asset)
                        ])
                    } else {
                        await e.reply(`随机${type}ID为: ${id}`, { at: true })
                    }
                    return true
            }

            
            // 处理结果
            if (result) {
                if (type === '歌曲') {
                    // 先发送歌曲详细信息
                    await e.reply([
                        `随机${type}ID为: ${id}`,
                        segment.image(result.message)
                    ])
                    // 如果有音频文件，再发送音频
                    if (asset) {
                        await e.reply(segment.record(asset))
                    }
                } else if (result.isImage) {
                    // 其他类型的图片资源
                    await e.reply([
                        `随机${type}ID为: ${id}`,
                        segment.image(result.message)
                    ])
                    if (asset) {
                        await e.reply(segment.image(asset))
                    }
                }
                return true
            }
            
            await e.reply(`随机${type}ID为: ${id}，获取资源失败`, { at: true })
            return true
        } catch (err) {
            logger.error('[maimai-plugin] 随机获取数据失败')
            logger.error(err)
            await e.reply('随机获取数据失败，请稍后再试', { at: true })
            return false
        }
    }
}
