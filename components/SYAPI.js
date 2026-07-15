import fs from 'node:fs'
import yaml from 'yaml'

// 导出水鱼API类 - 完美适配水鱼 diving-fish API
export default class SYAPI {
    constructor() {
        // 从配置文件中读取API基础配置
        const config = yaml.parse(fs.readFileSync('./plugins/maimai-plugin/configs/API_Token.yaml', 'utf8'))
        // 从配置文件中读取临时文件路径
        const mainConfig = yaml.parse(fs.readFileSync('./plugins/maimai-plugin/configs/config.yaml', 'utf8'))
        this.tempPath = mainConfig.tempPath || './plugins/maimai-plugin/temp'
        this.baseURL = config.SYapi.baseURL || 'https://www.diving-fish.com'
        this.token = config.SYapi.token || ''
        this.assetsURL = config.LXapi.assetsURL || 'https://assets2.lxns.net'  // 曲绘/头像/音频用落雪CDN
        this.lxBaseURL = config.LXapi.baseURL || 'https://maimai.lxns.net'    // 评级图标等资源用落雪主站

        // 缓存 music_data
        this._musicData = null
        this._musicDataPromise = null
    }

    // 通用请求头
    _getHeaders() {
        const headers = { 'Content-Type': 'application/json' }
        return headers
    }

    // 开发者请求头（使用 Developer-Token 认证）
    _getDevHeaders() {
        const headers = { 'Content-Type': 'application/json' }
        if (this.token) {
            headers['Developer-Token'] = this.token
        }
        return headers
    }

    // 获取并缓存 music_data（水鱼API的曲目数据是前置加载的）
    async _getMusicData() {
        if (this._musicData) return this._musicData
        if (this._musicDataPromise) return this._musicDataPromise
        this._musicDataPromise = (async () => {
            const response = await fetch(`${this.baseURL}/api/maimaidxprober/music_data`, {
                headers: this._getHeaders()
            })
            if (!response.ok) throw new Error(`获取曲目数据失败: ${response.status}`)
            this._musicData = await response.json()
            return this._musicData
        })()
        return this._musicDataPromise
    }

    // 查找曲目信息
    async _findSong(songId) {
        const musicData = await this._getMusicData()
        // 水鱼API的 id 可能是字符串或数字类型
        return musicData.find(s => String(s.id) === String(songId)) || null
    }

    // ==================== 开发者API（兼容LXAPI接口） ====================

    // POST /api/v0/maimai/player - 创建或修改玩家信息（水鱼API不支持）
    async postPlayerInfo(playerData) {
        throw new Error('水鱼API不支持创建/修改玩家信息')
    }

    // 获取玩家信息 - 使用 /dev/player/records (Developer-Token)
    async getPlayerInfo(friendCode) {
        try {
            const response = await fetch(
                `${this.baseURL}/api/maimaidxprober/dev/player/records?qq=${friendCode}`,
                { headers: this._getDevHeaders() }
            )
            if (!response.ok) {
                if (response.status === 400) {
                    const errData = await response.json().catch(() => ({}))
                    throw new Error(errData.message || '请求失败: 请检查QQ号是否正确或用户是否同意第三方查询')
                }
                throw new Error(`API请求失败: ${response.status}`)
            }
            const rawData = await response.json()
            // 水鱼 /dev/player/records 返回: { nickname, rating, additional_rating, records, ... }
            const data = {
                success: true,
                code: 200,
                data: {
                    name: rawData.nickname || '',
                    rating: rawData.rating || 0,
                    friend_code: parseInt(friendCode) || 0,
                    // 水鱼API不提供trophy数据，用空值填充
                    trophy: rawData.trophy || { id: 0, name: '', color: 'Normal' },
                    course_rank: rawData.course_rank || 0,
                    class_rank: rawData.class_rank || 0,
                    star: rawData.star || 0,
                    // 水鱼API不提供icon/plate/frame数据，用空值填充
                    icon: rawData.icon || { id: 0, name: '', genre: '' },
                    name_plate: rawData.name_plate || { id: 0, name: '', genre: '' },
                    frame: rawData.frame || { id: 0, name: '', genre: '' },
                    upload_time: rawData.upload_time || ''
                }
            }
            return data
        } catch (error) {
            logger.error(`[SYAPI] 获取玩家信息失败: ${error}`)
            throw error
        }
    }

