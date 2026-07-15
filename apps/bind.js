import fs from 'node:fs'
import yaml from 'yaml'
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
                    reg: '^#?mai(mai)? ?(bind|绑定).*$',
                    fnc: 'handleBind'
                },
                {
                    reg: '^#?mai(mai)? ?(unbind|解绑).*$',
                    fnc: 'handleUnbind'
                }
            ]
        })
    }

    // 获取当前API模式
    _getAPIMode() {
        try {
            const configPath = './plugins/maimai-plugin/configs/config.yaml'
            if (fs.existsSync(configPath)) {
                const config = yaml.parse(fs.readFileSync(configPath, 'utf8'))
                return config.defaultAPI === 2 ? 'SY' : 'LX'
            }
            // 读取默认配置
            const defaultConfig = yaml.parse(fs.readFileSync('./plugins/maimai-plugin/configs/defaults/config.yaml', 'utf8'))
            return defaultConfig.defaultAPI === 2 ? 'SY' : 'LX'
        } catch {
            return 'LX'
        }
    }

    async handleBind(e) {
        const isSY = this._getAPIMode() === 'SY'

        // 检查是否为好友码绑定（水鱼模式匹配5-11位QQ号，落雪模式匹配15位好友码）
        const friendCode = isSY
            ? e.msg.match(/\d{5,11}(?!\d)/)?.[0]    // 水鱼：QQ号 5-11位
            : e.msg.match(/\d{15}/)?.[0]              // 落雪：好友码 15位
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
        if (isSY) {
            await e.reply('请输入正确的绑定格式\n- #mai绑定 QQ号\n- #mai绑定(自动绑定)')
        } else {
            await e.reply('请输入正确的绑定格式\n- #mai绑定 好友码(15位数字)\n- #mai绑定 token xxx\n- #mai绑定(自动绑定)')
        }
    }

    async handleUnbind(e) {
        const result = await bind.unbind(e.user_id)
        await e.reply(result, true)
        return
    }
}
