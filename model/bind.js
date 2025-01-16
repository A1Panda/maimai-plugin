import fs from 'node:fs'
import yaml from 'yaml'
import path from 'node:path'
import APIAdapter from '../components/Adapter.js'

class Bind {
    constructor() {
        this.userDataPath = './plugins/maimai-plugin/configs/userdata.yaml'
    }

    // 读取用户数据
    getUserData() {
        try {
            const data = fs.readFileSync(this.userDataPath, 'utf8')
            return yaml.parse(data) || {}
        } catch (err) {
            logger.error('[maimai-plugin] 读取用户数据失败')
            logger.error(err)
            return {}
        }
    }

    // 保存用户数据
    saveUserData(data) {
        try {
            fs.writeFileSync(this.userDataPath, yaml.stringify(data), 'utf8')
            return true
        } catch (err) {
            logger.error('[maimai-plugin] 保存用户数据失败')
            logger.error(err)
            return false
        }
    }

    // 设置好友码
    async setFriendCode(userId, friendCode) {
        try {
            // 检查好友码格式
            if (!/^\d{15}$/.test(friendCode)) {
                return '绑定失败：好友码必须为15位数字'
            }

            const userData = this.getUserData()
            if (!userData[userId]) {
                userData[userId] = {}
            }

            // 直接存储数字格式的好友码
            userData[userId].friendCode = Number(friendCode)
            if (this.saveUserData(userData)) {
                return `绑定成功！\n好友码：${friendCode}`
            }
            return '绑定失败：保存数据时出错'
        } catch (err) {
            logger.error('[maimai-plugin] 绑定好友码失败')
            logger.error(err)
            return '绑定失败：请检查控制台输出'
        }
    }

    // 设置用户令牌
    async setUserToken(userId, userToken) {
        try {
            // 验证token格式
            if (!/^[A-Za-z0-9+/=]+$/.test(userToken)) {
                return '绑定失败：无效的用户令牌格式'
            }

            const userData = this.getUserData()
            if (!userData[userId]) {
                userData[userId] = {}
            }
            userData[userId].userToken = userToken
            if (this.saveUserData(userData)) {
                return `用户令牌绑定成功\n令牌：${userToken}`
            }
            return '绑定失败：保存数据时出错'
        } catch (err) {
            logger.error('[maimai-plugin] 绑定用户令牌失败')
            logger.error(err)
            return '绑定失败：请检查控制台输出'
        }
    }

    // 自动绑定好友码
    async autoBindFriendCode(userId) {
        try {
            const userData = this.getUserData()
            if (!userData[userId]) {
                userData[userId] = {}
            }
            
            const adapter = new APIAdapter()
            const response = await adapter.getPlayerInfoByQQ(userId)
            
            // 检查API响应
            if (!response.success) {
                if (response.code === 404) {
                    return '绑定失败：请先在落雪官网绑定QQ号\nhttps://maimai.lxns.net/user/bind'
                }
                return `绑定失败：${response.data || '未知错误'}`
            }

            userData[userId].friendCode = response.data.friend_code
            if (this.saveUserData(userData)) {
                return `绑定成功！\n玩家名：${response.data.name}\n好友码：${response.data.friend_code}`
            }
            return '绑定失败：保存数据时出错'
        } catch (err) {
            logger.error('[maimai-plugin] 自动绑定失败')
            logger.error(err)
            return '绑定失败：请在落雪平台绑定QQ号后在尝试'
        }
    }
}

export const bind = new Bind()
