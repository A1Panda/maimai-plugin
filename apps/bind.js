import plugin from '../../../lib/plugins/plugin.js'
import { bind } from '../model/bind.js'

export class bindHandler extends plugin {
    constructor() {
        super({
            name: '绑定maimai账号',
            dsc: '绑定maimai玩家信息',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#mai(mai)? ?(bind|绑定).*$',
                    fnc: 'handleBind'
                }
            ]
        })
    }

    async handleBind(e) {
        // 检查是否为好友码绑定
        const friendCode = e.msg.match(/\d{15}/)?.[0]
        if (friendCode) {
            const result = await bind.setFriendCode(e.user_id, friendCode)
            await e.reply(result, true)
            return
        }

        // 检查是否为token绑定
        const userToken = e.msg.match(/[A-Za-z0-9+/=]{44}/)?.[0]
        if (userToken) {
            const result = await bind.setUserToken(e.user_id, userToken)
            await e.reply(result, true)
            return
        }
         // 检查是否为自动绑定命令
        if (/^#mai(mai)? ?(bind|绑定)$/.test(e.msg)) {
            const result = await bind.autoBindFriendCode(e.user_id)
            await e.reply(result, true)
            return
        }

        

        // 如果都不匹配，返回错误提示
        await e.reply('请输入正确的绑定格式\n- #mai绑定 好友码(15位数字)\n- #mai绑定 token xxx\n- #mai绑定(自动绑定)')
    }
}
