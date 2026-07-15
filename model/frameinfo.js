import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
import Mustache from 'mustache'
import APIAdapter from '../components/Adapter.js'
import assetManager from '../components/AssetManager.js'

class FrameInfo {
    // 获取背景信息
    async getFrameInfo(frameId) {
        try {
            // 获取适配API
            const adapter = new APIAdapter()
            const response = await adapter.getFrameInfo(frameId)
            
            // 背景图片 - 通过 AssetManager 预下载为 base64
            const frameAsset = await assetManager.getAssetAsBase64('frame', response.id)

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
                        reqText.push(`需要完成以下 ${req.songs.length} 首歌曲`)
                        requirement.hasSongs = true
                        requirement.songs = req.songs.map(song => ({
                            id: song.id.toString().padStart(4, '0'),
                            title: song.title,
                            type: song.type === 'standard' ? 'STD' : 'DX',
                            typeClass: song.type === 'standard' ? 'type-std' : 'type-dx'
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
                // 背景图片
                frame: frameAsset,
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

        } catch (error) {
            logger.error(`[maimai-plugin] 获取背景信息失败: ${error}`)
            return {
                isImage: false,
                message: '获取背景信息失败'
            }
        }
    }

    // 渲染图片
    async render(data) {
        const imagePath = path.join(process.cwd(), 'temp', 'maimai-plugin', `frameinfo_${Date.now()}.png`)
        
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })
        
        try {
            const page = await browser.newPage()
            await page.setDefaultNavigationTimeout(15000)
            await page.setViewport({ width: 1000, height: 800 })
            
            // 读取HTML模板
            let template = fs.readFileSync('./plugins/maimai-plugin/resources/html/frameinfo.html', 'utf8')
            
            // 使用Mustache渲染模板
            const rendered = Mustache.render(template, data)
            
            // 保存 HTML 到临时文件，用 file:// 加载（全部 base64，无网络依赖）
            const htmlPath = path.join(process.cwd(), 'temp', 'maimai-plugin', `frameinfo_${Date.now()}.html`)
            const htmlDir = path.dirname(htmlPath)
            if (!fs.existsSync(htmlDir)) fs.mkdirSync(htmlDir, { recursive: true })
            fs.writeFileSync(htmlPath, rendered, 'utf8')
            
            await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
            await page.waitForSelector('.container', { timeout: 10000 })
            
            // 获取实际内容高度
            const bodyHeight = await page.evaluate(() => document.querySelector('.container').offsetHeight)
            await page.setViewport({ width: 1000, height: bodyHeight + 40 })
            
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

export const frameInfo = new FrameInfo()

