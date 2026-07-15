import fs from 'node:fs'
import path from 'node:path'
import yaml from 'yaml'
import puppeteer from 'puppeteer'
import APIAdapter from '../components/Adapter.js'
import assetManager from '../components/AssetManager.js'

class PlayerInfo {
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

    // 获取玩家信息
    async getPlayerInfo(userId) {
        try {
            // 获取用户绑定数据
            const userData = this.getUserData()
            if (!userData[userId] || !userData[userId].friendCode) {
                return {
                    isImage: false,
                    message: '您还未绑定好友码，请先使用 #mai绑定 进行绑定'
                }
            }

            // 通过API获取玩家信息
            const adapter = new APIAdapter()
            const response = await adapter.getPlayerInfo(userData[userId].friendCode)
            
            if (!response.success) {
                return {
                    isImage: false,
                    message: '获取玩家信息失败'
                }
            }

            // 通过 AssetManager 预下载所有资源为 base64 data URI
            const [iconAsset, plateAsset, frameAsset, classRankAsset, courseRankAsset] = await Promise.all([
                response.data.icon?.id ? assetManager.getAssetAsBase64('icon', response.data.icon.id) : Promise.resolve(''),
                response.data.name_plate?.id ? assetManager.getAssetAsBase64('plate', response.data.name_plate.id) : Promise.resolve(''),
                response.data.frame?.id ? assetManager.getAssetAsBase64('frame', response.data.frame.id) : Promise.resolve(''),
                response.data.class_rank ? assetManager.getAssetAsBase64('class_rank', response.data.class_rank) : Promise.resolve(''),
                response.data.course_rank ? assetManager.getAssetAsBase64('course_rank', response.data.course_rank) : Promise.resolve('')
            ])

            // 准备渲染数据
            const renderData = {
                ...response.data,
                icon: {
                    id: response.data.icon?.id || '未知',
                    name: response.data.icon?.name || '未知',
                    genre: response.data.icon?.genre || '未知'
                },
                name_plate: {
                    id: response.data.name_plate?.id || '未知',
                    name: response.data.name_plate?.name || '未知',
                    genre: response.data.name_plate?.genre || '未知'
                },
                frame: {
                    id: response.data.frame?.id || '未知',
                    name: response.data.frame?.name || '未知',
                    genre: response.data.frame?.genre || '未知'
                },
                trophy: {
                    id: response.data.trophy?.id || '未知',
                    name: response.data.trophy?.name || '未知'
                },
                iconAsset: iconAsset,
                plateAsset: plateAsset,
                frameAsset: frameAsset,
                classRankAsset: classRankAsset,
                courseRankAsset: courseRankAsset,
                // 格式化一些数据
                rating: response.data.rating,
                upload_time: response.data.upload_time ? new Date(response.data.upload_time).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                    timeZone: 'UTC'
                }).replace(/-/g, '/').replace(/,/, '日') : '未知'
            }

            // 在对象之外记录日志
            //logger.info('[maimai-plugin] 玩家信息:', JSON.stringify(response.data, null, 2))

            // 渲染玩家信息
            const renderedImage = await this.render(renderData)
            
            return {
                isImage: true,
                message: renderedImage
            }
        } catch (err) {
            logger.error('[maimai-plugin] 获取玩家信息失败')
            logger.error(err)
            return {
                isImage: false,
                message: '获取玩家信息失败，请稍后再试'
            }
        }
    }


    // 渲染玩家信息
    async render(data) {
        const imagePath = path.join(process.cwd(), 'temp', 'maimai-plugin', `playerinfo_${Date.now()}.png`)
        
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        })
        
        try {
            const page = await browser.newPage()
            await page.setDefaultNavigationTimeout(15000)
            await page.setViewport({ width: 850, height: 1000 })
            
            // 读取HTML模板
            let template = fs.readFileSync('./plugins/maimai-plugin/resources/html/playerinfo.html', 'utf8')
            
            // 替换模板中的变量
            template = template.replace(/\{\{(\w+(\.\w+)?)\}\}/g, (match, key) => {
                const value = key.split('.').reduce((obj, k) => obj?.[k], data)
                return value !== undefined ? value : match
            })
            
            // 保存 HTML 到临时文件，用 file:// 加载（全部 base64，无网络依赖）
            const htmlPath = path.join(process.cwd(), 'temp', 'maimai-plugin', `playerinfo_${Date.now()}.html`)
            const htmlDir = path.dirname(htmlPath)
            if (!fs.existsSync(htmlDir)) fs.mkdirSync(htmlDir, { recursive: true })
            fs.writeFileSync(htmlPath, template, 'utf8')
            
            await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
            await page.waitForSelector('.container', { timeout: 10000 })
            
            // 获取实际内容高度并重设视口
            const bodyHeight = await page.evaluate(() => document.querySelector('.container').offsetHeight)
            await page.setViewport({ width: 850, height: bodyHeight + 80 })
            
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

}

export const playerInfo = new PlayerInfo()