    // 通过QQ获取玩家信息
    async getPlayerInfoByQQ(qq) {
        // 水鱼API本身就是基于QQ查询，直接使用
        return await this.getPlayerInfo(qq)
    }

    // 获取玩家缓存单曲最佳成绩
    async getPlayerBest(friendCode, params = {}) {
        try {
            if (!params.song_id && !params.song_name) {
                throw new Error('必须提供 song_id 或 song_name 参数')
            }
            // 水鱼API返回所有records，需要本地筛选
            const allRecords = await this._getAllRecords(friendCode)
            const musicData = await this._getMusicData()

            let targetSongId = params.song_id
            if (params.song_name) {
                // 按曲名查找
                const song = musicData.find(s => s.title === params.song_name)
                if (!song) throw new Error(`未找到曲目: ${params.song_name}`)
                targetSongId = song.id
            }

            const levelIndex = params.level_index !== undefined ? params.level_index : 0
            const dxScore = allRecords.find(s =>
                String(s.song_id) === String(targetSongId) && s.level_index === levelIndex
            )

            if (!dxScore) {
                return {
                    code: 200,
                    data: {
                        id: 0, song_name: '', achievements: 0, fc: '', fs: '',
                        dx_score: 0, dx_star: 0, dx_rating: 0, rate: '',
                        play_time: '', type: '', level: '', level_index: 0, upload_time: ''
                    }
                }
            }

            const song = await this._findSong(targetSongId)
            const levelLabel = song?.level?.[levelIndex] || ''

            return {
                code: 200,
                data: {
                    id: targetSongId,
                    song_name: song?.title || '',
                    level: levelLabel,
                    level_index: levelIndex,
                    achievements: dxScore.achievements || 0,
                    fc: dxScore.fc || '',
                    fs: dxScore.fs || '',
                    dx_score: dxScore.dxScore || 0,
                    dx_star: dxScore.dx_ranking_star || 0,
                    dx_rating: dxScore.ra || 0,
                    rate: dxScore.rate || '',
                    type: dxScore.type || '',
                    play_time: dxScore.play_time || '',
                    upload_time: dxScore.upload_time || ''
                }
            }
        } catch (error) {
            logger.error(`[SYAPI] 获取玩家最佳成绩失败: ${error}`)
            throw error
        }
    }

    // 获取玩家所有 records（使用 Developer-Token）
    async _getAllRecords(friendCode) {
        try {
            const response = await fetch(
                `${this.baseURL}/api/maimaidxprober/dev/player/records?qq=${friendCode}`,
                { headers: this._getDevHeaders() }
            )
            if (!response.ok) {
                // 400 可能是用户不存在或隐私设置
                if (response.status === 400) return []
                throw new Error(`API请求失败: ${response.status}`)
            }
            const data = await response.json()
            return data.records || []
        } catch (error) {
            logger.error(`[SYAPI] 获取玩家所有成绩失败: ${error}`)
            throw error
        }
    }

    // 获取玩家 Best 50
    async getPlayerBest50(friendCode) {
        try {
            const allRecords = await this._getAllRecords(friendCode)
            const musicData = await this._getMusicData()

            const standard = []
            const dx = []

            for (const record of allRecords) {
                const song = musicData.find(s => String(s.id) === String(record.song_id))
                if (!song) continue
                const score = {
                    id: record.song_id,
                    song_name: song.title || '',
                    level: song.level?.[record.level_index] || '',
                    level_index: record.level_index || 0,
                    achievements: record.achievements || 0,
                    fc: record.fc || '',
                    fs: record.fs || '',
                    dx_score: record.dxScore || 0,
                    dx_star: record.dx_ranking_star || 0,
                    dx_rating: record.ra || 0,
                    rate: record.rate || '',
                    type: record.type || song.type || '',
                    play_time: record.play_time || '',
                    upload_time: record.upload_time || ''
                }
                if (song.type === 'SD') {
                    standard.push(score)
                } else {
                    dx.push(score)
                }
            }

            // 按 dx_rating 降序排序
            const sortByRating = (a, b) => b.dx_rating - a.dx_rating
            standard.sort(sortByRating)
            dx.sort(sortByRating)

            // 计算total：水鱼API中ra就是单曲rating，取前35首标准+前15首DX
            const topStandard = standard.slice(0, 35)
            const topDx = dx.slice(0, 15)

            return {
                code: 200,
                data: {
                    standard_total: topStandard.reduce((sum, s) => sum + s.dx_rating, 0),
                    dx_total: topDx.reduce((sum, s) => sum + s.dx_rating, 0),
                    standard: topStandard,
                    dx: topDx,
                    standard_selections: standard.slice(35, 45),
                    dx_selections: dx.slice(15, 25)
                }
            }
        } catch (error) {
            logger.error(`[SYAPI] 获取玩家Best 50失败: ${error}`)
            throw error
        }
    }

