import plugin from '../../../lib/plugins/plugin.js'
import { ScreenshotManager } from '../utils/screenshot.js'
import { ConfigManager } from '../utils/config.js'
import fs from 'fs'
import path from 'path'

export class MaimaiHelp extends plugin {
    constructor() {
        super({
            name: 'MaimaiHelp',
            dsc: 'maimai插件帮助',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#mai(mai)? ?(帮助|help)$',
                    fnc: 'help'
                }
            ]
        })
        this.config = new ConfigManager()
    }

    async help(e) {
        try {
            // 获取帮助菜单配置
            const helpConfig = this.config.getHelpConfig()
            
            // 生成图片
            const imageBuffer = await ScreenshotManager.makeImage(helpConfig, 'help.html')
            
            // 创建临时文件目录
            const tempDir = path.join('./plugins/maimai-plugin/temp')
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true })
            }

            // 生成临时文件路径
            const tempFile = path.join(tempDir, `help_${Date.now()}.png`)
            
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
            await e.reply('获取帮助菜单失败：' + error.message)
            return false
        }
    }
} 