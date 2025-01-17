import fs from 'node:fs'
import path from 'node:path'
import yaml from 'yaml'
import puppeteer from 'puppeteer'
import APIAdapter from '../components/Adapter.js'

class B50 {
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

    // 获取玩家best50
    async getB50(userId) {
        try {
            // 获取用户绑定数据
            const userData = this.getUserData()
            if (!userData[userId] || !userData[userId].friendCode) {
                return {
                    isImage: false,
                    message: '您还未绑定好友码，请先使用 #mai绑定 进行绑定'
                }
            }

            // 通过API获取玩家best50
            const adapter = new APIAdapter()
            const response = await adapter.getPlayerBest50(userData[userId].friendCode)
            
            // 处理标准谱和DX谱的数据
            const processedStandard = await Promise.all(response.data.standard.map(async song => {
                const jacketAsset = await adapter.getJacketAsset(song.id)
                const fcIcon = song.fc ? await adapter.getMusicIconAsset(song.fc) : null
                const fsIcon = song.fs ? await adapter.getMusicIconAsset(song.fs) : null
                const rateIcon = await adapter.getMusicRateAsset(song.rate)
                
                return {
                    ...song,
                    jacket_url: `data:image/png;base64,${fs.readFileSync(jacketAsset).toString('base64')}`,
                    fc_icon: fcIcon ? `data:image/webp;base64,${fs.readFileSync(fcIcon).toString('base64')}` : null,
                    fs_icon: fsIcon ? `data:image/webp;base64,${fs.readFileSync(fsIcon).toString('base64')}` : null,
                    rate_icon: `data:image/webp;base64,${fs.readFileSync(rateIcon).toString('base64')}`
                }
            }))

            const processedDX = await Promise.all(response.data.dx.map(async song => {
                const jacketAsset = await adapter.getJacketAsset(song.id)
                const fcIcon = song.fc ? await adapter.getMusicIconAsset(song.fc) : null
                const fsIcon = song.fs ? await adapter.getMusicIconAsset(song.fs) : null
                const rateIcon = await adapter.getMusicRateAsset(song.rate)
                
                return {
                    ...song,
                    jacket_url: `data:image/png;base64,${fs.readFileSync(jacketAsset).toString('base64')}`,
                    fc_icon: fcIcon ? `data:image/webp;base64,${fs.readFileSync(fcIcon).toString('base64')}` : null,
                    fs_icon: fsIcon ? `data:image/webp;base64,${fs.readFileSync(fsIcon).toString('base64')}` : null,
                    rate_icon: `data:image/webp;base64,${fs.readFileSync(rateIcon).toString('base64')}`
                }
            }))

            // 准备渲染数据
            const renderData = {
                standard_total: response.data.standard_total,
                dx_total: response.data.dx_total,
                standard: processedStandard,
                dx: processedDX
            }

            // 渲染B50信息
            const renderedImage = await this.render(renderData)
            
            return {
                isImage: true,
                message: renderedImage
            }
        } catch (err) {
            logger.error('[maimai-plugin] 获取b50信息失败')
            logger.error(err)
            return {
                isImage: false,
                message: '获取b50信息失败，请稍后再试'
            }
        }
    }

