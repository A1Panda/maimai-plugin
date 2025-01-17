import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
import APIAdapter from '../components/Adapter.js'

class MusicInfo {
    // 获取音乐信息
    async getMusicInfo(songId) {
        try {
            // 获取用户绑定数据
            const adapter = new APIAdapter()
            const response = await adapter.getSongInfo(songId)
            
            // 获取曲绘资源
            const jacketAsset = await adapter.getJacketAsset(parseInt(songId))

            // 准备渲染数据
            const renderData = {
                // 基础信息
                id: response.id.toString().padStart(4, '0'),
                title: response.title,
                artist: response.artist,
                genre: response.genre,
                bpm: response.bpm,
                // 曲绘转base64
                jacket: `data:image/png;base64,${fs.readFileSync(jacketAsset).toString('base64')}`,
                // 难度信息
                difficulties: {
                    dx: response.difficulties.dx.map(diff => ({
                        ...diff,
                        difficulty_name: (() => {
                            const names = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER']
                            return names[diff.difficulty] || ''
                        })()
                    }))
                }
            }

            // 调试输出
            //logger.info(`[maimai-plugin] 渲染数据: ${JSON.stringify(renderData)}`)

            // 渲染图片
            const renderedImage = await this.render(renderData)
            
            return {
                isImage: true,
                message: renderedImage
            }

        } catch (err) {
            logger.error('[maimai-plugin] 获取歌曲信息失败')
            logger.error(err)
            return {
                isImage: false,
                message: '获取歌曲信息失败，请稍后再试'
            }
        }
    }

    // 渲染图片
    async render(data) {
        const imagePath = path.join(process.cwd(), 'temp', 'maimai-plugin', `musicinfo_${Date.now()}.png`)
        
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
            let template = fs.readFileSync('./plugins/maimai-plugin/resources/html/musicinfo.html', 'utf8')
            
            // 处理基础信息
            template = template.replace(/\{\{title\}\}/g, data.title)
            template = template.replace(/\{\{artist\}\}/g, data.artist)
            template = template.replace(/\{\{id\}\}/g, data.id)
            template = template.replace(/\{\{bpm\}\}/g, data.bpm)
            template = template.replace(/\{\{genre\}\}/g, data.genre)
            template = template.replace(/\{\{jacket\}\}/g, data.jacket)
            
            // 处理难度信息
            const dxSection = template.match(/\{\{#difficulties\.dx\}\}([\s\S]*?)\{\{\/difficulties\.dx\}\}/)?.[1] || ''
            let dxHtml = ''
            
            data.difficulties.dx.forEach(diff => {
                let diffHtml = dxSection
                diffHtml = diffHtml.replace(/\{\{difficulty_name\}\}/g, diff.difficulty_name)
                diffHtml = diffHtml.replace(/\{\{level\}\}/g, diff.level)
                diffHtml = diffHtml.replace(/\{\{level_value\}\}/g, diff.level_value)
                diffHtml = diffHtml.replace(/\{\{notes\.tap\}\}/g, diff.notes.tap)
                diffHtml = diffHtml.replace(/\{\{notes\.hold\}\}/g, diff.notes.hold)
                diffHtml = diffHtml.replace(/\{\{notes\.slide\}\}/g, diff.notes.slide)
                diffHtml = diffHtml.replace(/\{\{notes\.touch\}\}/g, diff.notes.touch)
                diffHtml = diffHtml.replace(/\{\{notes\.break\}\}/g, diff.notes.break)
                diffHtml = diffHtml.replace(/\{\{notes\.total\}\}/g, diff.notes.total)
                dxHtml += diffHtml
            })
            
            template = template.replace(/\{\{#difficulties\.dx\}\}[\s\S]*?\{\{\/difficulties\.dx\}\}/g, dxHtml)
            
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

export const musicInfo = new MusicInfo()

