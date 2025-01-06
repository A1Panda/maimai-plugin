import plugin from '../../../lib/plugins/plugin.js'
import { MaimaiB50 } from '../model/getb50.js'
import common from '../../../lib/common/common.js'

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
            const messages = this.maimaiApi.formatB50(b50Data, friendCode)
            
            // 使用合并转发
            await this.reply_forward_msg(e, messages)
            return true
        } catch (error) {
            await e.reply(`获取B50数据失败: ${error.message}`)
            return false
        }
    }

    async reply_forward_msg(e, messages) {
        try {
            const msg = await common.makeForwardMsg(e, messages, 'B50成绩查询')
            await e.reply(msg)
        } catch (error) {
            console.error('发送转发消息失败:', error)
            await e.reply('发送消息失败，请稍后重试')
        }
    }
} 