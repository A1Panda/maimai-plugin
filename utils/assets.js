import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'

export class AssetsManager {
    constructor() {
        this.baseUrl = 'https://assets2.lxns.net/maimai'
        this.tempDir = './plugins/maimai-plugin/temp'
        this.cacheTime = 24 * 60 * 60 * 1000 // 24小时缓存时间
        
        // 确保临时目录存在
        this.initTempDirs()
    }

    /**
     * 初始化临时目录
     */
    initTempDirs() {
        const dirs = ['icon', 'plate', 'jacket', 'music']
        dirs.forEach(dir => {
            const dirPath = path.join(this.tempDir, dir)
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true })
            }
        })
    }

    /**
     * 获取资源URL
     * @param {string} type 资源类型
     * @param {string} id 资源ID
     * @param {string} ext 文件扩展名
     * @returns {string} 资源URL
     */
    getResourceUrl(type, id, ext) {
        return `${this.baseUrl}/${type}/${id}.${ext}`
    }

    /**
     * 下载资源
     * @param {string} url 资源URL
     * @returns {Promise<Response>} 响应
     */
    async tryDownload(url) {
        try {
            console.log(`尝试下载: ${url}`)
            const response = await fetch(url)
            if (response.ok) {
                console.log(`成功获取资源: ${url}`)
                return response
            }
            throw new Error(`获取资源失败: ${response.status} (${url})`)
        } catch (error) {
            console.error(`下载失败: ${url}`, error)
            throw error
        }
    }

    /**
     * 获取资源
     * @param {string} type 资源类型
     * @param {string} id 资源ID
     * @returns {Promise<string>} 资源本地路径
     */
    async getAsset(type, id) {
        const ext = type === 'music' ? 'mp3' : 'png'
        const filePath = path.join(this.tempDir, type, `${id}.${ext}`)

        // 检查文件是否存在且未过期
        if (await this.isValidCache(filePath)) {
            // 额外验证音频文件
            if (type === 'music' && !await this.validateAudioFile(filePath)) {
                // 如果验证失败，删除缓存文件
                fs.unlinkSync(filePath)
            } else {
                return filePath
            }
        }

        // 下载资源
        try {
            const urls = this.getResourceUrl(type, id, ext)
            const response = await this.tryDownload(urls)

            // 检查内容类型
            const contentType = response.headers.get('content-type')
            if (!contentType) {
                throw new Error('资源响应没有内容类型')
            }

            // 验证内容类型
            if (type === 'music' && !contentType.includes('audio')) {
                throw new Error(`无效的音频内容类型: ${contentType}`)
            }

            const arrayBuffer = await response.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            
            // 检查文件大小
            if (buffer.length === 0) {
                throw new Error('获取到的资源为空')
            }
            
            // 写入文件
            fs.writeFileSync(filePath, buffer)

            // 对音频文件进行额外验证
            if (type === 'music' && !await this.validateAudioFile(filePath)) {
                fs.unlinkSync(filePath)
                throw new Error('音频文件验证失败')
            }

            return filePath
        } catch (error) {
            console.error(`获取${type}资源失败:`, error)
            throw error
        }
    }

    /**
     * 检查缓存是否有效
     * @param {string} filePath 文件路径
     * @returns {Promise<boolean>} 是否有效
     */
    async isValidCache(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                return false
            }

            const stats = fs.statSync(filePath)
            const now = Date.now()
            const fileAge = now - stats.mtimeMs

            // 检查文件大小
            if (stats.size === 0) {
                fs.unlinkSync(filePath)
                return false
            }

            return fileAge < this.cacheTime
        } catch (error) {
            return false
        }
    }

    /**
     * 验证音频文件
     * @param {string} filePath 文件路径
     * @returns {Promise<boolean>} 是否有效
     */
    async validateAudioFile(filePath) {
        try {
            const stats = fs.statSync(filePath)
            // 检查文件大小是否合理（至少1KB，不超过20MB）
            if (stats.size < 1024 || stats.size > 20 * 1024 * 1024) {
                return false
            }

            // 读取文件头部来验证格式
            const fd = fs.openSync(filePath, 'r')
            const buffer = Buffer.alloc(4)
            fs.readSync(fd, buffer, 0, 4, 0)
            fs.closeSync(fd)

            // 检查MP3文件头
            const isMP3 = buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33 || // ID3v2
                         (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) // MPEG sync

            return isMP3
        } catch (error) {
            console.error('音频文件验证失败:', error)
            return false
        }
    }

    /**
     * 获取头像
     * @param {string} iconId 头像ID
     * @returns {Promise<string>} 头像本地路径
     */
    async getIcon(iconId) {
        return this.getAsset('icon', iconId)
    }

    /**
     * 获取姓名框
     * @param {string} plateId 姓名框ID
     * @returns {Promise<string>} 姓名框本地路径
     */
    async getPlate(plateId) {
        return this.getAsset('plate', plateId)
    }

    /**
     * 获取曲绘
     * @param {string} songId 歌曲ID
     * @returns {Promise<string>} 曲绘本地路径
     */
    async getJacket(songId) {
        return this.getAsset('jacket', songId)
    }

    /**
     * 获取音频
     * @param {string} songId 歌曲ID
     * @returns {Promise<string>} 音频本地路径
     */
    async getMusic(songId) {
        return this.getAsset('music', songId)
    }

    /**
     * 清理过期缓存
     */
    async cleanExpiredCache() {
        const dirs = ['icon', 'plate', 'jacket', 'music']
        
        for (const dir of dirs) {
            const dirPath = path.join(this.tempDir, dir)
            if (!fs.existsSync(dirPath)) continue

            const files = fs.readdirSync(dirPath)
            for (const file of files) {
                const filePath = path.join(dirPath, file)
                if (!(await this.isValidCache(filePath))) {
                    fs.unlinkSync(filePath)
                }
            }
        }
    }
} 