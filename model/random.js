import fs from 'fs'
import APIAdapter from '../components/Adapter.js'

export class Random {
    constructor() {
        this.adapter = new APIAdapter()
    }

    // 随机获取ID
    async getRandomId(type, difficulty = null) {
        try {
            let list = null
            
            // 根据类型获取对应列表
            switch(type) {
                case '歌曲':
                    const songList = await this.adapter.getSongList()
                    // 如果指定了难度，过滤歌曲列表
                    if (difficulty) {
                        list = songList.songs.filter(song => {
                            // 检查标准谱面和DX谱面的所有难度
                            const standardMatches = song.difficulties.standard?.some(diff => 
                                diff.level.replace('+', '') === difficulty.toString()
                            ) || false
                            const dxMatches = song.difficulties.dx?.some(diff => 
                                diff.level.replace('+', '') === difficulty.toString()
                            ) || false
                            return standardMatches || dxMatches
                        })
                        logger.info(`[maimai-plugin] 难度${difficulty}的歌曲数量: ${list.length}`)
                    } else {
                        list = songList.songs
                    }
                    break
                case '姓名框':
                    const plateList = await this.adapter.getPlateList()
                    list = plateList.plates
                    break
                case '头像':
                    const iconList = await this.adapter.getIconList()
                    list = iconList.icons
                    break
                case '背景框':
                    const frameList = await this.adapter.getFrameList()
                    list = frameList.frames
                    break
                case '收藏品':
                    const genreList = await this.adapter.getCollectionGenreList()
                    list = genreList.genres
                    break
                case '曲绘':
                    // 曲绘使用歌曲列表
                    const jacketList = await this.adapter.getSongList()
                    // 如果指定了难度，过滤歌曲列表
                    if (difficulty) {
                        list = jacketList.songs.filter(song => {
                            // 检查标准谱面和DX谱面的所有难度
                            const standardMatches = song.difficulties.standard?.some(diff => 
                                diff.level.replace('+', '') === difficulty.toString()
                            ) || false
                            const dxMatches = song.difficulties.dx?.some(diff => 
                                diff.level.replace('+', '') === difficulty.toString()
                            ) || false
                            return standardMatches || dxMatches
                        })
                        logger.info(`[maimai-plugin] 难度${difficulty}的歌曲数量: ${list.length}`)
                    } else {
                        list = jacketList.songs
                    }
                    break
                default:
                    throw new Error('无效的类型')
            }

            // 从列表中随机选择一个ID
            if(list && list.length > 0) {
                const randomIndex = Math.floor(Math.random() * list.length)
                logger.info(`[maimai-plugin] 随机ID: ${list[randomIndex].id}`)
                switch(type) {
                    case '歌曲':
                        logger.info(`[maimai-plugin] 随机歌曲: ${list[randomIndex].title} (ID: ${list[randomIndex].id})${difficulty ? ` 难度: ${difficulty}` : ''}`)
                        return list[randomIndex].id
                    case '曲绘':                        
                        logger.info(`[maimai-plugin] 随机曲绘: ${list[randomIndex].title} (ID: ${list[randomIndex].id})${difficulty ? ` 难度: ${difficulty}` : ''}`)
                        return list[randomIndex].id
                    case '姓名框':
                        logger.info(`[maimai-plugin] 随机姓名框: ${list[randomIndex].name} (ID: ${list[randomIndex].id})`)
                        return list[randomIndex].id
                    case '头像':
                        logger.info(`[maimai-plugin] 随机头像: ${list[randomIndex].name} (ID: ${list[randomIndex].id})`)
                        return list[randomIndex].id
                    case '背景框':
                        logger.info(`[maimai-plugin] 随机背景框: ${list[randomIndex].name} (ID: ${list[randomIndex].id})`)
                        return list[randomIndex].id
                    case '收藏品':
                        logger.info(`[maimai-plugin] 随机收藏品: ${list[randomIndex].name} (ID: ${list[randomIndex].id})`)
                        return list[randomIndex].id
                    default:
                        return null
                }
            }

            throw new Error('获取列表为空')

        } catch (error) {
            logger.error(`[maimai-plugin] 随机获取${type}ID失败: ${error}`)
            return null
        }
    }
}

export const random = new Random()
