import plugin from '../../../lib/plugins/plugin.js'
import { resetConfig } from '../utils/config.js'

export class reconfig extends plugin {
    constructor() {
        super({
            name: '重置配置',
            dsc: '重置maimai插件配置文件',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#?mai(mai)? ?(重置|resat)(配置|config)(文件)?$',
                    fnc: 'resetConfig',
                    permission: 'master'
                }
            ]
        })
    }

    async resetConfig(e) {
        if (!e.isMaster) {
            e.reply('只有超级管理员才能使用该命令')
            return
        }

        resetConfig()
        await e.reply('配置文件已重置')
    }
}
