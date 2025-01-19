import plugin from '../../../lib/plugins/plugin.js'
import { random } from '../model/random.js'
import { musicInfo } from '../model/musicinfo.js'
import { plateInfo } from '../model/Plateinfo.js'
import { iconInfo } from '../model/iconinfo.js'
import { frameInfo } from '../model/frameinfo.js'
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
                    reg: '^#?mai(mai)? ?(随机|random) ?(歌曲|歌名|音乐|曲名|谱面|song|姓名框|名字框|名牌|plate|头像|头像框|avatar|背景|背景框|皮肤|background|frame|收藏品|称号|title|曲绘|cover)( ?\\d+)?$',
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
            // 从消息中提取类型并标准化
            const typeMatch = e.msg.match(/(歌曲|歌名|音乐|曲名|谱面|song|姓名框|名字框|名牌|plate|头像|头像框|avatar|背景|背景框|皮肤|background|frame|收藏品|称号|title|曲绘|cover)/)[0]
            
            // 标准化类型名称
            let type
            if (/歌曲|歌名|音乐|曲名|谱面|song/.test(typeMatch)) {
                type = '歌曲'
            } else if (/姓名框|名字框|名牌|plate/.test(typeMatch)) {
                type = '姓名框'
            } else if (/头像|头像框|avatar/.test(typeMatch)) {
                type = '头像'
            } else if (/背景|背景框|皮肤|background|frame/.test(typeMatch)) {
                type = '背景框'
            } else if (/收藏品|称号|title/.test(typeMatch)) {
                type = '收藏品'
            } else if (/曲绘|cover/.test(typeMatch)) {
                type = '曲绘'
            }
            
            // 提取难度限制
            const difficulty = e.msg.match(/\d+$/)?.[0]
            
            // 获取随机ID
            const id = await random.getRandomId(type, difficulty)
            
            if (!id) {
                await e.reply(`随机获取${type}失败，请稍后再试`, { at: true })
                return false
            }
            
            // 获取资源文件
            const asset = type === '背景' ? null : await uploadAssets.uploadRandom(type, id)
            
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
                case '背景框':
                    result = await frameInfo.getFrameInfo(id)
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
