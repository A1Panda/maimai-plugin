import plugin from '../../../lib/plugins/plugin.js'
import { deleteTemp } from '../utils/deleass.js'

export class DeleteTempHandler extends plugin {
    constructor() {
        super({
            name: 'maimai-deltemp',
            dsc: '删除maimai临时文件',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#?mai(mai)? ?(清除资源|清理资源|清理缓存|清除缓存)$',
                    fnc: 'handleDelete'
                }
            ]
        })
    }

    async handleDelete(e) {
        try {
            if (!e.isMaster) {
                await e.reply('只有超级管理员才能执行此操作', true)
                return false
            }
            const result = deleteTemp()
            if (result === false) {
                await e.reply('临时文件清理失败，请检查控制台输出', true)
                return false
            }
            
            if (result === 0) {
                await e.reply('临时目录为空或不存在', true)
            } else {
                await e.reply(`临时文件清理完成，共清理${result}个文件`, true)
            }
            return true
        } catch (err) {
            logger.error('[maimai-plugin] 删除临时文件失败')
            logger.error(err)
            await e.reply('删除临时文件失败，请检查控制台输出', true)
            return false
        }
    }
}
