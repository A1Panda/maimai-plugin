import plugin from '../../../lib/plugins/plugin.js'
import { AssetsManager } from '../utils/assets.js'
import { segment } from 'oicq'
import path from 'path'
import fs from 'fs'

export class Assets extends plugin {
    constructor() {
        super({
            name: 'Assets',
            dsc: '获取游戏资源',
            event: 'message',
            priority: 500,
            rule: [
                {
                    reg: '^#(mai|maimai)\\s*(查找|搜索|search)?\\s*(曲绘|音乐|头像|姓名框)\\s*\\d+$',
                    fnc: 'getAsset'
                },
                {
                    reg: '^#(mai|maimai)\\s*(清理|清除|删除|clean)\\s*(资源|缓存|all)$',
                    fnc: 'clearCache',
                    permission: 'master'
                },
                {
                    reg: '^#(mai|maimai)\\s*(强制|force)\\s*(清理|清除|删除|clean)\\s*(资源|缓存|all)$',
                    fnc: 'forceClearCache',
                    permission: 'master'
                }
            ]
        })

        this.assets = new AssetsManager()
        this.typeMap = {
            '曲绘': 'jacket',
            '音乐': 'music',
            '头像': 'icon',
            '姓名框': 'plate'
        }
    }

    /**
     * 获取并发送资源
     * @param {*} e 消息对象
     * @returns {Promise<boolean>} 是否处理成功
     */
    async getAsset(e) {
        // 解析参数
        const msg = e.msg.replace(/^#(mai|maimai)\s*(查找|搜索)?\s*/, '')
        const matches = msg.match(/(曲绘|音乐|头像|姓名框)\s*(\d+)/)
        if (!matches) {
            await e.reply('格式错误\n例如：#mai 查找曲绘 123')
            return false
        }

        const [, typeZh, id] = matches
        const type = this.typeMap[typeZh]

        try {
            let filePath
            switch (type) {
                case 'icon':
                    filePath = await this.assets.getIcon(id)
                    break
                case 'plate':
                    filePath = await this.assets.getPlate(id)
                    break
                case 'jacket':
                    filePath = await this.assets.getJacket(id)
                    break
                case 'music':
                    filePath = await this.assets.getMusic(id)
                    break
                default:
                    await e.reply('不支持的资源类型')
                    return false
            }

            // 发送资源
            if (type === 'music') {
                await e.reply([{
                    type: 'file',
                    name: `${id}.mp3`,
                    file: filePath
                }])
            } else {
                await e.reply(segment.image(filePath))
            }
            return true
        } catch (error) {
            console.error(`获取${typeZh}资源失败:`, error)
            await e.reply(`获取${typeZh}资源失败: ${error.message}`)
            return false
        }
    }

    /**
     * 清理资源缓存
     * @param {*} e 消息对象
     * @returns {Promise<boolean>} 是否处理成功
     */
    async clearCache(e) {
        // 检查权限
        if (!e.isMaster) {
            await e.reply('只有主人才能清理缓存哦~')
            return false
        }

        try {
            await this.assets.cleanExpiredCache()
            await e.reply('清理资源缓存成功')
            return true
        } catch (error) {
            console.error('清理资源缓存失败:', error)
            await e.reply(`清理资源缓存失败: ${error.message}`)
            return false
        }
    }

    /**
     * 强制清理所有缓存
     * @param {*} e 消息对象
     * @returns {Promise<boolean>} 是否处理成功
     */
    async forceClearCache(e) {
        // 检查权限
        if (!e.isMaster) {
            await e.reply('只有主人才能强制清理缓存哦~')
            return false
        }

        try {
            // 获取缓存目录中的所有子目录
            const tempDir = './plugins/maimai-plugin/temp'
            const dirs = ['icon', 'plate', 'jacket', 'music']
            let count = 0

            // 遍历所有子目录
            for (const dir of dirs) {
                const dirPath = path.join(tempDir, dir)
                if (!fs.existsSync(dirPath)) continue

                // 读取目录中的所有文件
                const files = fs.readdirSync(dirPath)
                for (const file of files) {
                    const filePath = path.join(dirPath, file)
                    try {
                        fs.unlinkSync(filePath)
                        count++
                    } catch (err) {
                        console.error(`删除文件失败: ${filePath}`, err)
                    }
                }
            }

            await e.reply(`强制清理缓存成功，共删除 ${count} 个文件`)
            return true
        } catch (error) {
            console.error('强制清理缓存失败:', error)
            await e.reply(`强制清理缓存失败: ${error.message}`)
            return false
        }
    }
}
