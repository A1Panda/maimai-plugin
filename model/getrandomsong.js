import fetch from 'node-fetch'
import { ScreenshotManager } from '../utils/screenshot.js'
import { AssetsManager } from '../utils/assets.js'
import { segment } from 'oicq'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export class MaimaiRandomSong {
    constructor() {
        this.baseUrl = 'https://maimai.lxns.net/api/v0/maimai'
        this.songList = null
        this.assets = new AssetsManager()
    }

    /**
     * 转换音频为 AMR 格式
     * @param {string} inputPath 输入文件路径
     * @returns {Promise<string>} AMR 文件路径
     */
    async convertToAmr(inputPath) {
        const amrPath = inputPath.replace('.mp3', '.amr')
        try {
            // 使用 FFmpeg 转换为 AMR 格式
            await execAsync(`ffmpeg -i "${inputPath}" -ar 8000 -ab 12.2k -ac 1 "${amrPath}"`)
            return amrPath
        } catch (error) {
            console.error('音频转换失败:', error)
            throw error
        }
    }

    /**
     * 获取歌曲列表
     * @returns {Promise<Array>} 歌曲列表
     */
    async getSongList() {
        if (this.songList) {
            return this.songList
        }

        try {
            const response = await fetch(`${this.baseUrl}/song/list`)
            if (!response.ok) {
                throw new Error(`获取歌曲列表失败: ${response.status}`)
            }

            const data = await response.json()
            this.songList = data.songs || []
            return this.songList
        } catch (error) {
            console.error('获取歌曲列表失败:', error)
            throw error
        }
    }

    /**
     * 获取随机歌曲
     * @param {Object} params 查询参数
     * @returns {Promise<Object>} 歌曲数据
     */
    async getRandomSong(params) {
        try {
            const songList = await this.getSongList()
            let filteredSongs = songList

            // 应用筛选条件
            if (params.level) {
                filteredSongs = filteredSongs.filter(song => {
                    const difficulties = [
                        ...(song.difficulties.standard || []),
                        ...(song.difficulties.dx || [])
                    ]
                    return difficulties.some(diff => 
                        Math.floor(diff.level_value) === Math.floor(params.level)
                    )
                })
            }

            if (params.type) {
                filteredSongs = filteredSongs.filter(song => {
                    const difficulties = [
                        ...(song.difficulties.standard || []),
                        ...(song.difficulties.dx || [])
                    ]
                    return difficulties.some(diff => 
                        diff.difficulty === this.getDifficultyIndex(params.type)
                    )
                })
            }

            if (params.version_type) {
                filteredSongs = filteredSongs.filter(song => {
                    if (params.version_type === 'dx') {
                        return song.difficulties.dx && song.difficulties.dx.length > 0
                    } else {
                        return song.difficulties.standard && song.difficulties.standard.length > 0
                    }
                })
            }

            if (filteredSongs.length === 0) {
                throw new Error('没有找到符合条件的歌曲')
            }

            // 随机选择一首歌
            const randomSong = filteredSongs[Math.floor(Math.random() * filteredSongs.length)]

            // 格式化歌曲数据
            const formattedSong = {
                ...randomSong,
                charts: this.formatCharts(randomSong.difficulties)
            }

            return {
                success: true,
                data: formattedSong
            }
        } catch (error) {
            console.error('获取随机歌曲失败:', error)
            throw error
        }
    }

    /**
     * 格式化难度信息
     * @param {Object} difficulties 难度数据
     * @returns {Array} 格式化后的难度数组
     */
    formatCharts(difficulties) {
        const charts = []

        // 处理标准谱面
        if (difficulties.standard) {
            difficulties.standard.forEach(diff => {
                const levelValue = parseFloat(diff.level_value).toFixed(1)
                const difficultyInfo = {
                    type: this.getDifficultyName(diff.difficulty),
                    level: diff.level,
                    level_value: levelValue,
                    note_designer: diff.note_designer !== '-' ? diff.note_designer : '',
                    is_dx: false,
                    color: this.getDifficultyColor(diff.difficulty)
                }
                charts.push(difficultyInfo)
            })
        }

        // 处理DX谱面
        if (difficulties.dx) {
            difficulties.dx.forEach(diff => {
                const levelValue = parseFloat(diff.level_value).toFixed(1)
                const difficultyInfo = {
                    type: this.getDifficultyName(diff.difficulty),
                    level: diff.level,
                    level_value: levelValue,
                    note_designer: diff.note_designer !== '-' ? diff.note_designer : '',
                    is_dx: true,
                    color: this.getDifficultyColor(diff.difficulty)
                }
                charts.push(difficultyInfo)
            })
        }

        // 按难度值排序
        const sortedCharts = charts.sort((a, b) => parseFloat(a.level_value) - parseFloat(b.level_value))
        return sortedCharts
    }

    /**
     * 获取难度类型索引
     * @param {string} type 难度类型名称
     * @returns {number} 难度类型索引
     */
    getDifficultyIndex(type) {
        const types = {
            'basic': 0,
            'advanced': 1,
            'expert': 2,
            'master': 3,
            'remaster': 4
        }
        return types[type.toLowerCase()] || 0
    }

    /**
     * 获取难度类型名称
     * @param {number} difficulty 难度类型索引
     * @returns {string} 难度类型名称
     */
    getDifficultyName(difficulty) {
        const types = {
            0: 'Basic',
            1: 'Advanced',
            2: 'Expert',
            3: 'Master',
            4: 'Re:Master'
        }
        return types[difficulty] || 'Unknown'
    }

    /**
     * 获取难度颜色
     * @param {number} difficulty 难度类型索引
     * @returns {string} 难度颜色代码
     */
    getDifficultyColor(difficulty) {
        const colors = {
            0: '#84b9cb',  // Basic - 绿色
            1: '#f7b547',  // Advanced - 黄色
            2: '#ec4c4c',  // Expert - 红色
            3: '#9e45e2',  // Master - 紫色
            4: '#e6e6e6'   // Re:Master - 白色
        }
        return colors[difficulty] || '#ffffff'
    }

    /**
     * 格式化歌曲信息
     * @param {Object} songData 歌曲数据
     * @returns {Promise<Buffer>} 图片buffer
     */
    async formatSongInfo(songData) {
        try {
            if (!songData?.success || !songData?.data) {
                throw new Error('获取数据失败或数据格式不正确')
            }

            // 确保数据格式正确
            const templateData = {
                ...songData.data,
                charts: songData.data.charts || []
            }

            // 生成图片
            const imageBuffer = await ScreenshotManager.makeImage(templateData, 'song-info.html')
            return imageBuffer
        } catch (error) {
            console.error('格式化歌曲信息失败:', error)
            throw error
        }
    }

    /**
     * 获取歌曲资源
     * @param {Object} songData 歌曲数据
     * @param {Object} e 事件对象
     * @returns {Promise<boolean>} 是否成功
     */
    async getSongAssets(songData, e) {
        try {
            if (!songData?.data?.id) {
                throw new Error('歌曲数据格式不正确')
            }

            const songId = songData.data.id

            // 获取曲绘
            const jacketPath = await this.assets.getJacket(songId)
            await e.reply(segment.image(jacketPath))

            // 获取音乐文件
            const musicPath = await this.assets.getMusic(songId)
            
            try {
                // 转换为 AMR 格式
                const amrPath = await this.convertToAmr(musicPath)
                // 读取 AMR 文件并转为 base64
                const amrBuffer = fs.readFileSync(amrPath)
                const base64Data = amrBuffer.toString('base64')
                // 发送语音消息
                await e.reply(segment.record(`base64://${base64Data}`))
                // 删除临时 AMR 文件
                fs.unlinkSync(amrPath)
            } catch (error) {
                console.error('音频转换失败，尝试直接发送文件:', error)
                // 如果转换失败，退回到发送文件
                await e.reply([{
                    type: 'file',
                    name: `${songData.data.title}.mp3`,
                    file: musicPath
                }])
            }

            return true
        } catch (error) {
            console.error('获取歌曲资源失败:', error)
            await e.reply(`获取资源失败: ${error.message}`)
            return false
        }
    }
} 