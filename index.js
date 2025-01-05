// 导入 Node.js 的文件系统模块
import fs from 'node:fs'

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

// 在控制台打印插件标题
logger.mark('------舞萌DX查分器------')

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
}

// 导出 apps 对象，供其他模块使用
export { apps }

// 如果没有发生错误，显示成功信息
if (!errvis) {
    logger.mark(` MaiMai查分器插件载入成功~`)
    logger.mark(` 欢迎使用MaiMai查分器插件！`)
}