    // 获取玩家 AP 50
    async getPlayerAP50(friendCode) {
        try {
            const allRecords = await this._getAllRecords(friendCode)
            const musicData = await this._getMusicData()

            const apRecords = allRecords.filter(r => r.fc === 'app' || r.fc === 'ap')
            const standard = []
            const dx = []

            for (const record of apRecords) {
                const song = musicData.find(s => String(s.id) === String(record.song_id))
                if (!song) continue
                const score = {
                    id: record.song_id,
                    song_name: song.title || '',
                    level: song.level?.[record.level_index] || '',
                    level_index: record.level_index || 0,
                    achievements: record.achievements || 0,
                    fc: record.fc || '',
                    fs: record.fs || '',
                    dx_score: record.dxScore || 0,
                    dx_star: record.dx_ranking_star || 0,
                    dx_rating: record.ra || 0,
                    rate: record.rate || '',
                    type: record.type || song.type || '',
                    play_time: record.play_time || '',
                    upload_time: record.upload_time || ''
                }
                if (song.type === 'SD') standard.push(score)
                else dx.push(score)
            }

            return {
                code: 200,
                data: {
                    standard_total: standard.reduce((sum, s) => sum + s.dx_rating, 0),
                    dx_total: dx.reduce((sum, s) => sum + s.dx_rating, 0),
                    standard,
                    dx
                }
            }
        } catch (error) {
            logger.error(`[SYAPI] 获取玩家AP 50失败: ${error}`)
            throw error
        }
    }

    // 获取玩家单曲所有谱面成绩
    async getPlayerSongBests(friendCode, params = {}) {
        try {
            const allRecords = await this._getAllRecords(friendCode)
            const musicData = await this._getMusicData()

            let targetSongId = params.song_id
            if (params.song_name) {
                const song = musicData.find(s => s.title === params.song_name)
                if (!song) throw new Error(`未找到曲目: ${params.song_name}`)
                targetSongId = song.id
            }

            const result = allRecords
                .filter(r => String(r.song_id) === String(targetSongId))
                .map(record => {
                    const song = musicData.find(s => String(s.id) === String(record.song_id))
                    return {
                        id: record.song_id,
                        song_name: song?.title || '',
                        level: song?.level?.[record.level_index] || '',
                        level_index: record.level_index || 0,
                        achievements: record.achievements || 0,
                        fc: record.fc || '',
                        fs: record.fs || '',
                        dx_score: record.dxScore || 0,
                        dx_star: record.dx_ranking_star || 0,
                        dx_rating: record.ra || 0,
                        rate: record.rate || '',
                        type: record.type || '',
                        play_time: record.play_time || '',
                        upload_time: record.upload_time || ''
                    }
                })

            return { code: 200, data: result }
        } catch (error) {
            logger.error(`[SYAPI] 获取玩家单曲成绩失败: ${error}`)
            throw error
        }
    }

    // 上传玩家成绩 - 水鱼API不支持通过开发者API上传
    async postPlayerScores(friendCode, scores) {
        throw new Error('水鱼API不支持上传玩家成绩')
    }

    // 获取玩家 Recent 50
    async getPlayerRecents(friendCode) {
        try {
            const allRecords = await this._getAllRecords(friendCode)
            const musicData = await this._getMusicData()

            // 按 play_time 排序取最近50条
            const sorted = [...allRecords].sort((a, b) => {
                return (b.play_time || '').localeCompare(a.play_time || '')
            })

            return {
                code: 200,
                data: sorted.slice(0, 50).map(record => {
                    const song = musicData.find(s => String(s.id) === String(record.song_id))
                    return {
                        id: record.song_id,
                        song_name: song?.title || '',
                        level: song?.level?.[record.level_index] || '',
                        level_index: record.level_index || 0,
                        achievements: record.achievements || 0,
                        fc: record.fc || '',
                        fs: record.fs || '',
                        dx_score: record.dxScore || 0,
                        dx_star: record.dx_ranking_star || 0,
                        dx_rating: record.ra || 0,
                        rate: record.rate || '',
                        type: record.type || song?.type || '',
                        play_time: record.play_time || '',
                        upload_time: record.upload_time || ''
                    }
                })
            }
        } catch (error) {
            logger.error(`[SYAPI] 获取玩家Recent 50失败: ${error}`)
            throw error
        }
    }

