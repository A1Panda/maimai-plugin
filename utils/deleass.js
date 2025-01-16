import fs from 'node:fs'
import path from 'node:path'

// 递归删除目录及其内容,返回删除的文件数
function deleteFolderRecursive(folderPath) {
    let count = 0
    if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach((file) => {
            const curPath = path.join(folderPath, file)
            if (fs.lstatSync(curPath).isDirectory()) {
                // 递归删除子目录
                count += deleteFolderRecursive(curPath)
            } else {
                // 删除文件
                fs.unlinkSync(curPath)
                count++
            }
        })
        // 删除空目录
        fs.rmdirSync(folderPath)
    }
    return count
}

// 删除临时文件
export function deleteTemp() {
    try {
        const tempPath = './plugins/maimai-plugin/temp'
        if (fs.existsSync(tempPath)) {
            let totalFiles = 0
            const files = fs.readdirSync(tempPath)
            for (const file of files) {
                const filePath = path.join(tempPath, file)
                if (fs.lstatSync(filePath).isDirectory()) {
                    // 如果是目录，递归删除
                    totalFiles += deleteFolderRecursive(filePath)
                } else {
                    // 如果是文件，直接删除
                    fs.unlinkSync(filePath)
                    totalFiles++
                }
            }
            logger.info(`[maimai-plugin] 临时文件清理完成,共清理${totalFiles}个文件`)
            return totalFiles
        }
        return 0
    } catch (err) {
        logger.error('[maimai-plugin] 清理临时文件失败')
        logger.error(err)
        return false
    }
}
