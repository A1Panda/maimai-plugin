import plugin from '../../../lib/plugins/plugin.js'
import { MaimaiB50 } from '../model/getb50.js'
import fs from 'fs'
import path from 'path'

export class GetB50 extends plugin {
    constructor() {
        super({
            name: 'GetB50',
            dsc: '获取B50成绩',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#mai(mai)? ?b50$',
                    fnc: 'getB50'
                }
            ]
        })
        this.maimaiApi = new MaimaiB50()
    }

    async getB50(e) {
        if (!e.user_id) {
            await e.reply('获取QQ号失败')
            return false
        }

        try {
            const { data: b50Data, friendCode } = await this.maimaiApi.getB50(e.user_id)
            const imageBuffer = await this.maimaiApi.formatB50(b50Data, friendCode)
            
            // 创建临时文件目录
            const tempDir = path.join('./plugins/maimai-plugin/temp')
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true })
            }

            // 生成临时文件路径
            const tempFile = path.join(tempDir, `b50_${e.user_id}_${Date.now()}.png`)
            
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
            await e.reply(`获取B50数据失败: ${error.message}`)
            return false
        }
    }
} 