import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import { courseRanks, classRanks } from './maps.js'

export class ScreenshotManager {
    /**
     * 渲染HTML并截图
     * @param {Object} data 要渲染的数据
     * @param {string} template HTML模板名称
     * @returns {Promise<Buffer>} 图片buffer
     */
    static async makeImage(data, template = 'player-info.html') {
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })
        try {
            const page = await browser.newPage()
            
            // 读取模板
            const templatePath = path.join(process.cwd(), 'plugins/maimai-plugin/resources/html', template)
            let html = fs.readFileSync(templatePath, 'utf8')

            // 替换模板变量
            html = this.replaceTemplateVars(html, data)

            // 设置页面内容
            await page.setContent(html, { waitUntil: 'networkidle0' })

            // 获取内容高度
            const bodyHandle = await page.$('body')
            const { height } = await bodyHandle.boundingBox()
            await bodyHandle.dispose()

            // 根据不同模板设置不同的视窗宽度
            let viewportWidth = 600  // 默认宽度
            if (template === 'player-info.html') {
                viewportWidth = 800  // 玩家信息页面使用更宽的视窗
            } else if (template === 'b50-info.html') {
                viewportWidth = 700  // B50页面使用中等宽度
            }

            // 设置视窗大小
            await page.setViewport({
                width: viewportWidth,
                height: Math.ceil(height)
            })

            // 获取实际内容区域
            const containerHandle = await page.$('.container')
            const containerBox = await containerHandle.boundingBox()
            await containerHandle.dispose()

            // 截图
            const screenshot = await page.screenshot({
                type: 'png',
                clip: {
                    x: containerBox.x,
                    y: containerBox.y,
                    width: Math.ceil(containerBox.width),
                    height: Math.ceil(containerBox.height)
                }
            })

            return screenshot
        } finally {
            await browser.close()
        }
    }

    /**
     * 替换模板变量
     * @param {string} template 模板字符串
     * @param {Object} data 数据对象
     * @returns {string} 替换后的字符串
     */
    static replaceTemplateVars(template, data) {
        // 处理歌曲数据
        if (data.songs) {
            // 生成歌曲列表HTML
            const songsHtml = data.songs.map(song => `
                <div class="song-item">
                    <div class="song-title">
                        <span>#${song.index}</span>
                        <span>${song.song_name}</span>
                    </div>
                    <div class="song-info">
                        <div class="info-item">
                            <div class="info-label">难度</div>
                            <div class="info-value">${song.level} (${song.type})</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">成绩</div>
                            <div class="info-value">${Number(song.achievements).toFixed(4)}% [${song.rate.toUpperCase()}]</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">评价</div>
                            <div class="info-value">${Number(song.dx_rating).toFixed(2)} (${this.formatFCStatus(song.fc, song.fs)})</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">游玩时间</div>
                            <div class="info-value">${song.play_time ? new Date(song.play_time).toLocaleString('zh-CN', {
                                timeZone: 'Asia/Shanghai',
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                            }) : '未知'}</div>
                        </div>
                    </div>
                </div>
            `).join('')

            // 替换歌曲列表标记
            template = template.replace(/{{#songs}}[\s\S]*?{{\/songs}}/g, songsHtml)
        }

        // 处理帮助菜单数据
        if (data.sections) {
            // 生成帮助菜单HTML
            const sectionsHtml = data.sections.map(section => `
                <div class="section">
                    <div class="section-title">${section.title}</div>
                    <div class="command-list">
                        ${section.commands.map(cmd => `
                            <div class="command-item">
                                <span class="command">${cmd.cmd}</span>
                                <span class="description">${cmd.desc}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')

            // 替换帮助菜单标记
            template = template.replace(/{{#sections}}[\s\S]*?{{\/sections}}/g, sectionsHtml)
        }

        // 扩展数据
        const extendedData = {
            ...data,
            course_ranks: courseRanks,
            class_ranks: classRanks,
            // 格式化时间
            upload_time: data.upload_time ? new Date(data.upload_time).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : ''
        }

        // 替换其他变量
        return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
            // 处理数组访问
            if (key.includes('[') && key.includes(']')) {
                const [arrayName, indexName] = key.split('[')
                const index = parseInt(indexName.replace(']', ''))
                if (arrayName === 'course_ranks') {
                    return courseRanks[data.course_rank] || '未知'
                }
                if (arrayName === 'class_ranks') {
                    return classRanks[data.class_rank] || '未知'
                }
            }

            // 常规属性访问
            const keys = key.trim().split('.')
            let value = extendedData
            for (const k of keys) {
                value = value?.[k]
            }
            return value ?? ''
        })
    }

    /**
     * 格式化 FC/FS 状态
     * @param {string} fc FC状态
     * @param {string} fs FS状态
     * @returns {string} 格式化后的状态
     */
    static formatFCStatus(fc, fs) {
        const status = []
        if (fc) status.push(fc.toUpperCase())
        if (fs) status.push(fs.toUpperCase())
        return status.length ? status.join('/') : '-'
    }
} 