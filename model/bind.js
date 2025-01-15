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
        const userData = this.getUserData()
        if (!userData[userId]) {
            userData[userId] = {}
        }
        userData[userId].friendCode = friendCode
        if (this.saveUserData(userData)) {
            return '好友码绑定成功'
        }
        return '好友码绑定失败'
    }

    // 设置用户令牌
    async setUserToken(userId, userToken) {
        const userData = this.getUserData()
        if (!userData[userId]) {
            userData[userId] = {}
        }
        userData[userId].userToken = userToken
        if (this.saveUserData(userData)) {
            return '用户令牌绑定成功'
        }
        return '用户令牌绑定失败'
    }

    // 自动绑定好友码
    async autoBindFriendCode(userId) {
        const userData = this.getUserData()
        if (!userData[userId]) {
            userData[userId] = {}
        }
        
        const adapter = new APIAdapter()
        const response = await adapter.getPlayerInfoByQQ(userId)
        userData[userId].friendCode = response.data.friend_code
        if (this.saveUserData(userData)) {
            return '自动绑定成功'
        }
        return '自动绑定失败'
    }
}

export const bind = new Bind()
