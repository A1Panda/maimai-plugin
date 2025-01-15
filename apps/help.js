import { Help } from '../model/help.js'
import fs from 'fs'

export class help extends plugin {
    constructor() {
        super({
            name: 'maimai-help',
            dsc: 'maimai帮助信息',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#mai(mai)? ?帮助$',
                    fnc: 'help'
                }
            ]
        })
    }

    async help(e) {
        try {
            const imagePath = await Help.render()
            await e.reply(segment.image(imagePath))
            fs.unlinkSync(imagePath)
            return true
        } catch (err) {
            logger.error('[maimai-plugin] 生成帮助图片失败')
            logger.error(err)
            await e.reply('生成帮助图片失败,请检查控制台输出')
            return false
        }
    }
}
