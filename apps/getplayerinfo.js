import plugin from '../../../lib/plugins/plugin.js'
import { MaimaiPlayerInfo } from '../model/getplayerinfo.js'

export class GetPlayerInfo extends plugin {
    constructor() {
        super({
            name: 'GetPlayerInfo',
            dsc: '获取玩家信息',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#mai(mai)? ?info$',
                    fnc: 'getInfo'
                }
            ]
        })
        this.maimaiApi = new MaimaiPlayerInfo()
    }

    async getInfo(e) {
        // 检查是否有qq号
        if (!e.user_id) {
            await e.reply('获取QQ号失败')
            return false
        }

        try {
            const playerInfo = await this.maimaiApi.getPlayerInfo(e.user_id)
            const formattedInfo = this.maimaiApi.formatPlayerInfo(playerInfo)
            await e.reply(formattedInfo)
            return true
        } catch (error) {
            await e.reply('获取玩家信息失败，请确认是否已绑定查分器账号')
            return false
        }
    }
}
