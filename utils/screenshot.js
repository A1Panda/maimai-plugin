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

            // 设置视窗大小
            await page.setViewport({
                width: 800,
                height: Math.ceil(height)
            })

            // 截图
            const screenshot = await page.screenshot({
                type: 'png',
                fullPage: true
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
        // 扩展数据
        const extendedData = {
            ...data,
            course_ranks: courseRanks,
            class_ranks: classRanks,
            // 格式化时间
            upload_time: new Date(data.upload_time).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        }

        return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
            const keys = key.trim().split('.')
            let value = extendedData
            
            // 特殊处理数组访问
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
            for (const k of keys) {
                value = value?.[k]
            }
            return value ?? '未知'
        })
    }
} 