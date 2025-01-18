import APIAdapter from '../components/Adapter.js'

class MaimaiAliasResolver {
    constructor() {
        this.songList = null
        this.aliasList = null
        this.plateList = null
        this.songMap = new Map()  // songId -> song
        this.aliasMap = new Map() // alias -> songId
        this.plateMap = new Map() // plateId -> plate
    }

    // 初始化数据
    async init() {
        try {
            const adapter = new APIAdapter()
            
            // 获取歌曲列表
            const songListResponse = await adapter.getSongList()
            this.songList = songListResponse.songs
            
            // 获取别名列表
            const aliasListResponse = await adapter.getAliasList()
            this.aliasList = aliasListResponse.aliases
            
            // 获取姓名框列表
            const plateListResponse = await adapter.getPlateList()
            this.plateList = plateListResponse.plates
            
            // 构建映射
            this.buildMaps()
            
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
}

export const aliasResolver = new MaimaiAliasResolver()
