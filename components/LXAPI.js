import fs from 'node:fs'
import yaml from 'yaml'

// 导出落雪API类
export default class LXAPI {
    constructor() {
        // 从配置文件中读取API基础配置
        const config = yaml.parse(fs.readFileSync('./plugins/maimai-plugin/configs/API_Token.yaml', 'utf8'))
        const userdata = yaml.parse(fs.readFileSync('./plugins/maimai-plugin/configs/userdata.yaml', 'utf8'))
        this.baseURL = config.LXapi.baseURL
        this.token = config.LXapi.token
        // 如果token未配置，使用默认token
        if (!this.token) {
            this.token = 'O-0yIEngnVsHgid6m5M2wlvQvmoDDLKIwEIfHtt0HEM='
        }
    }

    //开发者功能列表 需要开发者Token
    //1.创建或修改玩家信息
    // POST /api/v0/maimai/player

    //2.获取玩家信息
    // GET /api/v0/maimai/player/{friend_code}
    async getPlayerInfo(friendCode) {
        try {
            const url = `${this.baseURL}/api/v0/maimai/player/${friendCode}`
            const response = await fetch(url, {
                headers: {
                    'Authorization': `${this.token}`
                }
            })
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`)
            }
            const rawData = await response.json()
            const data = {
                success: true,
                code: 200,
                data: {
                    // 基础信息
                    name: rawData.data.name || '', // 玩家名
                    rating: rawData.data.rating || 0, // 玩家rating
                    friend_code: rawData.data.friend_code || 0, // 好友码
                    
                    // 称号信息
                    trophy: {
                        id: rawData.data.trophy?.id || 0, // 称号ID
                        name: rawData.data.trophy?.name || '', // 称号名称
                        color: rawData.data.trophy?.color || 'Normal' // 称号颜色
                    },
                    
                    // 段位信息
                    course_rank: rawData.data.course_rank || 0, // 段位等级
                    class_rank: rawData.data.class_rank || 0, // 阶级等级
                    star: rawData.data.star || 0, // 累计星数
                    
                    // 装扮信息
                    icon: {
                        id: rawData.data.icon?.id || 0, // 头像ID
                        name: rawData.data.icon?.name || '', // 头像名称
                        genre: rawData.data.icon?.genre || '' // 头像分类
                    },
                    name_plate: {
                        id: rawData.data.name_plate?.id || 0, // 姓名框ID
                        name: rawData.data.name_plate?.name || '', // 姓名框名称
                        genre: rawData.data.name_plate?.genre || '' // 姓名框分类
                    },
                    frame: {
                        id: rawData.data.frame?.id || 0, // 背景框ID
                        name: rawData.data.frame?.name || '', // 背景框名称
                        genre: rawData.data.frame?.genre || '' // 背景框分类
                    },
                    
                    // 更新时间
                    upload_time: rawData.data.upload_time || '' // 数据更新时间
                }
            }
            return data
        } catch (error) {
            logger.error(`获取玩家信息失败: ${error}`)
            throw error
        }
    }

    //3.通过qq获取玩家信息
    // GET /api/v0/maimai/player/qq/{qq}
    async getPlayerInfoByQQ(qq) {
        try {
            const url = `${this.baseURL}/api/v0/maimai/player/qq/${qq}`
            const response = await fetch(url, {
                headers: {
                    'Authorization': `${this.token}`
                }
            })
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`)
            }
            const rawData = await response.json()
            const data = {
                success: true,
                code: 200,
                data: {
                    // 基础信息
                    name: rawData.data.name || '', // 玩家名
                    rating: rawData.data.rating || 0, // 玩家rating
                    friend_code: rawData.data.friend_code || 0, // 好友码
                    
                    // 称号信息
                    trophy: {
                        id: rawData.data.trophy?.id || 0, // 称号ID
                        name: rawData.data.trophy?.name || '', // 称号名称
                        color: rawData.data.trophy?.color || 'Normal' // 称号颜色
                    },
                    
                    // 段位信息
                    course_rank: rawData.data.course_rank || 0, // 段位等级
                    class_rank: rawData.data.class_rank || 0, // 阶级等级
                    star: rawData.data.star || 0, // 累计星数
                    
                    // 装扮信息
                    icon: {
                        id: rawData.data.icon?.id || 0, // 头像ID
                        name: rawData.data.icon?.name || '', // 头像名称
                        genre: rawData.data.icon?.genre || '' // 头像分类
                    },
                    name_plate: {
                        id: rawData.data.name_plate?.id || 0, // 姓名框ID
                        name: rawData.data.name_plate?.name || '', // 姓名框名称
                        genre: rawData.data.name_plate?.genre || '' // 姓名框分类
                    },
                    frame: {
                        id: rawData.data.frame?.id || 0, // 背景框ID
                        name: rawData.data.frame?.name || '', // 背景框名称
                        genre: rawData.data.frame?.genre || '' // 背景框分类
                    },
                    
                    // 更新时间
                    upload_time: rawData.data.upload_time || '' // 数据更新时间
                }
            }
            //logger.info('[maimai-plugin] API响应数据:', JSON.stringify(data))
            return data
        } catch (error) {
            logger.error(`通过QQ获取玩家信息失败: ${error}`)
            throw error
        }
    }

    //4.获取玩家缓存谱面的最佳成绩。
    // GET /api/v0/maimai/player/{friend_code}/best
    async getPlayerBest(friendCode, params) {
        try {
            // 检查必要参数
            if (!params.song_id && !params.song_name) {
                throw new Error('必须提供 song_id 或 song_name 参数')
            }
            if (params.song_id && params.song_name) {
                throw new Error('song_id 和 song_name 参数不能同时提供')
            }
            if (!params.level_index) {
                throw new Error('必须提供 level_index 参数')
            }

            const response = await axios.get(`${this.baseURL}/api/v0/maimai/player/${friendCode}/best`, {
                params: {
                    song_id: params.song_id,
                    song_name: params.song_name,
                    level_index: params.level_index,
                    song_type: params.song_type
                },
                headers: {
                    'Authorization': this.token
                }
            })

            const rawData = response.data
            const data = {
                code: 200,
                data: {
                    achievements: rawData.data.achievements || 0, // 达成率
                    fc: rawData.data.fc || '', // Full Combo 类型
                    fs: rawData.data.fs || '', // Full Sync 类型
                    dx_score: rawData.data.dx_score || 0, // DX分数
                    play_time: rawData.data.play_time || '', // 游玩时间
                    type: rawData.data.type || '', // 游玩类型
                    level: rawData.data.level || '', // 难度等级
                    level_index: rawData.data.level_index || 0, // 难度序号
                    level_label: rawData.data.level_label || '', // 难度标签
                    song_id: rawData.data.song_id || 0, // 歌曲ID
                    title: rawData.data.title || '', // 歌曲标题
                    upload_time: rawData.data.upload_time || '' // 上传时间
                }
            }
            return data
        } catch (error) {
            logger.error(`获取玩家最佳成绩失败: ${error}`)
            throw error
        }
    }

    //5.获取玩家缓存的 Best 50。
    // GET /api/v0/maimai/player/{friend_code}/bests
    async getPlayerBest50(friendCode) {
        try {
            const response = await axios.get(`${this.baseURL}/api/v0/maimai/player/${friendCode}/bests`, {
                headers: {
                    'Authorization': this.token
                }
            })

            const rawData = response.data
            const data = {
                code: 200,
                data: rawData.data.map(score => ({
                    achievements: score.achievements || 0,
                    fc: score.fc || '',
                    fs: score.fs || '',
                    dx_score: score.dx_score || 0,
                    play_time: score.play_time || '',
                    type: score.type || '',
                    level: score.level || '',
                    level_index: score.level_index || 0,
                    level_label: score.level_label || '',
                    song_id: score.song_id || 0,
                    title: score.title || '',
                    upload_time: score.upload_time || ''
                }))
            }
            return data
        } catch (error) {
            logger.error(`获取玩家Best 50失败: ${error}`)
            throw error
        }
    }

    //6.获取玩家缓存的 All Perfect 50。
    // GET /api/v0/maimai/player/{friend_code}/bests/ap

    //7.获取玩家缓存单曲所有谱面的成绩
    // GET /api/v0/maimai/player/{friend_code}/bests

    //8.上传玩家成绩。
    // POST /api/v0/maimai/player/{friend_code}/scores  

    //9.获取玩家缓存的 Recent 50（仅增量爬取可用），按照 play_time 排序。
    // GET /api/v0/maimai/player/{friend_code}/recents

    //10.获取玩家缓存的所有最佳成绩（简化后）
    // GET /api/v0/maimai/player/{friend_code}/scores

    //11.获取玩家 DX Rating 趋势。
    // GET /api/v0/maimai/player/{friend_code}/trend

    //12.获取玩家成绩上传历史记录。
    // GET /api/v0/maimai/player/{friend_code}/score/history

    //13.获取玩家姓名框进度。
    // GET /api/v0/maimai/player/{friend_code}/plate/{plate_id}

    //14.通过 NET 的 HTML 源代码上传玩家数据。
    // POST /api/v0/maimai/player/{friend_code}/html

    //个人API需要个人Token
    //1.获取玩家姓名框进度。
    // GET /api/v0/maimai/player/{friend_code}/plate/{plate_id}
}