    // 渲染B50信息
    async render(data) {
        const imagePath = path.join(process.cwd(), 'temp', 'maimai-plugin', `b50_${Date.now()}.png`)
        
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--allow-file-access-from-files',
                '--disable-web-security'
            ]
        })
        
        try {
            const page = await browser.newPage()
            
            // 读取HTML模板
            let template = fs.readFileSync('./plugins/maimai-plugin/resources/html/b50.html', 'utf8')
            
            // 替换标准数据
            template = template.replace(/\{\{standard_total\}\}/g, data.standard_total)
            template = template.replace(/\{\{dx_total\}\}/g, data.dx_total)
            
            // 处理标准谱面列表
            const standardSection = template.match(/\{\{#standard\}\}([\s\S]*?)\{\{\/standard\}\}/)?.[1] || ''
            let standardHtml = ''
            data.standard.forEach(song => {
                let songHtml = standardSection
                songHtml = songHtml.replace(/\{\{song_name\}\}/g, song.song_name)
                songHtml = songHtml.replace(/\{\{jacket_url\}\}/g, song.jacket_url)
                songHtml = songHtml.replace(/\{\{level\}\}/g, song.level)
                songHtml = songHtml.replace(/\{\{dx_score\}\}/g, song.dx_score)
                songHtml = songHtml.replace(/\{\{dx_rating\}\}/g, song.dx_rating.toFixed(2))
                songHtml = songHtml.replace(/\{\{achievements\}\}/g, song.achievements.toFixed(4))
                
                // 处理FC/FS图标
                if (song.fc_icon) {
                    songHtml = songHtml.replace(/\{\{#fc\}\}([\s\S]*?)\{\{\/fc\}\}/g, 
                        `<img src="${song.fc_icon}" alt="FC">`)
                } else {
                    songHtml = songHtml.replace(/\{\{#fc\}\}([\s\S]*?)\{\{\/fc\}\}/g, '')
                }
                
                if (song.fs_icon) {
                    songHtml = songHtml.replace(/\{\{#fs\}\}([\s\S]*?)\{\{\/fs\}\}/g, 
                        `<img src="${song.fs_icon}" alt="FS">`)
                } else {
                    songHtml = songHtml.replace(/\{\{#fs\}\}([\s\S]*?)\{\{\/fs\}\}/g, '')
                }
                
                songHtml = songHtml.replace(/\{\{rate_icon\}\}/g, song.rate_icon)
                songHtml = songHtml.replace(/\{\{rate\}\}/g, song.rate)
                
                standardHtml += songHtml
            })
            template = template.replace(/\{\{#standard\}\}[\s\S]*?\{\{\/standard\}\}/g, standardHtml)
            
            // 处理DX谱面列表
            const dxSection = template.match(/\{\{#dx\}\}([\s\S]*?)\{\{\/dx\}\}/)?.[1] || ''
            let dxHtml = ''
            data.dx.forEach(song => {
                let songHtml = dxSection
                songHtml = songHtml.replace(/\{\{song_name\}\}/g, song.song_name)
                songHtml = songHtml.replace(/\{\{jacket_url\}\}/g, song.jacket_url)
                songHtml = songHtml.replace(/\{\{level\}\}/g, song.level)
                songHtml = songHtml.replace(/\{\{dx_score\}\}/g, song.dx_score)
                songHtml = songHtml.replace(/\{\{dx_rating\}\}/g, song.dx_rating.toFixed(2))
                songHtml = songHtml.replace(/\{\{achievements\}\}/g, song.achievements.toFixed(4))
                
                if (song.fc_icon) {
                    songHtml = songHtml.replace(/\{\{#fc\}\}([\s\S]*?)\{\{\/fc\}\}/g, 
                        `<img src="${song.fc_icon}" alt="FC">`)
                } else {
                    songHtml = songHtml.replace(/\{\{#fc\}\}([\s\S]*?)\{\{\/fc\}\}/g, '')
                }
                
                if (song.fs_icon) {
                    songHtml = songHtml.replace(/\{\{#fs\}\}([\s\S]*?)\{\{\/fs\}\}/g, 
                        `<img src="${song.fs_icon}" alt="FS">`)
                } else {
                    songHtml = songHtml.replace(/\{\{#fs\}\}([\s\S]*?)\{\{\/fs\}\}/g, '')
                }
                
                songHtml = songHtml.replace(/\{\{rate_icon\}\}/g, song.rate_icon)
                songHtml = songHtml.replace(/\{\{rate\}\}/g, song.rate)
                
                dxHtml += songHtml
            })
            template = template.replace(/\{\{#dx\}\}[\s\S]*?\{\{\/dx\}\}/g, dxHtml)
            
            // 设置页面内容
            await page.setContent(template)
            
            // 等待图片加载
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
                width: 2400,
                height: 800
            })
            
            // 等待内容加载完成
            await page.waitForSelector('.container')
            
            // 获取实际内容高度
            const bodyHeight = await page.evaluate(() => {
                return document.querySelector('.container').offsetHeight
            })
            
            // 调整视口高度
            await page.setViewport({
                width: 2400,
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

export const b50 = new B50()
