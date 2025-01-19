import fs from 'node:fs'
import path from 'node:path'
import yaml from 'yaml'
import puppeteer from 'puppeteer'
import Mustache from 'mustache'
import APIAdapter from '../components/Adapter.js'
import { aliasResolver } from '../utils/MaimaiAliasResolver.js'

// 初始化别名解析器
aliasResolver.init().catch(err => {
    logger.error('[maimai-plugin] 初始化别名解析器失败')
    logger.error(err)
})

class ScoreInfo {
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
    // 获取成绩信息
    async getScoreInfo(song_id, userId) {
        try {
            // 检查用户绑定
            const userData = this.getUserData()
            if (!userData[userId]?.friendCode) {
                return {
                    isImage: false,
                    message: '您还未绑定好友码，请先使用 #mai绑定 进行绑定'
                }
            }
            const friendCode = userData[userId].friendCode
            
            // 获取适配API
            const adapter = new APIAdapter()
            let songId = song_id

            // 解析歌曲ID
            if (!/^\d+$/.test(song_id)) {
                const song = await aliasResolver.searchSong(song_id)
                if (!song) {
                    return {
                        isImage: false,
                        message: '未找到对应歌曲'
                    }
                }
                songId = song.id
                logger.info(`[maimai-plugin] 歌曲别名解析: ${song_id} -> ${songId}(${song.title})`)
            }

            // 获取歌曲信息
            const response = await adapter.getSongInfo(songId)
            
            // 获取谱面类型和难度信息
            const songType = response.difficulties.standard?.length > 0 ? 'standard' : 'dx'
            const diffs = response.difficulties[songType] || []
            
            // 获取歌曲封面
            const coverAsset = await adapter.getJacketAsset(parseInt(songId))

            // 处理各难度分数信息
            const diffNames = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER']
            const difficulties = await Promise.all(diffs.map(async (diff, index) => {
                // 构建查询参数
                const params = {
                    song_id: songId,
                    song_type: songType,
                    level_index: index
                }

                // 获取该难度的成绩信息
                let scoreData = null
                try {
                    scoreData = await adapter.getPlayerBest(friendCode, params)
                    //logger.info(`[maimai-plugin] 获取难度${index}成绩成功: ${JSON.stringify(scoreData)}`)
                } catch (error) {
                    logger.warn(`[maimai-plugin] 获取难度${index}成绩失败: ${error}`)
                }

                // 处理成绩数据
                const score = scoreData?.data || {}
                const hasScore = Boolean(score.achievements)
                //logger.info(`[maimai-plugin] 获取成绩: ${JSON.stringify(scoreData)}`)
                
                return {
                    name: diffNames[index],
                    level: diff.level,
                    // 谱面信息
                    noteDesigner: diff.note_designer || '',
                    // 分数信息
                    dxscore: hasScore ? score.dx_score || 0 : 0,
                    achievement: hasScore ? score.achievements : 0,
                    fcStatus: hasScore ? score.fc : '',
                    fsStatus: hasScore ? score.fs : '',
                    // 评级
                    rate: hasScore ? this.getRateByScore(score.rate) : '',
                    // 是否有成绩
                    hasScore: hasScore,
                    // 游玩时间
                    playTime: hasScore ? score.play_time.substring(0, 10) : ''
                }
            }))

            // 准备渲染数据
            const renderData = {
                // 基础信息
                id: response.id.toString().padStart(4, '0'),
                title: response.title,
                artist: response.artist,
                genre: response.genre || '',
                version: response.version || '',
                type: songType === 'dx' ? 'DX' : 'Standard',
                // 难度和分数信息
                difficulties: difficulties,
                // 封面图片
                cover: coverAsset ? `data:image/png;base64,${fs.readFileSync(coverAsset).toString('base64')}` : null,
                // 是否有任意难度的成绩
                hasAnyScore: difficulties.some(d => d.hasScore),
                //bpm
                bpm: response.bpm || ''
            }

            // 渲染图片
            const renderedImage = await this.render(renderData)
            return {
                isImage: true,
                message: renderedImage,
                title: renderData.title
            }

        } catch (error) {
            logger.error(`[maimai-plugin] 获取成绩信息失败: ${error}`)
            return {
                isImage: false,
                message: '获取成绩信息失败'
            }
        }
    }

    // 渲染图片
    async render(data) {
        const imagePath = path.join(process.cwd(), 'temp', 'maimai-plugin', `scoreinfo_${Date.now()}.png`)
        
        // 启动浏览器
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        })
        
        try {
            const page = await browser.newPage()
            
            // 读取HTML模板
            let template = fs.readFileSync('./plugins/maimai-plugin/resources/html/scoreinfo.html', 'utf8')
            
            // 使用Mustache渲染模板
            const rendered = Mustache.render(template, data)
            
            // 设置页面内容
            await page.setContent(rendered)
            
            // 等待图片加载
            if (data.cover) {
                await page.waitForSelector('img')
                await page.evaluate(() => {
                    return Promise.all(
                        Array.from(document.images)
                            .filter(img => !img.complete)
                            .map(img => new Promise(resolve => {
                                img.onload = img.onerror = resolve
                            }))
                    )
                })
            }
            
            // 等待内容加载
            await page.waitForSelector('.container')
            
            // 获取实际内容高度
            const bodyHeight = await page.evaluate(() => {
                return document.querySelector('.container').offsetHeight
            })
            
            // 设置视口大小
            await page.setViewport({
                width: 1000,
                height: bodyHeight + 40
            })
            
            // 确保临时目录存在
            const dir = path.dirname(imagePath)
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true })
            }
            
            // 截图
            await page.screenshot({
                type: 'png',
                fullPage: true,
                path: imagePath
            })
            
            return imagePath
            
        } finally {
            await browser.close()
        }
    }

    // 根据分数判断评级
    getRateByScore(rate) {
        //logger.info(`[maimai-plugin] 获取评级: ${rate}`)
        if (rate === 'sssp') return 'SSS+'
        if (rate === 'sss') return 'SSS'
        if (rate === 'ssp') return 'SS+'
        if (rate === 'ss') return 'SS'
        if (rate === 'sp') return 'S+'
        if (rate === 's') return 'S'
        if (rate === 'aaa') return 'AAA'
        if (rate === 'aa') return 'AA'
        if (rate === 'a') return 'A'
        if (rate === 'bbb') return 'BBB'
        if (rate === 'bb') return 'BB'
        if (rate === 'b') return 'B'
        if (rate === 'C') return 'C'
        if (rate === 'D') return 'D'
    }
}

export const scoreInfo = new ScoreInfo()

