import plugin from '../../../lib/plugins/plugin.js'
import { MaimaiRandomSong } from '../model/getrandomsong.js'
import fs from 'fs'
import path from 'path'

export class RandomSong extends plugin {
    constructor() {
        super({
            name: 'RandomSong',
            dsc: '随机一首歌',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#mai(mai)? ?(random|随机)(一首歌)? ?(.*)$',
                    fnc: 'random'
                }
            ]
        })
        this.randomSong = new MaimaiRandomSong()
    }

    /**
     * 随机一首歌
     * @param {Object} e 消息事件对象
     * @returns {Promise<boolean>} 是否执行成功
     */
    async random(e) {
        try {
            // 解析参数
            const params = this.parseParams(e)
            
            // 获取随机歌曲
            const data = await this.randomSong.getRandomSong(params)
            
            // 生成图片
            const imageBuffer = await this.randomSong.formatSongInfo(data)
            
            // 创建临时文件目录
            const tempDir = path.join('./plugins/maimai-plugin/temp')
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true })
            }

            // 生成临时文件路径
            const tempFile = path.join(tempDir, `random_song_${Date.now()}.png`)
            
            // 写入图片数据
            fs.writeFileSync(tempFile, imageBuffer)

            // 发送图片
            await e.reply(segment.image(tempFile))

            // 获取并发送曲绘和音乐
            await this.randomSong.getSongAssets(data, e)

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
            await e.reply('随机歌曲失败：' + error.message)
            return false
        }
    }

    /**
     * 解析命令参数
     * @param {Object} e 消息事件对象
     * @returns {Object} 参数对象
     */
    parseParams(e) {
        const msg = e.msg.trim()
        const match = msg.match(/^#mai(?:mai)? ?(?:random|随机)(?:一首歌)? ?(.*)$/)
        const args = match?.[1]?.split(/\s+/) || []

        const params = {}

        // 解析参数
        args.forEach(arg => {
            if (/^\d+(\.\d+)?$/.test(arg)) {
                // 难度等级
                params.level = parseFloat(arg)
            } else if (/^(basic|advanced|expert|master|remaster)$/i.test(arg)) {
                // 难度类型
                params.type = arg.toLowerCase()
            } else if (/^(dx|sd)$/i.test(arg)) {
                // 版本类型
                params.version_type = arg.toLowerCase()
            }
        })

        return params
    }
} 