    // 获取玩家所有最佳成绩（简化）
    async getPlayerScores(friendCode) {
        try {
            const allRecords = await this._getAllRecords(friendCode)
            const musicData = await this._getMusicData()

            return {
                code: 200,
                data: allRecords.map(record => {
                    const song = musicData.find(s => String(s.id) === String(record.song_id))
                    return {
                        id: record.song_id,
                        song_name: song?.title || '',
                        level: song?.level?.[record.level_index] || '',
                        level_index: record.level_index || 0,
                        fc: record.fc || '',
                        fs: record.fs || '',
                        rate: record.rate || '',
                        type: record.type || song?.type || ''
                    }
                })
            }
        } catch (error) {
            logger.error(`[SYAPI] 获取玩家所有成绩失败: ${error}`)
            throw error
        }
    }

    // 以下功能水鱼API不支持
    async getPlayerHeatmap(friendCode) {
        throw new Error('水鱼API不支持热力图功能')
    }

    async getPlayerTrend(friendCode, version = null) {
        throw new Error('水鱼API不支持Rating趋势功能')
    }

    async getPlayerScoreHistory(friendCode, params = {}) {
        throw new Error('水鱼API不支持成绩历史功能')
    }

    // 获取玩家版本牌子数据（水鱼 /query_plate 需要 Developer-Token）
    async getPlayerCollection(friendCode, collectionType, collectionId) {
        try {
            const response = await fetch(`${this.baseURL}/api/maimaidxprober/query/plate`, {
                method: 'POST',
                headers: this._getDevHeaders(),
                body: JSON.stringify({ qq: parseInt(friendCode), version: [] })
            })
            if (!response.ok) throw new Error(`API请求失败: ${response.status}`)
            return await response.json()
        } catch (error) {
            logger.error(`[SYAPI] 获取玩家版本牌子失败: ${error}`)
            throw error
        }
    }

    async postPlayerHtml(friendCode, html) {
        throw new Error('水鱼API不支持HTML上传')
    }

    // ==================== 个人API ====================
    async getUserPlayerInfo() {
        throw new Error('水鱼API不支持个人API - 请使用 getPlayerInfo 并提供 QQ')
    }

    async getUserPlayerScores() {
        throw new Error('水鱼API不支持个人API')
    }

    async postUserPlayerScores(scores) {
        throw new Error('水鱼API不支持上传成绩')
    }

    async getUserPlayerScoreHistory(params = {}) {
        throw new Error('水鱼API不支持成绩历史')
    }

    // ==================== 公共API ====================

    // 获取曲目列表（从缓存的 music_data 构建）
    async getSongList(params = {}) {
        try {
            const musicData = await this._getMusicData()
            const songs = musicData.map(s => ({
                id: s.id,
                title: s.title,
                artist: s.basic_info?.artist || '',
                genre: s.basic_info?.genre || '',
                bpm: s.basic_info?.bpm || 0,
                version: s.basic_info?.from || '',
                type: s.type
            }))
            return { songs, genres: [], versions: [] }
        } catch (error) {
            logger.error(`[SYAPI] 获取曲目列表失败: ${error}`)
            throw error
        }
    }

