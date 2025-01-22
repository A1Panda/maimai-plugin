import fs from 'node:fs'
import path from 'node:path'

// 定义常量
const PLUGIN_TEMP = './plugins/maimai-plugin/temp'
const YUNZAI_TEMP = path.join(process.cwd(), 'temp', 'maimai-plugin')

// 删除单个文件或目录
function deleteFileOrDir(filePath) {
    try {
        const stat = fs.lstatSync(filePath)
        if (stat.isDirectory()) {
            return deleteFolderRecursive(filePath)
        } else {
            fs.unlinkSync(filePath)
            return 1
        }
    } catch (err) {
        logger.error(`[maimai-plugin] 删除文件失败: ${filePath}`)
        logger.error(err)
        return 0
    }
}

// 递归删除目录及其内容
function deleteFolderRecursive(folderPath) {
    let count = 0
    if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach((file) => {
            count += deleteFileOrDir(path.join(folderPath, file))
        })
        fs.rmdirSync(folderPath)
    }
    return count
}

// 通用的清理函数
function cleanDirectory(dirPath, type = 'plugin') {
    try {
        if (!fs.existsSync(dirPath)) return 0

        let count = 0
        const files = fs.readdirSync(dirPath)
        
        for (const file of files) {
            count += deleteFileOrDir(path.join(dirPath, file))
        }

        const message = `[maimai-plugin] ${type === 'plugin' ? '插件' : 'Yunzai'}临时文件清理完成，共清理${count}个文件`
        type === 'plugin' ? logger.info(message) : logger.mark(logger.green(message))
        
        return count
    } catch (err) {
        logger.error(`[maimai-plugin] 清理${type === 'plugin' ? '插件' : 'Yunzai'}临时文件失败`)
        logger.error(err)
        return false
    }
}

// 删除插件目录下的临时文件
export function deleteTemp() {
    return cleanDirectory(PLUGIN_TEMP, 'plugin')
}

// 清理 Yunzai temp 目录下的 maimai-plugin 临时文件
export function cleanTempFiles() {
    return cleanDirectory(YUNZAI_TEMP, 'yunzai')
}
