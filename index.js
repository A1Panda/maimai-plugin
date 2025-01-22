// 导入 Node.js 的文件系统模块
import fs from 'node:fs'
import path from 'node:path'
import { aliasResolver } from './utils/MaimaiAliasResolver.js'
// 初始化配置文件
import { initConfig } from './utils/config.js'

// 在控制台打印插件标题
logger.mark(logger.green(
    '\n' +
    '███╗   ███╗ █████╗ ██╗███╗   ███╗ █████╗ ██╗        ██████╗ ██╗     ██╗   ██╗ ██████╗ ██╗███╗   ██╗\n' +
    '████╗ ████║██╔══██╗██║████╗ ████║██╔══██╗██║        ██╔══██╗██║     ██║   ██║██╔════╝ ██║████╗  ██║\n' +
    '██╔████╔██║███████║██║██╔████╔██║███████║██║        ██████╔╝██║     ██║   ██║██║  ███╗██║██╔██╗ ██║\n' +
    '██║╚██╔╝██║██╔══██║██║██║╚██╔╝██║██╔══██║██║        ██╔═══╝ ██║     ██║   ██║██║   ██║██║██║╚██╗██║\n' +
    '██║ ╚═╝ ██║██║  ██║██║██║ ╚═╝ ██║██║  ██║██║███████╗██║     ███████╗╚██████╔╝╚██████╔╝██║██║ ╚████║\n' +
    '╚═╝     ╚═╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝╚══════╝╚═╝     ╚══════╝ ╚═════╝  ╚═════╝ ╚═╝╚═╝  ╚═══╝\n' +
    '                                                                                                     '

))

// 初始化配置文件
initConfig()

// 记录开始时间
const startTime = process.hrtime()

// 清理临时文件
const cleanTempFiles = () => {
    try {
        const tempDir = path.join(process.cwd(), 'temp', 'maimai-plugin')
        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir)
            for (const file of files) {
                const filePath = path.join(tempDir, file)
                fs.unlinkSync(filePath)
            }
            logger.mark(logger.green('[maimai-plugin] 临时文件清理完成'))
        }
    } catch (err) {
        logger.error('[maimai-plugin] 清理临时文件失败')
        logger.error(err)
    }
}

// 全局 segment 对象初始化
// 用于处理消息段，支持 icqq 和 oicq 两种框架
if (!global.segment) {
    try {
        global.segment = (await import("icqq")).segment
    } catch {
        global.segment = (await import("oicq")).segment
    }
}

//插件作者QQ号：3121280556
//MaiMai查分器插件
//如果有什么好的建议欢迎提出

// 清理临时文件
cleanTempFiles()

// 初始化别名解析器
aliasResolver.init().then(() => {
    logger.mark(logger.green('[maimai-plugin] 别名解析器初始化成功'))
}).catch(err => {
    logger.error('[maimai-plugin] 初始化别名解析器失败')
    logger.error(err)
})

// 读取 apps 目录下所有的 .js 文件
// 使用 fs.readdirSync 同步读取目录内容
const files = fs.readdirSync('./plugins/maimai-plugin/apps').filter(file => file.endsWith('.js'))

// 错误标记，用于跟踪是否有加载错误
let errvis = false

// 存储所有文件的导入 Promise
let ret = []

// 遍历所有文件并导入
files.forEach((file) => {
    ret.push(import(`./apps/${file}`))
})

// 等待所有文件导入完成
// 使用 Promise.allSettled 确保即使部分文件导入失败也不会影响其他文件
ret = await Promise.allSettled(ret)

// 存储所有成功导入的应用
let apps = {}

// 记录成功加载的插件数量
let successCount = 0

// 处理导入结果
for (let i in files) {
    // 获取文件名（不含.js后缀）
    let name = files[i].replace('.js', '')

    // 检查导入是否成功
    if (ret[i].status != 'fulfilled') {
        // 如果导入失败，记录错误日志
        logger.error(`[maimai-plugin]载入插件错误：${logger.red(name)}`)
        logger.error(ret[i].reason)
        errvis = true
        continue
    }
    // 导入成功，将模块添加到 apps 对象中
    apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
    successCount++
}

// 导出 apps 对象，供其他模块使用
export { apps }


// 如果没有发生错误，显示成功信息
if (!errvis) {
    // 计算耗时
    const endTime = process.hrtime(startTime)
    const loadTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2) // 转换为毫秒并保留2位小数
    logger.mark(logger.green('[maimai-plugin]------舞萌DX查分器------'))
    logger.mark(logger.green(`[maimai-plugin] MaiMai查分器插件载入成功~`))
    logger.mark(logger.green(`[maimai-plugin] 成功加载了 ${successCount} 个插件~`))
    logger.mark(logger.green(`[maimai-plugin] 插件加载耗时: ${loadTime}ms`))
    logger.mark(logger.green(`[maimai-plugin] 欢迎使用MaiMai查分器插件！`))
    logger.mark(logger.green('[maimai-plugin]------Q群:511802473------'))
}
