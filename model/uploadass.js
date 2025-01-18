import fs from 'fs'
import yaml from 'yaml'
import APIAdapter from '../components/Adapter.js'

export class UploadAssets {
    constructor() {
        this.userDataPath = './plugins/maimai-plugin/configs/userdata.yaml'
    }

    // 获取用户数据
    getUserData() {
        try {
            if (!fs.existsSync(this.userDataPath)) {
                return {}
            }
            const data = fs.readFileSync(this.userDataPath, 'utf8')
            return yaml.parse(data) || {}
        } catch (err) {
            logger.error('[maimai-plugin] 读取用户数据失败')
            logger.error(err)
            return {}
        }
    }

    //搜索上传用
    async uploadSearch(type, id) {
        logger.info(`[maimai-plugin] 上传搜索资源: ${type} -> ${id}`)
        if (type === 'song') {
            return await this.getMusicAsset(parseInt(id))
        }
        if (type === 'name') {
            return await this.getPlateAsset(parseInt(id))
        }
        if (type === 'avatar') {
            return await this.getIconAsset(parseInt(id))
        }
        if (type === 'jacket') {
            return await this.getJacketAsset(parseInt(id))
        }
        return null
    }

    // 获取歌曲曲绘
    async getJacketAsset(songId) {
        try {
            const adapter = new APIAdapter()
            return await adapter.getJacketAsset(songId)
        } catch (err) {
            logger.error('[maimai-plugin] 获取歌曲封面失败')
            logger.error(err)
            return null
        }
    }

    // 获取头像框
    async getIconAsset(iconId) {
        try {
            const adapter = new APIAdapter()
            return await adapter.getIconAsset(iconId)
        } catch (err) {
            logger.error('[maimai-plugin] 获取头像框失败')
            logger.error(err)
            return null
        }
    }

    // 获取姓名框
    async getPlateAsset(plateId) {
        try {
            const adapter = new APIAdapter()
            return await adapter.getPlateAsset(plateId)
        } catch (err) {
            logger.error('[maimai-plugin] 获取姓名框失败')
            logger.error(err)
            return null
        }
    }

    // 获取歌曲
    async getMusicAsset(songId) {
        try {
            const adapter = new APIAdapter()
            return await adapter.getMusicAsset(songId)
        } catch (err) {
            logger.error('[maimai-plugin] 获取歌曲失败')
            logger.error(err)
            return null
        }
    }
}

export const uploadAssets = new UploadAssets()
