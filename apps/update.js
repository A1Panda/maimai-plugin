import { update as Update } from '../../other/update.js'

const PluginName = 'maimai-plugin'

export class update extends plugin {
  constructor () {
    super({
      name: 'maimai-plugin更新',
      dsc: '调用Yunzai自带更新模块进行插件更新',
      event: 'message',
      priority: 2000,
      rule: [
        {
          reg: '^#?(maimai|maimai-plugin|舞萌|mai)(插件)?(强制)?更新$',
          fnc: 'update',
          permission: 'master'
        },
        {
          reg: '^#?(maimai|maimai-plugin|舞萌|mai)(插件)?更新(日志|记录)$',
          fnc: 'update_log',
          permission: 'master'
        }
      ]
    })
  }

  async update (e) {
    logger.info('[maimai-plugin更新]', e.msg)
    e.isMaster = true
    if (e.at && !e.atme) return
    e.msg = `#${e.msg.includes('强制') ? '强制' : ''}更新${PluginName}`
    const up = new Update(e)
    up.e = e
    return up.update()
  }

  async update_log () {
    let UpdatePlugin = new Update()
    UpdatePlugin.e = this.e
    UpdatePlugin.reply = this.reply

    if (UpdatePlugin.getPlugin(PluginName)) {
      this.e.reply(await UpdatePlugin.getLog(PluginName))
    }
    return true
  }
} 