    // 获取曲目信息
    async getSongInfo(songId, params = {}) {
        try {
            const song = await this._findSong(songId)
            if (!song) throw new Error(`未找到曲目: ${songId}`)

            const difficulties = { standard: [], dx: [], utage: [] }

            // 解析谱面数据
            for (let i = 0; i < 5; i++) {
                if (!song.ds[i]) continue
                const diff = {
                    type: song.type === 'SD' ? 'standard' : 'dx',
                    difficulty: i,
                    level: song.level[i] || '',
                    level_value: song.ds[i] || 0,
                    note_designer: song.charts[i]?.charter || '',
                    version: 0,
                    notes: song.charts[i]?.notes ? {
                        total: song.charts[i].notes.reduce((a, b) => a + b, 0),
                        tap: song.charts[i].notes[0] || 0,
                        hold: song.charts[i].notes[1] || 0,
                        slide: song.charts[i].notes[2] || 0,
                        touch: song.charts[i].notes[3] || 0,
                        break: song.charts[i].notes[4] || 0
                    } : null
                }

                if (song.type === 'SD') {
                    difficulties.standard.push(diff)
                } else {
                    difficulties.dx.push(diff)
                }
            }

            return {
                id: song.id,
                title: song.title,
                artist: song.basic_info?.artist || '',
                genre: song.basic_info?.genre || '',
                bpm: song.basic_info?.bpm || 0,
                map: null,
                version: 0,
                rights: null,
                locked: false,
                disabled: false,
                difficulties
            }
        } catch (error) {
            logger.error(`[SYAPI] 获取曲目信息失败: ${error}`)
            throw error
        }
    }

    // 获取别名列表（从 music_data 中提取）
    async getAliasList() {
        try {
            const musicData = await this._getMusicData()
            const aliases = []
            for (const song of musicData) {
                if (song.basic_info?.aliases) {
                    aliases.push({ song_id: song.id, aliases: song.basic_info.aliases })
                }
            }
            return { aliases }
        } catch (error) {
            logger.error(`[SYAPI] 获取别名列表失败: ${error}`)
            throw error
        }
    }

    // ==================== 收藏品列表（水鱼不直接支持，返回空数据保证别名解析器不崩溃） ====================

    async getIconList() {
        // 水鱼API不支持头像列表，返回空数据避免别名解析器崩溃
        logger.warn('[SYAPI] 水鱼API不支持头像列表，返回空数据')
        return { icons: [] }
    }

    async getIconInfo(iconId) {
        throw new Error('水鱼API不支持头像信息 - 请使用落雪API')
    }

    async getPlateList() {
        // 水鱼API不支持姓名框列表，返回空数据避免别名解析器崩溃
        logger.warn('[SYAPI] 水鱼API不支持姓名框列表，返回空数据')
        return { plates: [] }
    }

    async getPlateInfo(plateId) {
        throw new Error('水鱼API不支持姓名框信息 - 请使用落雪API')
    }

    async getFrameList() {
        // 水鱼API不支持背景框列表，返回空数据避免别名解析器崩溃
        logger.warn('[SYAPI] 水鱼API不支持背景框列表，返回空数据')
        return { frames: [] }
    }

    async getFrameInfo(frameId) {
        throw new Error('水鱼API不支持背景框信息 - 请使用落雪API')
    }

    async getCollectionGenreList() {
        throw new Error('水鱼API不支持收藏品分类列表 - 请使用落雪API')
    }

    async getCollectionGenreInfo(collectionGenreId) {
        throw new Error('水鱼API不支持收藏品分类信息 - 请使用落雪API')
    }

    async getCollectionList(collectionType, params = {}) {
        throw new Error('水鱼API不支持通用收藏品列表 - 请使用落雪API')
    }

    async getCollectionInfo(collectionType, collectionId, params = {}) {
        throw new Error('水鱼API不支持通用收藏品信息 - 请使用落雪API')
    }

    // ==================== 资源类（复用落雪CDN） ====================

    getAssetsBaseURL() {
        return `${this.assetsURL}/maimai`
    }

    getBaseURL() {
        return this.baseURL
    }

