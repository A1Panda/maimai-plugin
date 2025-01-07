import fetch from 'node-fetch'

export class MaimaiAssetInfo {
    constructor() {
        this.baseUrl = 'https://maimai.lxns.net/api/v0/maimai'
    }

    /**
     * 发送API请求的通用方法
     * @param {string} endpoint API端点
     * @param {string} errorMessage 错误信息
     * @returns {Promise<Object>} API响应数据
     * @private
     */
    async _makeRequest(endpoint, errorMessage) {
        try {
            console.log(`正在请求API: ${this.baseUrl}${endpoint}`)
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            })

            // 尝试解析响应体
            let responseBody
            try {
                responseBody = await response.text()
                console.log('原始响应数据:', responseBody)
            } catch (e) {
                console.error('读取响应体失败:', e)
                responseBody = '无法读取响应内容'
            }

            // 检查HTTP状态
            if (!response.ok) {
                throw new Error(`API请求失败(${response.status}): ${responseBody}`)
            }

            // 尝试解析JSON
            let data
            try {
                data = JSON.parse(responseBody)
                console.log('解析后的响应数据:', JSON.stringify(data, null, 2))
            } catch (e) {
                console.error('JSON解析失败:', e)
                throw new Error(`响应数据不是有效的JSON格式: ${responseBody.substring(0, 100)}...`)
            }

            // 检查数据格式
            if (!data || typeof data !== 'object') {
                throw new Error('API响应格式错误：响应不是一个对象')
            }

            // 检查API错误信息
            if (data.error) {
                throw new Error(`API错误: ${data.error}`)
            }

            // 检查success字段
            if (data.success === false) {
                throw new Error(data.message || '获取数据失败：API返回失败状态')
            }

            // 检查并返回数据
            if (data.data === undefined) {
                // 如果data字段不存在，但整个响应看起来是有效的数据，直接返回整个响应
                return {
                    success: true,
                    data: data
                }
            }

            return {
                success: true,
                data: data.data
            }
        } catch (error) {
            console.error(`${errorMessage}:`, error)
            throw new Error(`${errorMessage}: ${error.message}`)
        }
    }

    /**
     * 获取歌曲详细信息
     * @param {string} id 歌曲ID
     * @returns {Promise<Object>} 歌曲信息
     */
    async getSongInfo(id) {
        return this._makeRequest(`/song/${id}`, '获取歌曲信息失败')
    }

    /**
     * 获取头像详细信息
     * @param {string} id 头像ID
     * @returns {Promise<Object>} 头像信息
     */
    async getIconInfo(id) {
        return this._makeRequest(`/icon/${id}`, '获取头像信息失败')
    }

    /**
     * 获取姓名框详细信息
     * @param {string} id 姓名框ID
     * @returns {Promise<Object>} 姓名框信息
     */
    async getPlateInfo(id) {
        return this._makeRequest(`/plate/${id}`, '获取姓名框信息失败')
    }

    /**
     * 获取背景框详细信息
     * @param {string} id 背景框ID
     * @returns {Promise<Object>} 背景框信息
     */
    async getFrameInfo(id) {
        return this._makeRequest(`/frame/${id}`, '获取背景框信息失败')
    }

    /**
     * 获取收藏品分类信息
     * @param {string} id 收藏品分类ID
     * @returns {Promise<Object>} 收藏品分类信息
     */
    async getCollectionGenreInfo(id) {
        return this._makeRequest(`/collection-genre/${id}`, '获取收藏品分类信息失败')
    }
} 