import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
import Mustache from 'mustache'
import APIAdapter from '../components/Adapter.js'

class PlateInfo {
    // 获取姓名框信息
    async getPlateInfo(plateId) {
        try {
            // 获取适配API
            const adapter = new APIAdapter()
            const response = await adapter.getPlateInfo(plateId)
            
            // 获取姓名框资源
            const plateAsset = await adapter.getPlateAsset(parseInt(plateId))

            // 处理获取条件
            let requirements = []
            if (response.required) {
                for (const req of response.required) {
                    let reqText = []
                    
                    // 处理难度要求
                    if (req.difficulties?.length > 0) {
                        const diffNames = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER']
                        const diffs = req.difficulties.map(d => diffNames[d]).join('/')
                        reqText.push(`难度: ${diffs}`)
                    }
                    
                    // 处理评级要求
                    if (req.rate) {
                        reqText.push(`评级: ${req.rate}`)
                    }
                    
                    // 处理FC要求
                    if (req.fc) {
                        const fcMap = {
                            'fc': 'FULL COMBO',
                            'fcp': 'FULL COMBO+',
                            'ap': 'ALL PERFECT',
                            'app': 'ALL PERFECT+'
                        }
                        reqText.push(`完成度: ${fcMap[req.fc] || req.fc.toUpperCase()}`)
                    }
                    
                    // 处理FS要求
                    if (req.fs) {
                        const fsMap = {
                            'fs': 'FULL SYNC',
                            'fsp': 'FULL SYNC+',
                            'fsd': 'FULL SYNC DX',
                            'fsdp': 'FULL SYNC DX+'
                        }
                        reqText.push(`同步率: ${fsMap[req.fs] || req.fs.toUpperCase()}`)
                    }
                    
                    // 处理完成要求
                    if (req.completed !== undefined) {
                        reqText.push(`要求完成: ${req.completed ? '是' : '否'}`)
                    }
                    
                    // 构建要求对象
                    const requirement = {
                        text: reqText.join('、'),
                        hasSongs: false,
                        totalSongs: 0
                    }
                    
                    // 处理歌曲要求
                    if (req.songs?.length > 0) {
                        requirement.totalSongs = req.songs.length
                        reqText.push(`需要完成以下歌曲`)
                        requirement.hasSongs = true
                        requirement.songs = req.songs.map(song => ({
                            id: song.id.toString().padStart(4, '0'),
                            title: song.title,
                            type: song.type === 'standard' ? '标准谱面' : 'DX谱面'
                        }))
                    }
                    
                    requirements.push(requirement)
                }
            }

            // 准备渲染数据
            const renderData = {
                // 基础信息
                id: response.id.toString().padStart(4, '0'),
                name: response.name,
                description: response.description,
                genre: response.genre,
                // 姓名框图片转base64
                plate: plateAsset ? `data:image/png;base64,${fs.readFileSync(plateAsset).toString('base64')}` : null,
                // 获取条件
                hasRequirements: requirements.length > 0,
                requirements: requirements
            }

            // 渲染图片
            const renderedImage = await this.render(renderData)
            
            return {
                isImage: true,
                message: renderedImage,
                name: renderData.name
            }

        } catch (err) {
            logger.error('[maimai-plugin] 获取姓名框信息失败')
            logger.error(err)
            return {
                isImage: false,
                message: '获取姓名框信息失败，请稍后再试'
            }
        }
    }

    // 渲染图片
    async render(data) {
        const imagePath = path.join(process.cwd(), 'temp', 'maimai-plugin', `plateinfo_${Date.now()}.png`)
        
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
            let template = fs.readFileSync('./plugins/maimai-plugin/resources/html/plateinfo.html', 'utf8')
            
            // 使用Mustache渲染模板
            const rendered = Mustache.render(template, data)
            
            // 设置页面内容
            await page.setContent(rendered)
            
            // 等待图片加载
            if (data.plate) {
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
}

export const plateInfo = new PlateInfo()

