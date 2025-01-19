import APIAdapter from '../components/Adapter.js'

class MaimaiAliasResolver {
    constructor() {
        this.songList = null
        this.aliasList = null
        this.plateList = null
        this.iconList = null
        this.frameList = null
        this.songMap = new Map()  // songId -> song
        this.aliasMap = new Map() // alias -> songId
        this.plateMap = new Map() // plateId -> plate
        this.iconMap = new Map()  // iconId -> icon
        this.frameMap = new Map() // frameId -> frame
    }

    // 初始化数据
    async init() {
        const startTime = process.hrtime()
        
        try {
            const adapter = new APIAdapter()
            
            // 获取歌曲列表
            logger.mark(logger.yellow('[maimai-plugin] 正在获取歌曲列表...'))
            const songListResponse = await adapter.getSongList()
            this.songList = songListResponse.songs
            
            // 获取别名列表
            logger.mark(logger.yellow('[maimai-plugin] 正在获取别名列表...'))
            const aliasListResponse = await adapter.getAliasList()
            this.aliasList = aliasListResponse.aliases
            
            // 获取姓名框列表
            logger.mark(logger.yellow('[maimai-plugin] 正在获取姓名框列表...'))
            const plateListResponse = await adapter.getPlateList()
            this.plateList = plateListResponse.plates
            
            // 获取头像列表
            logger.mark(logger.yellow('[maimai-plugin] 正在获取头像列表...'))
            const iconListResponse = await adapter.getIconList()
            this.iconList = iconListResponse.icons
            
            // 获取背景框列表
            logger.mark(logger.yellow('[maimai-plugin] 正在获取背景框列表...'))
            const frameListResponse = await adapter.getFrameList()
            this.frameList = frameListResponse.frames
            
            // 构建映射
            logger.mark(logger.yellow('[maimai-plugin] 正在构建数据映射...'))
            this.buildMaps()
            
            // 计算总耗时
            const endTime = process.hrtime(startTime)
            const loadTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2)
            
            // 输出统计信息
            logger.mark(logger.green('[maimai-plugin] 数据初始化完成'))
            logger.mark(logger.green(`[maimai-plugin] 歌曲数量: ${this.songList.length}`))
            logger.mark(logger.green(`[maimai-plugin] 别名数量: ${this.aliasList.length}`))
            logger.mark(logger.green(`[maimai-plugin] 姓名框数量: ${this.plateList.length}`))
            logger.mark(logger.green(`[maimai-plugin] 头像数量: ${this.iconList.length}`))
            logger.mark(logger.green(`[maimai-plugin] 背景框数量: ${this.frameList.length}`))
            logger.mark(logger.green(`[maimai-plugin] 数据初始化耗时: ${loadTime}ms`))
            
            return true
        } catch (err) {
            logger.error('[maimai-plugin] 初始化别名解析器失败')
            logger.error(err)
            return false
        }
    }

    // 构建映射关系
    buildMaps() {
        // 构建歌曲ID映射
        for (const song of this.songList) {
            this.songMap.set(song.id, song)
            // 将原始标题也作为别名
            this.aliasMap.set(song.title.toLowerCase(), song.id)
        }
        
        // 构建别名映射
        for (const alias of this.aliasList) {
            for (const name of alias.aliases) {
                this.aliasMap.set(name.toLowerCase(), alias.song_id)
            }
        }
        
        // 构建姓名框映射
        for (const plate of this.plateList) {
            this.plateMap.set(plate.id, plate)
        }
        
        // 构建头像映射
        for (const icon of this.iconList) {
            this.iconMap.set(icon.id, icon)
            // 将名称和描述也加入搜索映射
            this.iconMap.set(icon.name.toLowerCase(), icon)
            this.iconMap.set(icon.description.toLowerCase(), icon)
            this.iconMap.set(icon.genre.toLowerCase(), icon)
        }
        
        // 构建背景框映射
        for (const frame of this.frameList) {
            this.frameMap.set(frame.id, frame)
            // 将名称和描述也加入搜索映射
            this.frameMap.set(frame.name.toLowerCase(), frame)
            this.frameMap.set(frame.description.toLowerCase(), frame)
        }
    }

    // 搜索姓名框
    searchPlate(keyword) {
        // 确保已初始化
        if (!this.plateList) {
            return null
        }
        
        keyword = keyword.toLowerCase()
        
        // 1. 尝试通过ID搜索
        if (/^\d+$/.test(keyword)) {
            const id = parseInt(keyword)
            return this.plateMap.get(id)
        }
        
        // 2. 模糊匹配名称和描述
        for (const plate of this.plateList) {
            if (plate.name.toLowerCase().includes(keyword) ||
                plate.description.toLowerCase().includes(keyword) ||
                plate.genre.toLowerCase().includes(keyword)) {
                return plate
            }
        }
        
        return null
    }

    // 搜索歌曲
    searchSong(keyword) {
        // 确保已初始化
        if (!this.songList || !this.aliasList) {
            return null
        }
        
        keyword = keyword.toLowerCase()
        
        // 1. 精确匹配别名
        if (this.aliasMap.has(keyword)) {
            const songId = this.aliasMap.get(keyword)
            return this.songMap.get(songId)
        }
        
        // 2. 模糊匹配歌曲名
        for (const [title, songId] of this.aliasMap) {
            if (title.includes(keyword)) {
                return this.songMap.get(songId)
            }
        }
        
        return null
    }

    // 搜索头像
    searchIcon(keyword) {
        // 确保已初始化
        if (!this.iconList) {
            return null
        }
        
        // 1. 尝试通过ID搜索
        if (/^\d+$/.test(keyword)) {
            const id = parseInt(keyword)
            const icon = this.iconMap.get(id)
            if (icon) {
                return icon
            }
        }
        
        keyword = keyword.toLowerCase()
        
        // 2. 模糊匹配名称、描述和类型
        for (const icon of this.iconList) {
            if (icon.name.toLowerCase().includes(keyword) ||
                icon.description.toLowerCase().includes(keyword) ||
                icon.genre.toLowerCase().includes(keyword)) {
                return icon
            }
        }
        
        return null
    }

    // 搜索背景框
    searchFrame(keyword) {
        // 确保已初始化
        if (!this.frameList) {
            return null
        }
        
        // 1. 尝试通过ID搜索
        if (/^\d+$/.test(keyword)) {
            const id = parseInt(keyword)
            return this.frameMap.get(id)
        }
        
        keyword = keyword.toLowerCase()
        
        // 2. 模糊匹配名称和描述
        for (const frame of this.frameList) {
            if (frame.name.toLowerCase().includes(keyword) ||
                frame.description.toLowerCase().includes(keyword)) {
                return frame
            }
        }
        
        return null
    }
}

export const aliasResolver = new MaimaiAliasResolver()
