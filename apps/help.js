import plugin from '../../../lib/plugins/plugin.js'

export class MaimaiHelp extends plugin {
    constructor() {
        super({
            name: 'MaimaiHelp',
            dsc: 'maimai插件帮助',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#mai(mai)?(帮助|help)$',
                    fnc: 'help'
                }
            ]
        })
    }

    async help(e) {
        const helpText = `maimai-plugin 帮助菜单
————————
指令列表：
1. 基础功能
  #mai help      - 显示帮助菜单
  #mai info      - 查看个人信息
  #mai bind      - 绑定好友码
  #mai unbind    - 解绑好友码

2. 查分功能
  #mai b50       - 查看B50成绩
  #mai recent    - 查看最近游玩记录
  #mai score     - 查询单曲成绩
  #mai search    - 搜索歌曲(支持难度、等级等)
  #mai random    - 随机一首歌
  #mai plate     - 查看名牌进度
  #mai rank      - 查看排行榜

3. 管理功能
  #mai 更新      - 更新插件
  #mai 设置      - 修改插件设置
  #mai 封禁      - 封禁用户使用权限
  #mai 解封      - 解除用户封禁
————————
注：以上指令中的mai也可以使用maimai`

        await e.reply(helpText)
        return true
    }
} 