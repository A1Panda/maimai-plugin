import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import YAML from 'yaml'

export class BindFriendCode extends plugin {
    constructor() {
        super({
            name: 'BindFriendCode',
            dsc: '绑定maimai好友码',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#mai bind (.+)$',
                    fnc: 'bindCode'
                },
                {
                    reg: '^#mai unbind$',
                    fnc: 'unbindCode'
                }
            ]
        })
        this.filePath = './plugins/maimai-plugin/config/friendCode.yaml'
    }

    /**
     * 初始化或读取配置文件
     */
    loadConfig() {
        try {
            if (!fs.existsSync(this.filePath)) {
                fs.writeFileSync(this.filePath, YAML.stringify({}))
                return {}
            }
            const file = fs.readFileSync(this.filePath, 'utf8')
            return YAML.parse(file) || {}
        } catch (error) {
            console.error('读取配置文件失败:', error)
            return {}
        }
    }

    /**
     * 保存配置
     * @param {Object} config 配置对象
     */
    saveConfig(config) {
        try {
            fs.writeFileSync(this.filePath, YAML.stringify(config))
            return true
        } catch (error) {
            console.error('保存配置文件失败:', error)
            return false
        }
    }

    /**
     * 绑定好友码
     * @param {*} e 消息事件
     */
    async bindCode(e) {
        // 获取QQ号
        if (!e.user_id) {
            await e.reply('获取QQ号失败')
            return false
        }

        // 获取好友码
        const friendCode = e.msg.match(/^#mai bind (.+)$/)[1]
        
        // 验证好友码格式（15位数字）
        if (!/^\d{15}$/.test(friendCode)) {
            await e.reply('好友码格式错误，请输入15位数字')
            return false
        }

        // 读取现有配置
        const config = this.loadConfig()
        
        // 保存绑定信息
        config[e.user_id] = friendCode
        
        if (this.saveConfig(config)) {
            await e.reply('好友码绑定成功！')
            return true
        } else {
            await e.reply('好友码绑定失败，请稍后重试')
            return false
        }
    }

    /**
     * 解绑好友码
     * @param {*} e 消息事件
     */
    async unbindCode(e) {
        if (!e.user_id) {
            await e.reply('获取QQ号失败')
            return false
        }

        const config = this.loadConfig()
        
        if (!config[e.user_id]) {
            await e.reply('您尚未绑定好友码')
            return false
        }

        delete config[e.user_id]
        
        if (this.saveConfig(config)) {
            await e.reply('好友码解绑成功！')
            return true
        } else {
            await e.reply('好友码解绑失败，请稍后重试')
            return false
        }
    }
} 