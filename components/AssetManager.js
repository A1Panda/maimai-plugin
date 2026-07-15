import fs from 'node:fs'
import yaml from 'yaml'

/**
 * 统一资源管理器 — 负责所有资源的下载、缓存、base64 转换
 * 单例模式，b50.js 和各 adapter 共用同一个实例
 */
class AssetManager {
    constructor() {
        // 读取配置
        let mainConfig = {}
        try {
            mainConfig = yaml.parse(fs.readFileSync('./plugins/maimai-plugin/configs/config.yaml', 'utf8')) || {}
        } catch {}

        this.tempPath = mainConfig.tempPath || './plugins/maimai-plugin/temp'

        // 资源定义：类型 → [URL模板, ...]
        // 先尝试 assets2（无WAF），再尝试落雪主站，辅以水鱼 CDN
        this.sources = {
            jacket: [
                'https://assets2.lxns.net/maimai/jacket/{id}.png',
                'https://maimai.diving-fish.com/covers/{id}.png',
                'https://maimai.lxns.net/assets/maimai/jacket/{id}.png',
            ],
            icon:       ['https://assets2.lxns.net/maimai/icon/{id}.png'],
            plate:      ['https://assets2.lxns.net/maimai/plate/{id}.png'],
            frame:      ['https://assets2.lxns.net/maimai/frame/{id}.png'],
            music:      ['https://assets2.lxns.net/maimai/music/{id}.mp3'],
            class_rank:  ['https://maimai.lxns.net/assets/maimai/class_rank/{id}.webp'],
            course_rank: ['https://maimai.lxns.net/assets/maimai/course_rank/{id}.webp'],
            music_rate:  ['https://maimai.lxns.net/assets/maimai/music_rank/{id}.webp'],
            music_icon:  ['https://maimai.lxns.net/assets/maimai/music_icon/{id}.webp'],
        }

        // 缓存子目录
        this.cacheDirs = {
            jacket:      'LX_assets/jackets',
            icon:        'LX_assets/icons',
            plate:       'LX_assets/plates',
            frame:       'LX_assets/frames',
            music:       'LX_assets/music',
            class_rank:  'LX_assets/class_rank',
            course_rank: 'LX_assets/course_rank',
            music_rate:  'LX_assets/music_rank',
            music_icon:  'LX_assets/music_icon',
        }

        // 文件扩展名
        this.extensions = {
            jacket: 'png', icon: 'png', plate: 'png', frame: 'png',
            music: 'mp3',
            class_rank: 'webp', course_rank: 'webp',
            music_rate: 'webp', music_icon: 'webp',
        }
    }

    // ==================== 公开方法 ====================

    /**
     * 获取资源本地文件路径（下载 + 缓存）
     * @param {string} type - 资源类型
     * @param {string|number} id - 资源ID
     * @returns {Promise<string>} 本地文件路径
     */
    async getAsset(type, id) {
        const cacheDir = `${this.tempPath}/${this.cacheDirs[type]}`
        const ext = this.extensions[type]
        const cachePath = `${cacheDir}/${id}.${ext}`

        // 命中缓存
        if (fs.existsSync(cachePath)) return cachePath

        // 多源下载
        const urls = this.sources[type].map(u => u.replace('{id}', String(id)))
        for (const url of urls) {
            try {
                const buffer = await this._fetch(url)
                await fs.promises.mkdir(cacheDir, { recursive: true })
                await fs.promises.writeFile(cachePath, buffer)
                return cachePath
            } catch (e) {
                logger.debug(`[AssetManager] ${type}/${id} 下载失败: ${url} - ${e.message}`)
            }
        }

        throw new Error(`资源获取失败: ${type}/${id}`)
    }

    /**
     * 获取资源并转为 base64 data URI（给 Puppeteer 渲染用）
     * @param {string} type
     * @param {string|number} id
     * @returns {Promise<string>} data URI，失败返回空字符串
     */
    async getAssetAsBase64(type, id) {
        try {
            const path = await this.getAsset(type, id)
            return this._fileToBase64(path, this.extensions[type])
        } catch {
            return ''
        }
    }

    // ==================== 内部方法 ====================

    /** 带重试和内容校验的 HTTP 下载 */
    async _fetch(url, retries = 3, timeout = 10000) {
        for (let i = 0; i < retries; i++) {
            try {
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), timeout)
                const resp = await fetch(url, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'image/*,audio/*,*/*;q=0.5',
                        'Referer': 'https://maimai.lxns.net/',
                    },
                })
                clearTimeout(timeoutId)

                if (!resp.ok) {
                    const err = new Error(`HTTP ${resp.status}`)
                    err.status = resp.status
                    if (resp.status >= 400 && resp.status < 500) err.noRetry = true
                    throw err
                }

                const contentType = (resp.headers.get('content-type') || '').toLowerCase()
                if (!contentType.startsWith('image/') && !contentType.startsWith('audio/')) {
                    throw new Error(`非媒体响应: ${contentType}`)
                }

                return Buffer.from(await resp.arrayBuffer())
            } catch (error) {
                if (error.noRetry) throw error
                if (i === retries - 1) throw error
                logger.debug(`[AssetManager] 第${i + 1}次重试: ${url}`)
                await new Promise(r => setTimeout(r, 1000 * (i + 1)))
            }
        }
    }

    /** 本地文件 → base64 data URI */
    _fileToBase64(filePath, ext) {
        const mimeMap = { png: 'image/png', webp: 'image/webp', mp3: 'audio/mpeg' }
        const mime = mimeMap[ext] || 'image/png'
        return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`
    }
}

// 单例导出
const assetManager = new AssetManager()
export default assetManager