    async fetchAssetWithRetry(url, retries = 3, timeout = 15000) {
        for (let i = 0; i < retries; i++) {
            try {
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), timeout)
                const response = await fetch(url, { signal: controller.signal })
                clearTimeout(timeoutId)
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
                return await response.arrayBuffer()
            } catch (error) {
                logger.warn(`[maimai-plugin] 第${i + 1}次获取资源失败: ${url}`)
                if (i === retries - 1) throw new Error(`获取资源失败: ${url}, 已重试${retries}次`)
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
            }
        }
    }

    async getIconAsset(iconId) {
        const path = `${this.tempPath}/LX_assets/icons/${iconId}.png`
        if (!fs.existsSync(path)) {
            const url = `${this.assetsURL}/maimai/icon/${iconId}.png`
            const buffer = await this.fetchAssetWithRetry(url)
            await fs.promises.mkdir(`${this.tempPath}/LX_assets/icons`, { recursive: true })
            await fs.promises.writeFile(path, Buffer.from(buffer))
        }
        return path
    }

    async getPlateAsset(plateId) {
        const path = `${this.tempPath}/LX_assets/plates/${plateId}.png`
        if (!fs.existsSync(path)) {
            const url = `${this.assetsURL}/maimai/plate/${plateId}.png`
            const buffer = await this.fetchAssetWithRetry(url)
            await fs.promises.mkdir(`${this.tempPath}/LX_assets/plates`, { recursive: true })
            await fs.promises.writeFile(path, Buffer.from(buffer))
        }
        return path
    }

    async getJacketAsset(songId) {
        const path = `${this.tempPath}/LX_assets/jackets/${songId}.png`
        if (!fs.existsSync(path)) {
            try {
                const url = `${this.assetsURL}/maimai/jacket/${songId}.png`
                const buffer = await this.fetchAssetWithRetry(url)
                await fs.promises.mkdir(`${this.tempPath}/LX_assets/jackets`, { recursive: true })
                await fs.promises.writeFile(path, Buffer.from(buffer))
            } catch (error) {
                logger.error(`[maimai-plugin] 获取曲绘资源失败: ${songId}`)
                const defaultPath = './plugins/maimai-plugin/resources/assets/default_jacket.png'
                if (fs.existsSync(defaultPath)) return defaultPath
                throw error
            }
        }
        return path
    }

    async getMusicAsset(songId) {
        const path = `${this.tempPath}/LX_assets/music/${songId}.mp3`
        if (!fs.existsSync(path)) {
            const url = `${this.assetsURL}/maimai/music/${songId}.mp3`
            const buffer = await this.fetchAssetWithRetry(url)
            await fs.promises.mkdir(`${this.tempPath}/LX_assets/music`, { recursive: true })
            await fs.promises.writeFile(path, Buffer.from(buffer))
        }
        return path
    }

    async getClassRankAsset(id) {
        const path = `${this.tempPath}/LX_assets/class_rank/${id}.webp`
        if (!fs.existsSync(path)) {
            const url = `${this.lxBaseURL}/assets/maimai/class_rank/${id}.webp`
            const buffer = await this.fetchAssetWithRetry(url)
            await fs.promises.mkdir(`${this.tempPath}/LX_assets/class_rank`, { recursive: true })
            await fs.promises.writeFile(path, Buffer.from(buffer))
        }
        return path
    }

    async getCourseRankAsset(id) {
        const path = `${this.tempPath}/LX_assets/course_rank/${id}.webp`
        if (!fs.existsSync(path)) {
            const url = `${this.lxBaseURL}/assets/maimai/course_rank/${id}.webp`
            const buffer = await this.fetchAssetWithRetry(url)
            await fs.promises.mkdir(`${this.tempPath}/LX_assets/course_rank`, { recursive: true })
            await fs.promises.writeFile(path, Buffer.from(buffer))
        }
        return path
    }

    async getMusicRateAsset(rate) {
        const path = `${this.tempPath}/LX_assets/music_rank/${rate}.webp`
        if (!fs.existsSync(path)) {
            const url = `${this.lxBaseURL}/assets/maimai/music_rank/${rate}.webp`
            const buffer = await this.fetchAssetWithRetry(url)
            await fs.promises.mkdir(`${this.tempPath}/LX_assets/music_rank`, { recursive: true })
            await fs.promises.writeFile(path, Buffer.from(buffer))
        }
        return path
    }

    async getMusicIconAsset(type) {
        const validTypes = ['fcp', 'fc', 'app', 'ap', 'fsdp', 'fsd', 'fsp', 'fs', 'sync']
        if (!validTypes.includes(type)) return null
        const path = `${this.tempPath}/LX_assets/music_icon/${type}.webp`
        if (!fs.existsSync(path)) {
            try {
                const url = `${this.lxBaseURL}/assets/maimai/music_icon/${type}.webp`
                const buffer = await this.fetchAssetWithRetry(url)
                await fs.promises.mkdir(`${this.tempPath}/LX_assets/music_icon`, { recursive: true })
                await fs.promises.writeFile(path, Buffer.from(buffer))
            } catch (error) {
                logger.error(`[maimai-plugin] 获取音乐图标失败: ${type}`)
                return null
            }
        }
        return path
    }
}
