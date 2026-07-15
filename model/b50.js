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

    // 下载网络图片并转为 base64 data URI（不存本地文件）
    async _fetchImageAsDataURI(url, timeoutMs = 10000) {
        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), timeoutMs)
            const resp = await fetch(url, { signal: controller.signal })
            clearTimeout(timeout)
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
            const buf = Buffer.from(await resp.arrayBuffer())
            const contentType = resp.headers.get('content-type') || 'image/png'
            return `data:${contentType};base64,${buf.toString('base64')}`
        } catch (e) {
            logger.warn(`[b50] 下载图片失败: ${url} - ${e.message}`)
            return ''
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
            const playerInfo = await adapter.getPlayerInfo(userData[userId].friendCode)

            // 预下载头像/姓名框/背景框为 base64 data URI（避免 Puppeteer 网络问题）
            const [iconDataURI, plateDataURI, frameDataURI] = await Promise.all([
                playerInfo.data.icon?.id ? this._fetchImageAsDataURI(`${adapter.getAssetsBaseURL()}/icon/${playerInfo.data.icon.id}.png`) : Promise.resolve(''),
                playerInfo.data.name_plate?.id ? this._fetchImageAsDataURI(`${adapter.getAssetsBaseURL()}/plate/${playerInfo.data.name_plate.id}.png`) : Promise.resolve(''),
                playerInfo.data.frame?.id ? this._fetchImageAsDataURI(`${adapter.getAssetsBaseURL()}/frame/${playerInfo.data.frame.id}.png`) : Promise.resolve('')
            ])
            
            // 处理标准谱和DX谱的数据（jacket 下载为 base64）
            const processSong = async (song) => {
                const fcIcon = song.fc ? await adapter.getMusicIconAsset(song.fc) : null
                const fsIcon = song.fs ? await adapter.getMusicIconAsset(song.fs) : null
                const rateIcon = await adapter.getMusicRateAsset(song.rate)
                const levelNum = String(song.level || '0').replace(/[^0-9]/g, '') || '0'

                // 预下载曲绘为 base64 data URI（多源 fallback）
                let jacketDataURI = await this._fetchImageAsDataURI(
                    `https://maimai.lxns.net/assets/maimai/jacket/${song.id}.png`
                )
                if (!jacketDataURI) {
                    jacketDataURI = await this._fetchImageAsDataURI(`https://maimai.diving-fish.com/covers/${song.id}.png`)
                }
                if (!jacketDataURI) {
                    jacketDataURI = await this._fetchImageAsDataURI(`https://assets2.lxns.net/maimai/jacket/${song.id}.png`)
                }

                return {
                    ...song,
                    song_id: String(song.id).padStart(5, '0'),
                    level_num: levelNum,
                    jacket_url: jacketDataURI,
                    fc_icon: fcIcon ? `data:image/webp;base64,${fs.readFileSync(fcIcon).toString('base64')}` : '',
                    fs_icon: fsIcon ? `data:image/webp;base64,${fs.readFileSync(fsIcon).toString('base64')}` : '',
                    rate_icon: `data:image/webp;base64,${fs.readFileSync(rateIcon).toString('base64')}`
                }
            }

            const processedStandard = await Promise.all(response.data.standard.map(processSong))
            const processedDX = await Promise.all(response.data.dx.map(processSong))

            // 添加序号
            processedStandard.forEach((s, i) => s.index = i + 1)
            processedDX.forEach((s, i) => s.index = i + 1)

            // 准备渲染数据
            const renderData = {
                // 用户信息
                nickname: playerInfo.data.name,
                rating: playerInfo.data.rating,
                iconAsset: iconDataURI,
                plateAsset: plateDataURI,
                frameAsset: frameDataURI,
                // B50数据
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
                '--disable-web-security'
            ]
        })
        
        try {
            const page = await browser.newPage()
            await page.setDefaultNavigationTimeout(15000)
            
            // 统计 base64 长度辅助调试
            let embeddedCount = 0, emptyCount = 0
            if (data.iconAsset?.startsWith('data:')) embeddedCount++
            if (data.plateAsset?.startsWith('data:')) embeddedCount++
            data.standard.forEach(s => s.jacket_url?.startsWith('data:') ? embeddedCount++ : emptyCount++)
            data.dx.forEach(s => s.jacket_url?.startsWith('data:') ? embeddedCount++ : emptyCount++)
            logger.info(`[b50] 图片嵌入: ${embeddedCount}/${embeddedCount + emptyCount} base64, ${emptyCount} 缺失`)
            
            // 读取HTML模板
            let template = fs.readFileSync('./plugins/maimai-plugin/resources/html/b50.html', 'utf8')
            
            // 替换用户信息和基础数据
            template = template.replace(/\{\{nickname\}\}/g, data.nickname)
            template = template.replace(/\{\{rating\}\}/g, data.rating)
            template = template.replace(/\{\{iconAsset\}\}/g, data.iconAsset || '')
            template = template.replace(/\{\{plateAsset\}\}/g, data.plateAsset || '')
            // 处理背景框，有则显示否则清空
            template = template.replace(
                /\{\{#frameAsset\}\}([\s\S]*?)\{\{\/frameAsset\}\}/g,
                (_, inner) => data.frameAsset ? inner.replace(/\{\{frameAsset\}\}/g, data.frameAsset) : ''
            )
            template = template.replace(/\{\{standard_total\}\}/g, data.standard_total)
            template = template.replace(/\{\{dx_total\}\}/g, data.dx_total)
            
            // 处理标准谱面列表
            const standardSection = template.match(/\{\{#standard\}\}([\s\S]*?)\{\{\/standard\}\}/)?.[1] || ''
            let standardHtml = ''
            data.standard.forEach(song => {
                let songHtml = standardSection
                songHtml = songHtml.replace(/\{\{song_name\}\}/g, song.song_name)
                songHtml = songHtml.replace(/\{\{song_id\}\}/g, song.song_id)
                songHtml = songHtml.replace(/\{\{jacket_url\}\}/g, song.jacket_url || '')
                songHtml = songHtml.replace(/\{\{level\}\}/g, song.level)
                songHtml = songHtml.replace(/\{\{level_num\}\}/g, song.level_num)
                songHtml = songHtml.replace(/\{\{dx_score\}\}/g, song.dx_score)
                songHtml = songHtml.replace(/\{\{dx_rating\}\}/g, song.dx_rating.toFixed(2))
                songHtml = songHtml.replace(/\{\{achievements\}\}/g, song.achievements.toFixed(4))

                // FC/FS图标：有图标时直接替换为img标签，没有时清空
                songHtml = songHtml.replace(
                    /\{\{#fc\}\}([\s\S]*?)\{\{\/fc\}\}/g,
                    song.fc_icon ? `<img src="${song.fc_icon}" alt="FC">` : ''
                )
                songHtml = songHtml.replace(
                    /\{\{#fs\}\}([\s\S]*?)\{\{\/fs\}\}/g,
                    song.fs_icon ? `<img src="${song.fs_icon}" alt="FS">` : ''
                )

                songHtml = songHtml.replace(/\{\{rate_icon\}\}/g, song.rate_icon)
                songHtml = songHtml.replace(/\{\{rate\}\}/g, song.rate)
                songHtml = songHtml.replace(/\{\{index\}\}/g, song.index)

                standardHtml += songHtml
            })
            template = template.replace(/\{\{#standard\}\}[\s\S]*?\{\{\/standard\}\}/g, standardHtml)

            // 处理DX谱面列表
            const dxSection = template.match(/\{\{#dx\}\}([\s\S]*?)\{\{\/dx\}\}/)?.[1] || ''
            let dxHtml = ''
            data.dx.forEach(song => {
                let songHtml = dxSection
                songHtml = songHtml.replace(/\{\{song_name\}\}/g, song.song_name)
                songHtml = songHtml.replace(/\{\{song_id\}\}/g, song.song_id)
                songHtml = songHtml.replace(/\{\{jacket_url\}\}/g, song.jacket_url || '')
                songHtml = songHtml.replace(/\{\{level\}\}/g, song.level)
                songHtml = songHtml.replace(/\{\{level_num\}\}/g, song.level_num)
                songHtml = songHtml.replace(/\{\{dx_score\}\}/g, song.dx_score)
                songHtml = songHtml.replace(/\{\{dx_rating\}\}/g, song.dx_rating.toFixed(2))
                songHtml = songHtml.replace(/\{\{achievements\}\}/g, song.achievements.toFixed(4))

                songHtml = songHtml.replace(
                    /\{\{#fc\}\}([\s\S]*?)\{\{\/fc\}\}/g,
                    song.fc_icon ? `<img src="${song.fc_icon}" alt="FC">` : ''
                )
                songHtml = songHtml.replace(
                    /\{\{#fs\}\}([\s\S]*?)\{\{\/fs\}\}/g,
                    song.fs_icon ? `<img src="${song.fs_icon}" alt="FS">` : ''
                )

                songHtml = songHtml.replace(/\{\{rate_icon\}\}/g, song.rate_icon)
                songHtml = songHtml.replace(/\{\{rate\}\}/g, song.rate)
                songHtml = songHtml.replace(/\{\{index\}\}/g, song.index)

                dxHtml += songHtml
            })
            template = template.replace(/\{\{#dx\}\}[\s\S]*?\{\{\/dx\}\}/g, dxHtml)
            
            // 设置页面内容
            await page.setContent(template, { waitUntil: 'networkidle0', timeout: 15000 })
            
            // 设置视口大小（与CSS容器宽度1400px匹配）
            await page.setViewport({
                width: 1450,
                height: 800
            })
            
            // 确保 .container 已渲染
            await page.waitForSelector('.container', { timeout: 10000 })
            
            // 确保临时目录存在
            const dir = path.dirname(imagePath)
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true })
            }
            
            // 直接对 .container 元素截图，消除白边
            const container = await page.$('.container')
            await container.screenshot({
                path: imagePath,
                type: 'png'
            })
            
            logger.info(`[b50] 渲染完成: ${imagePath}`)
            return imagePath
            
        } finally {
            await browser.close()
        }
    }

}

export const b50 = new B50()
