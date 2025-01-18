import plugin from '../../../lib/plugins/plugin.js'
import { musicInfo } from '../model/musicinfo.js'
import { uploadAssets } from '../model/uploadass.js'
import { aliasResolver } from '../utils/MaimaiAliasResolver.js'
import fs from 'fs'
import { plateInfo } from '../model/Plateinfo.js'

let searchHistory = {}  // 存储格式: { QQ号: { id: 搜索ID, type: 搜索类型 } }

// 初始化别名解析器
aliasResolver.init().catch(err => {
    logger.error('[maimai-plugin] 初始化别名解析器失败')
    logger.error(err)
})

export class PlayerInfoHandler extends plugin {
    constructor() {
        super({
            name: 'maimai-playerinfo',
            dsc: 'maimai玩家信息',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#?mai(mai)? ?(search|搜索) ?(歌曲|歌名|音乐|曲名|歌谱|曲谱|song|姓名框|名字|名字框|name|头像|头像框|avatar|背景|背景框|background|称号|title|曲绘) ?(.+)$',
                    fnc: 'handleSearch'
                },
                {
                    reg: '^#?mai(mai)? ?(上传)$',
                    fnc: 'handleUpload'
                }
            ]
        })
    }
    // 统一处理搜索
    async handleSearch(e) {
        try {
            let msg = await e.reply('正在渲染搜索结果请稍后...', { at: true })
            setTimeout(() => {
                if (msg?.message_id && e.group) e.group.recallMsg(msg.message_id)
            }, 6000)
            
            // 获取搜索类型和ID
            const match = e.msg.match(/^#?mai(?:mai)? ?(?:search|搜索) ?(歌曲|歌名|音乐|曲名|歌谱|曲谱|song|姓名框|名字|名字框|name|头像|头像框|avatar|背景|背景框|background|称号|title|曲绘) ?(.+)$/)
            const searchType = match[1]
            const id = match[2]
            
            // 确定搜索类型
            let type = ''
            if (/歌曲|歌名|音乐|曲名|歌谱|曲谱|song/.test(searchType)) type = 'song'
            else if (/姓名框|名字|名字框|name/.test(searchType)) type = 'name'
            else if (/头像|头像框|avatar/.test(searchType)) type = 'avatar'
            else if (/背景|背景框|background/.test(searchType)) type = 'background'
            else if (/称号|title/.test(searchType)) type = 'title'
            else if (/曲绘/.test(searchType)) type = 'jacket'

            logger.info(`[maimai-plugin] 搜索类型: ${searchType} -> ${type}`)
            logger.info(`[maimai-plugin] 搜索ID: ${id}`)
            
            // 根据类型调用不同的处理函数
            let result
            if (type === 'song') {
                // 检查是否为纯数字ID
                if (/^\d+$/.test(id)) {
                    logger.info(`[maimai-plugin] 使用ID直接搜索: ${id}`)
                    result = await musicInfo.getMusicInfo(id)
                    searchHistory[e.user_id] = {
                        id: id,
                        type: type,
                        name: result.songname
                    }
                } else {
                    // 尝试通过别名解析
                    const song = aliasResolver.searchSong(id)
                    if (song) {
                        logger.info(`[maimai-plugin] 通过别名找到歌曲: ${song.title} (ID: ${song.id})`)
                        await e.reply(`通过别名找到歌曲: ${song.title} (ID: ${song.id})`)
                        result = await musicInfo.getMusicInfo(song.id)
                        // 更新搜索历史为实际的歌曲ID
                        searchHistory[e.user_id] = {
                            id: song.id,
                            type: type,
                            name: result.songname
                        }
                    } else {
                        logger.info(`[maimai-plugin] 未找到匹配的歌曲: ${id}`)
                        return await e.reply('未找到匹配的歌曲，请检查输入是否正确', { at: true })
                    }
                }
            } else if (type === 'name') {
                // 检查是否为纯数字ID
                if (/^\d+$/.test(id)) {
                    logger.info(`[maimai-plugin] 使用ID直接搜索姓名框: ${id}`)
                    result = await plateInfo.getPlateInfo(id)
                    searchHistory[e.user_id] = {
                        id: id,
                        type: type,
                        name: result.name
                    }
                } else {
                    // 尝试通过别名解析
                    const plate = aliasResolver.searchPlate(id)
                    if (plate) {
                        logger.info(`[maimai-plugin] 通过模糊匹配找到姓名框: ${plate.name} (ID: ${plate.id})`)
                        await e.reply(`通过模糊匹配找到姓名框: ${plate.name} (ID: ${plate.id})`)
                        result = await plateInfo.getPlateInfo(plate.id)
                        searchHistory[e.user_id] = {
                            id: plate.id,
                            type: type,
                            name: result.name
                        }
                    } else {
                        logger.info(`[maimai-plugin] 未找到匹配的姓名框: ${id}`)
                        return await e.reply('未找到匹配的姓名框，请检查输入是否正确', { at: true })
                    }
                }
            } else if (type === 'avatar') {
                result = await avatar.getAvatar(id)
            } else if (type === 'background') {
                result = await background.getBackground(id)
            } else if (type === 'title') {
                result = await title.getTitle(id)
            } else if (type === 'jacket') {
                result = await jacket.getJacket(id)
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
            logger.error('[maimai-plugin] 获取搜索结果失败')
            logger.error(err)
            await e.reply('获取搜索结果失败，请稍后再试')
            return false
        }
    }

    // 上传
    async handleUpload(e) {
        try {
            // 获取最近一次搜索的类型和ID
            if (!searchHistory[e.user_id]) {
                await e.reply('您还未进行过搜索', { at: true })
                return false
            }

            // 获取搜索类型和ID
            const { type, id, name } = searchHistory[e.user_id]
            let msg = await e.reply(`您最近一次搜索的是:\n名称: ${name}\n类型: ${type}\nID: ${id}\n正在上传...`, { at: true })
            setTimeout(() => {
                if (msg?.message_id && e.group) e.group.recallMsg(msg.message_id)
            }, 6000)

            //获取对应的资源
            const result = await uploadAssets.uploadSearch(type, id)
            if (result) {
                // 获取文件扩展名
                const ext = result.split('.').pop().toLowerCase()
                // 根据扩展名判断文件类型
                if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
                    await e.reply(segment.image(result))
                } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
                    await e.reply([{
                        type: 'file',
                        name: `${name}.${ext}`,
                        file: result
                    }])
                } else {
                    await e.reply(segment.file(result))
                }
            } else {
                await e.reply('获取资源失败')
            }
            return true

        } catch (err) {
            logger.error('[maimai-plugin] 获取搜索历史失败')
            logger.error(err)
            await e.reply('获取搜索历史失败，请稍后再试')
            return false
        }

    }
}

