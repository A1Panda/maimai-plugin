import fs from 'fs'
import yaml from 'yaml'
import LXAPI from './LXAPI.js'
import SYAPI from './SYAPI.js'

export default class APIAdapter {
    constructor() {
        // 读取配置文件
        const config = yaml.parse(fs.readFileSync('./plugins/maimai-plugin/configs/config.yaml', 'utf8'))
        
        // 根据defaultAPI选择API实例
        if(config.defaultAPI === 1) {
            this.api = new LXAPI()
        } else if(config.defaultAPI === 2) {
            this.api = new SYAPI() 
        } else {
            throw new Error('无效的API配置')
        }
    }

// 代理所有API方法
// 公共API类
    // 获取玩家信息
    async getPlayerInfo(friendCode) {
        return await this.api.getPlayerInfo(friendCode)
    }
    // 通过QQ获取玩家信息
    async getPlayerInfoByQQ(qq) {
        return await this.api.getPlayerInfoByQQ(qq)
    }
    // 获取玩家最佳成绩
    async getPlayerBest(friendCode, params) {
        return await this.api.getPlayerBest(friendCode, params)
    }
    // 获取玩家Best 50
    async getPlayerBest50(friendCode) {
        return await this.api.getPlayerBest50(friendCode)
    }
























//资源类
    // 获取头像资源
    async getIconAsset(iconId) {
        return await this.api.getIconAsset(iconId)
    }
    // 获取姓名框资源
    async getPlateAsset(plateId) {
        return await this.api.getPlateAsset(plateId)
    }
    // 获取曲绘资源
    async getJacketAsset(songId) {
        return await this.api.getJacketAsset(songId)
    }
    // 获取音频资源
    async getMusicAsset(songId) {
        return await this.api.getMusicAsset(songId)
    }
    // 获取class_rank资源
    async getClassRankAsset(id) {
        return await this.api.getClassRankAsset(id)
    }
    // 获取course_rank资源
    async getCourseRankAsset(id) {
        return await this.api.getCourseRankAsset(id)
    }
}