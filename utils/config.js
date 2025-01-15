import fs from 'node:fs'
import path from 'node:path'

// 检查并初始化配置文件
export function initConfig() {
    // 定义配置文件路径
    const configDir = './plugins/maimai-plugin/configs'
    const defaultDir = './plugins/maimai-plugin/configs/defaults'
    
    // 确保配置目录存在
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
    }

    // 如果defaults目录不存在则返回
    if (!fs.existsSync(defaultDir)) {
        return
    }

    // 读取defaults目录下的所有文件
    const defaultFiles = fs.readdirSync(defaultDir)

    // 遍历并复制缺失的配置文件
    defaultFiles.forEach(file => {
        const configPath = path.join(configDir, file)
        const defaultPath = path.join(defaultDir, file)

        // 如果配置文件不存在，则从defaults复制
        if (!fs.existsSync(configPath)) {
            try {
                fs.copyFileSync(defaultPath, configPath)
                logger.info(logger.green(`[maimai-plugin] 已初始化配置文件: ${file}`))
            } catch (err) {
                logger.error(logger.red(`[maimai-plugin] 配置文件初始化失败: ${file}`))
                logger.error(err)
            }
        }
    })
    // 检查userdata.yaml是否存在
    const userdataPath = path.join(configDir, 'userdata.yaml')
    if (!fs.existsSync(userdataPath)) {
        try {
            // 创建空的userdata配置
            fs.writeFileSync(userdataPath, '{}', 'utf8')
            logger.info(logger.green('[maimai-plugin] 已创建userdata.yaml文件'))
        } catch (err) {
            logger.error(logger.red('[maimai-plugin] userdata.yaml文件创建失败'))
            logger.error(err)
        }
    }
}

// 强制重置配置文件
export function resetConfig() {
    // 定义配置文件路径
    const configDir = './plugins/maimai-plugin/configs'
    const defaultDir = './plugins/maimai-plugin/configs/defaults'

    // 如果defaults目录不存在则返回
    if (!fs.existsSync(defaultDir)) {
        logger.error('[maimai-plugin] 默认配置目录不存在')
        return
    }

    // 读取defaults目录下的所有文件
    const defaultFiles = fs.readdirSync(defaultDir)

    // 遍历并强制复制配置文件
    defaultFiles.forEach(file => {
        const configPath = path.join(configDir, file)
        const defaultPath = path.join(defaultDir, file)

        try {
            fs.copyFileSync(defaultPath, configPath)
            logger.info(logger.green(`[maimai-plugin] 已重置配置文件: ${file}`))
        } catch (err) {
            logger.error(logger.red(`[maimai-plugin] 配置文件重置失败: ${file}`))
            logger.error(err)
        }
    })
}
