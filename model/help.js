import fs from 'fs'
import yaml from 'yaml'
import puppeteer from 'puppeteer'
import path from 'path'

export class Help {
    static async render() {
        // 使用Yunzai-Bot的临时文件夹，改为.png后缀
        const helpImagePath = path.join(process.cwd(), 'temp', 'maimai-plugin', `help_${Date.now()}.png`)
        
        // 读取帮助配置文件
        const helpConfig = yaml.parse(fs.readFileSync('./plugins/maimai-plugin/configs/help.yaml', 'utf8'))
        
        // 启动浏览器
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })
        
        try {
            const page = await browser.newPage()
            
            // 读取HTML模板
            let template = fs.readFileSync('./plugins/maimai-plugin/resources/html/help.html', 'utf8')
            
            // 替换标题和页脚
            template = template.replace('{{title}}', helpConfig.title)
                             .replace('{{footer}}', helpConfig.footer + ' v' + JSON.parse(fs.readFileSync('./plugins/maimai-plugin/package.json', 'utf8')).version)
            
            // 处理命令组模板
            let groupsSection = template.match(/{{#groups}}([\s\S]*?){{\/groups}}/)?.[1] || ''
            
            // 生成所有命令组的HTML
            const groupsHtml = helpConfig.groups.map(group => {
                let groupHtml = groupsSection
                    .replace('{{groupTitle}}', group.groupTitle)
                    
                // 处理命令列表
                let commandSection = groupHtml.match(/{{#commands}}([\s\S]*?){{\/commands}}/)?.[1] || ''
                let commandsHtml = group.commands.map(cmd => 
                    commandSection
                        .replace('{{command}}', cmd.command)
                        .replace('{{description}}', cmd.description)
                ).join('')
                
                return groupHtml.replace(/{{#commands}}[\s\S]*?{{\/commands}}/, commandsHtml)
            }).join('')
            
            // 替换整个命令组部分
            template = template.replace(/{{#groups}}[\s\S]*?{{\/groups}}/, groupsHtml)
            
            // 设置页面内容
            await page.setContent(template)
            
            // 设置视口大小
            await page.setViewport({
                width: 700,
                height: 1000
            })
            
            // 等待内容加载完成
            await page.waitForSelector('.container')
            
            // 获取实际内容高度并重设视口
            const bodyHeight = await page.evaluate(() => {
                return document.querySelector('.container').offsetHeight
            })
            await page.setViewport({
                width: 700,
                height: bodyHeight + 40
            })
            
            // 确保临时目录存在
            const dir = path.dirname(helpImagePath)
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true })
            }
            
            // 截图
            await page.screenshot({
                type: 'png',  // 改为png格式
                fullPage: true,
                // 移除quality选项，因为PNG是无损格式
                path: helpImagePath
            })
            
            return helpImagePath
            
        } finally {
            await browser.close()
        }
    }
}
