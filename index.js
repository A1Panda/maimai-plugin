// 导入 Node.js 的文件系统模块
import fs from 'node:fs'
import { aliasResolver } from './utils/MaimaiAliasResolver.js'
import { deleteTemp, cleanTempFiles } from './utils/deleass.js'
// 初始化配置文件
import { initConfig } from './utils/config.js'

// ASCII 艺术标题
const ASCII_LOGO = `
███╗   ███╗ █████╗ ██╗███╗   ███╗ █████╗ ██╗        ██████╗ ██╗     ██╗   ██╗ ██████╗ ██╗███╗   ██╗
████╗ ████║██╔══██╗██║████╗ ████║██╔══██╗██║        ██╔══██╗██║     ██║   ██║██╔════╝ ██║████╗  ██║
██╔████╔██║███████║██║██╔████╔██║███████║██║        ██████╔╝██║     ██║   ██║██║  ███╗██║██╔██╗ ██║
██║╚██╔╝██║██╔══██║██║██║╚██╔╝██║██╔══██║██║        ██╔═══╝ ██║     ██║   ██║██║   ██║██║██║╚██╗██║
██║ ╚═╝ ██║██║  ██║██║██║ ╚═╝ ██║██║  ██║██║███████╗██║     ███████╗╚██████╔╝╚██████╔╝██║██║ ╚████║
╚═╝     ╚═╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝╚══════╝╚═╝     ╚══════╝ ╚═════╝  ╚═════╝ ╚═╝╚═╝  ╚═══╝
`

// 在控制台打印插件标题
logger.mark(logger.green(ASCII_LOGO))

// 初始化配置文件
initConfig()

// 记录开始时间
const startTime = process.hrtime()

// 清理临时文件
//deleteTemp()    // 清理插件目录的临时文件（已弃用）
cleanTempFiles()  // 清理 Yunzai temp 目录下的临时文件

// 初始化全局 segment 对象
async function initGlobalSegment() {
    if (!global.segment) {
        try {
            global.segment = (await import("icqq")).segment
        } catch {
            global.segment = (await import("oicq")).segment
        }
    }
}

// 加载插件文件
async function loadPlugins() {
    const files = fs.readdirSync('./plugins/maimai-plugin/apps').filter(file => file.endsWith('.js'))
    const imports = await Promise.allSettled(files.map(file => import(`./apps/${file}`)))
    
    let apps = {}
    let successCount = 0
    let hasError = false

    imports.forEach((result, index) => {
        const name = files[index].replace('.js', '')
        if (result.status === 'fulfilled') {
            apps[name] = result.value[Object.keys(result.value)[0]]
            successCount++
        } else {
            logger.error(`[maimai-plugin]载入插件错误：${logger.red(name)}`)
            logger.error(result.reason)
            hasError = true
        }
    })

    return { apps, successCount, hasError }
}

// 显示启动信息
function showStartupInfo(successCount, loadTime) {
    logger.mark(logger.green('[maimai-plugin]------舞萌DX查分器------'))
    logger.mark(logger.green(`[maimai-plugin] MaiMai查分器插件载入成功~`))
    logger.mark(logger.green(`[maimai-plugin] 成功加载了 ${successCount} 个插件~`))
    logger.mark(logger.green(`[maimai-plugin] 插件加载耗时: ${loadTime}ms`))
    logger.mark(logger.green(`[maimai-plugin] 欢迎使用MaiMai查分器插件！`))
    logger.mark(logger.green('[maimai-plugin]------Q群:511802473------'))
}

// 主函数
async function main() {
    // 初始化全局 segment
    await initGlobalSegment()

    // 加载插件
    const { apps, successCount, hasError } = await loadPlugins()

    // 如果没有错误，显示成功信息
    if (!hasError) {
        const endTime = process.hrtime(startTime)
        const loadTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2)
        showStartupInfo(successCount, loadTime)
    }

    
    // 初始化别名解析器
    aliasResolver.init().then(() => {
        logger.mark(logger.green('[maimai-plugin] 别名解析器初始化成功'))
    }).catch(err => {
        logger.error('[maimai-plugin] 初始化别名解析器失败')
        logger.error(err)
    })

    return apps
}

// 执行主函数并导出 apps
export const apps = await main()
