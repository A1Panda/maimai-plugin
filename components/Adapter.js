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
// 开发者API类
    // 创建/修改玩家信息
    async postPlayerInfo(playerData) {
        return await this.api.postPlayerInfo(playerData)
    }
    // 获取玩家信息 正常
    async getPlayerInfo(friendCode) {
        return await this.api.getPlayerInfo(friendCode)
    }
    // 通过QQ获取玩家信息 正常
    async getPlayerInfoByQQ(qq) {
        return await this.api.getPlayerInfoByQQ(qq)
    }
    // 获取玩家最佳成绩
    async getPlayerBest(friendCode, params) {
        return await this.api.getPlayerBest(friendCode, params)
    }
    //获取玩家Best 50 正常
    async getPlayerBest50(friendCode) {
        return await this.api.getPlayerBest50(friendCode)
    }
    //获取玩家Best 50 (AP)
    async getPlayerAP50(friendCode) {
        return await this.api.getPlayerAP50(friendCode)
    }
    //获取玩家缓存单曲所有谱面的成绩
    async getPlayerSongBests(friendCode, params) {
        return await this.api.getPlayerSongBests(friendCode, params)
    }
    //上传玩家成绩
    async postPlayerScores(friendCode, scores) {
        return await this.api.postPlayerScores(friendCode, scores)
    }
    //获取玩家Recent 50
    async getPlayerRecents(friendCode) {
        return await this.api.getPlayerRecents(friendCode)
    }
    //获取玩家所有最佳成绩（简化）
    async getPlayerScores(friendCode) {
        return await this.api.getPlayerScores(friendCode)
    }
    //获取玩家热力图
    async getPlayerHeatmap(friendCode) {
        return await this.api.getPlayerHeatmap(friendCode)
    }
    //获取玩家Rating趋势
    async getPlayerTrend(friendCode, version) {
        return await this.api.getPlayerTrend(friendCode, version)
    }
    //获取玩家成绩历史
    async getPlayerScoreHistory(friendCode, params) {
        return await this.api.getPlayerScoreHistory(friendCode, params)
    }
    //获取玩家收藏品进度
    async getPlayerCollection(friendCode, collectionType, collectionId) {
        return await this.api.getPlayerCollection(friendCode, collectionType, collectionId)
    }
    //上传玩家HTML数据
    async postPlayerHtml(friendCode, html) {
        return await this.api.postPlayerHtml(friendCode, html)
    }
    //个人API - 获取玩家信息
    async getUserPlayerInfo() {
        return await this.api.getUserPlayerInfo()
    }
    //个人API - 获取玩家所有成绩
    async getUserPlayerScores() {
        return await this.api.getUserPlayerScores()
    }
    //个人API - 上传玩家成绩
    async postUserPlayerScores(scores) {
        return await this.api.postUserPlayerScores(scores)
    }
    //个人API - 获取玩家成绩历史
    async getUserPlayerScoreHistory(params = {}) {
        return await this.api.getUserPlayerScoreHistory(params)
    }
    // 获取歌曲信息 正常
    async getSongInfo(songId) {
        return await this.api.getSongInfo(songId)
    }
    //获取歌曲列表
    async getSongList() {
        return await this.api.getSongList()
    }
    //获取别名列表
    async getAliasList() {
        return await this.api.getAliasList()
    }
    //获取头像列表
    async getIconList() {
        return await this.api.getIconList()
    }
    //获取姓名框列表
    async getPlateList() {
        return await this.api.getPlateList()
    }
    //获取背景框列表
    async getFrameList() {
        return await this.api.getFrameList()
    }
    //获取收藏品分类列表
    async getCollectionGenreList() {
        return await this.api.getCollectionGenreList()
    }
    //获取收藏品分类信息
    async getCollectionGenreInfo(collectionGenreId) {
        return await this.api.getCollectionGenreInfo(collectionGenreId)
    }
    //头像信息
    async getIconInfo(iconId) {
        return await this.api.getIconInfo(iconId)
    }
    //姓名框信息
    async getPlateInfo(plateId) {
        return await this.api.getPlateInfo(plateId)
    }
    //背景框信息
    async getFrameInfo(frameId) {
        return await this.api.getFrameInfo(frameId)
    }
    //通用收藏品列表
    async getCollectionList(collectionType, params = {}) {
        return await this.api.getCollectionList(collectionType, params)
    }
    //通用收藏品信息
    async getCollectionInfo(collectionType, collectionId, params = {}) {
        return await this.api.getCollectionInfo(collectionType, collectionId, params)
    }


//资源类
    // 获取资源基础 URL
    getAssetsBaseURL() {
        return this.api.getAssetsBaseURL()
    }
    // 获取 API 基础 URL
    getBaseURL() {
        return this.api.getBaseURL()
    }
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
    // 获取等级图标资源 Rate
    async getMusicRateAsset(rate) {
        return await this.api.getMusicRateAsset(rate)
    }
    //获取音乐图标资源 Fc/Fs
    async getMusicIconAsset(id) {
        return await this.api.getMusicIconAsset(id)
    }
}