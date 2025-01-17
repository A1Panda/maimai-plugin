import fs from 'node:fs'
import path from 'node:path'
import yaml from 'yaml'
import puppeteer from 'puppeteer'
import APIAdapter from '../components/Adapter.js'

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

            // 获取资源文件的本地路径
            const iconAsset = await adapter.getIconAsset(response.data.icon.id)
            const plateAsset = await adapter.getPlateAsset(response.data.name_plate.id)
            const classRankAsset = await adapter.getClassRankAsset(response.data.class_rank)
            const courseRankAsset = await adapter.getCourseRankAsset(response.data.course_rank)

            // 准备渲染数据，使用 data: URL 格式
            const renderData = {
                ...response.data,
                iconAsset: `data:image/png;base64,${fs.readFileSync(iconAsset).toString('base64')}`,
                plateAsset: `data:image/png;base64,${fs.readFileSync(plateAsset).toString('base64')}`,
                classRankAsset: `data:image/webp;base64,${fs.readFileSync(classRankAsset).toString('base64')}`,
                courseRankAsset: `data:image/webp;base64,${fs.readFileSync(courseRankAsset).toString('base64')}`,
                // 格式化一些数据
                rating: response.data.rating,
                upload_time: new Date(response.data.upload_time).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                    timeZone: 'UTC'
                }).replace(/-/g, '/').replace(/日.*?(\d+)/, '日 $1')
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
        // 使用Yunzai-Bot的临时文件夹，改为.png后缀
        const imagePath = path.join(process.cwd(), 'temp', 'maimai-plugin', `playerinfo_${Date.now()}.png`)
        
        // 启动浏览器
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--allow-file-access-from-files',  // 允许访问本地文件
                '--disable-web-security'  // 禁用web安全策略
            ]
        })
        
        try {
            const page = await browser.newPage()
            
            // 读取HTML模板
            let template = fs.readFileSync('./plugins/maimai-plugin/resources/html/playerinfo.html', 'utf8')
            
            // 替换模板中的变量
            template = template.replace(/\{\{(\w+(\.\w+)?)\}\}/g, (match, key) => {
                const value = key.split('.').reduce((obj, k) => obj?.[k], data)
                return value !== undefined ? value : match
            })
            
            // 设置页面内容
            await page.setContent(template)
            
            // 等待图片加载完成
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
            
            // 设置视口大小
            await page.setViewport({
                width: 1200,
                height: 1000
            })
            
            // 等待内容加载完成
            await page.waitForSelector('.container')
            
            // 获取实际内容高度并重设视口
            const bodyHeight = await page.evaluate(() => {
                return document.querySelector('.container').offsetHeight
            })
            await page.setViewport({
                width: 800,
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

}

export const playerInfo = new PlayerInfo()
