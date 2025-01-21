import APIAdapter from '../components/Adapter.js'
import { aliasResolver } from '../utils/MaimaiAliasResolver.js'
import { musicInfo } from './musicinfo.js'
import { iconInfo } from './iconinfo.js'
import { plateInfo } from './Plateinfo.js'
import { frameInfo } from './frameinfo.js'
import puppeteer from 'puppeteer'
import path from 'path'
import fs from 'fs'

class GuessGame {
    constructor() {
        this.games = new Map() // 存储进行中的游戏 groupId -> gameInfo
    }

    // 初始化游戏
    async initGame(groupId, type) {
        try {
            // 检查是否已有游戏在进行
            if (this.games.has(groupId)) {
                return {
                    success: false,
                    message: '当前已有游戏在进行中'
                }
            }

            // 获取随机资源
            const resource = await this.getRandomResource(type)
            if (!resource) {
                return {
                    success: false,
                    message: '获取随机资源失败'
                }
            }

            // 创建游戏信息
            const gameInfo = {
                type: type,
                resource: resource,
                startTime: Date.now(),
                attempts: 0,
                maxAttempts: 5,
                hints: [],
                status: 'loading' // 添加loading状态
            }

            // 存储游戏信息
            this.games.set(groupId, gameInfo)

            // 生成初始提示
            const hint = await this.generateHint(gameInfo, 0)

            // 在后台打印答案
            logger.mark(logger.yellow('----------------------------------------'))
            logger.mark(logger.yellow(`[maimai-plugin] 群${groupId}的猜${type}游戏答案:`))
            logger.mark(logger.yellow(`答案: ${resource.name || resource.title}`))
            logger.mark(logger.yellow(`ID: ${resource.id}`))
            logger.mark(logger.yellow('----------------------------------------'))

            return {
                success: true,
                message: `猜${type}游戏开始！\n${hint}\n请发送你的答案，你有${gameInfo.maxAttempts}次机会`
            }
        } catch (err) {
            logger.error(`[maimai-plugin] 初始化猜${type}游戏失败`)
            logger.error(err)
            return {
                success: false,
                message: '游戏初始化失败'
            }
        }
    }

    // 获取随机资源
    async getRandomResource(type) {
        try {
            const adapter = new APIAdapter()
            
            switch (type) {
                case '歌曲':
                    const randomSong = aliasResolver.songList[Math.floor(Math.random() * aliasResolver.songList.length)]
                    // 获取详细信息
                    const songInfo = await adapter.getSongInfo(randomSong.id)
                    return {
                        ...randomSong,
                        ...songInfo  // 合并详细信息
                    }
                case '姓名框':
                    return aliasResolver.plateList[Math.floor(Math.random() * aliasResolver.plateList.length)]
                case '头像':
                    return aliasResolver.iconList[Math.floor(Math.random() * aliasResolver.iconList.length)]
                case '背景':
                    return aliasResolver.frameList[Math.floor(Math.random() * aliasResolver.frameList.length)]
                default:
                    return null
            }
        } catch (err) {
            logger.error(`[maimai-plugin] 获取随机${type}失败`)
            logger.error(err)
            return null
        }
    }

    // 生成提示
    async generateHint(gameInfo, hintLevel) {
        const { type, resource } = gameInfo
        let hint = ''

        const generateRequirementHint = (resource) => {
            try {
                if (resource.required?.length > 0) {
                    const req = resource.required[0]
                    let reqText = []
                    
                    // 处理难度要求
                    if (req.difficulties?.length > 0) {
                        const diffNames = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER']
                        const diffs = req.difficulties.map(d => diffNames[d]).join('/')
                        reqText.push(`难度: ${diffs}`)
                    }
                    
                    // 处理评级要求
                    if (req.rate) {
                        reqText.push(`评级: ${req.rate}`)
                    }
                    
                    // 处理FC要求
                    if (req.fc) {
                        const fcMap = {
                            'fc': 'FULL COMBO',
                            'fcp': 'FULL COMBO+',
                            'ap': 'ALL PERFECT',
                            'app': 'ALL PERFECT+'
                        }
                        reqText.push(`完成度: ${fcMap[req.fc] || req.fc.toUpperCase()}`)
                    }
                    
                    // 处理FS要求
                    if (req.fs) {
                        const fsMap = {
                            'fs': 'FULL SYNC',
                            'fsp': 'FULL SYNC+',
                            'fsd': 'FULL SYNC DX',
                            'fsdp': 'FULL SYNC DX+'
                        }
                        reqText.push(`同步率: ${fsMap[req.fs] || req.fs.toUpperCase()}`)
                    }
                    
                    return reqText.join('、') || '获取条件暂未收录'
                }
                return '获取条件暂未收录'
            } catch (err) {
                return '获取条件暂未收录'
            }
        }

        switch (type) {
            case '歌曲':
                switch (hintLevel) {
                    case 0:
                        hint = `这是一首${resource.genre || '未知'}风格的歌曲`
                        break
                    case 1:
                        try {
                            // 获取所有可用的难度数据
                            let difficulties = []
                            
                            // 如果有DX难度，使用DX难度
                            if (resource.difficulties?.dx?.length > 0) {
                                difficulties = resource.difficulties.dx
                            }
                            // 否则使用标准难度
                            else if (resource.difficulties?.standard?.length > 0) {
                                difficulties = resource.difficulties.standard
                            }
                            // 或者使用宴难度
                            else if (resource.difficulties?.utage?.length > 0) {
                                difficulties = resource.difficulties.utage
                            }

                            if (difficulties.length > 0) {
                                // 获取最高难度的定数
                                const maxLevel = Math.max(...difficulties.map(d => d.level_value || parseFloat(d.level) || 0))
                                hint = `最高难度定数为: ${maxLevel.toFixed(1)}`
                            } else {
                                hint = '难度信息暂未收录'
                            }
                        } catch (err) {
                            hint = '难度信息暂未收录'
                        }
                        break
                    case 2:
                        try {
                            const names = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER']
                            let difficulties = []
                            
                            // 获取所有可用的难度数据
                            if (resource.difficulties?.dx?.length > 0) {
                                difficulties = resource.difficulties.dx
                            } else if (resource.difficulties?.standard?.length > 0) {
                                difficulties = resource.difficulties.standard
                            } else if (resource.difficulties?.utage?.length > 0) {
                                difficulties = resource.difficulties.utage
                            }

                            if (difficulties.length > 0) {
                                const diffList = difficulties.map(diff => 
                                    `${names[diff.difficulty] || '未知'}:${diff.level}`
                                ).join('/')
                                hint = `难度列表: ${diffList}`
                            } else {
                                hint = '难度列表暂未收录'
                            }
                        } catch (err) {
                            hint = '难度列表暂未收录'
                        }
                        break
                    case 3:
                        hint = resource.bpm ? `BPM: ${resource.bpm}` : 'BPM信息暂未收录'
                        break
                    case 4:
                        if (resource.title) {
                            const firstChar = resource.title.charAt(0).toUpperCase()
                            hint = `首字母: ${firstChar}`
                        } else {
                            hint = '歌曲信息暂未收录'
                        }
                        break
                    default:
                        hint = '没有更多提示了'
                }
                break
            case '头像':
                switch (hintLevel) {
                    case 0:
                        hint = `这是一个${resource.genre || '未知'}类型的${type}`
                        break
                    case 1:
                        try {
                            if (resource.required?.length > 0) {
                                const req = resource.required[0]
                                let reqText = []
                                
                                // 处理难度要求
                                if (req.difficulties?.length > 0) {
                                    const diffNames = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER']
                                    const diffs = req.difficulties.map(d => diffNames[d]).join('/')
                                    reqText.push(`难度要求: ${diffs}`)
                                }
                                
                                // 处理评级要求
                                if (req.rate) {
                                    reqText.push(`评级要求: ${req.rate}`)
                                }
                                
                                // 处理FC要求
                                if (req.fc) {
                                    const fcMap = {
                                        'fc': 'FULL COMBO',
                                        'fcp': 'FULL COMBO+',
                                        'ap': 'ALL PERFECT',
                                        'app': 'ALL PERFECT+'
                                    }
                                    reqText.push(`完成度要求: ${fcMap[req.fc] || req.fc.toUpperCase()}`)
                                }
                                
                                hint = reqText.join('、') || '获取条件暂未收录'
                            } else {
                                hint = '获取条件暂未收录'
                            }
                        } catch (err) {
                            hint = '获取条件暂未收录'
                        }
                        break
                    case 2:
                        hint = resource.description ? `获取方式: ${resource.description}` : '获取方式暂未收录'
                        break
                    case 3:
                        if (resource.name) {
                            const firstChar = resource.name.charAt(0).toUpperCase()
                            hint = `首字母: ${firstChar}`
                        } else {
                            hint = '头像信息暂未收录'
                        }
                        break
                    default:
                        hint = '没有更多提示了'
                }
                break
            case '姓名框':
            case '背景':
                switch (hintLevel) {
                    case 0:
                        hint = `这是一个${resource.genre || '未知'}类型的${type}`
                        break
                    case 1:
                        hint = generateRequirementHint(resource)
                        break
                    case 2:
                        hint = resource.description ? `获取方式: ${resource.description}` : '获取方式暂未收录'
                        break
                    case 3:
                        if (resource.name) {
                            const firstChar = resource.name.charAt(0).toUpperCase()
                            hint = `首字母: ${firstChar}`
                        } else {
                            hint = `${type}信息暂未收录`
                        }
                        break
                    default:
                        hint = '没有更多提示了'
                }
                break
        }

        return hint
    }

    // 检查答案
    async checkAnswer(groupId, answer) {
        const game = this.games.get(groupId)
        if (!game) {
            return {
                success: false,
                message: '当前没有进行中的游戏'
            }
        }

        // 检查游戏是否还在加载中
        if (game.status === 'loading') {
            let message = ''
            switch (game.type) {
                case '音乐':
                    message = '音频还在发送中，请稍等...'
                    break
                case '曲绘图':
                case '头像图':
                case '姓名框图':
                    message = '图片还在发送中，请稍等...'
                    break
                default:
                    message = '游戏正在初始化，请稍等...'
            }
            return {
                success: false,
                message: message
            }
        }

        // 增加尝试次数
        game.attempts++

        // 检查答案是否正确
        const isCorrect = await this.verifyAnswer(game.type, game.resource, answer)

        if (isCorrect) {
            game.status = 'won'
            this.games.delete(groupId)

            // 根据类型使用不同的信息展示
            const actualType = game.type.endsWith('图') ? game.type.replace('图', '') : game.type
            
            switch (actualType) {
                case '歌曲':
                case '曲绘':
                case '音乐':  // 音乐游戏显示完整信息
                    const songResult = await musicInfo.getMusicInfo(game.resource.id)
                    return {
                        success: true,
                        message: [
                            `恭喜你答对了！\n你用了${game.attempts}次机会`,
                            songResult.isImage ? segment.image(songResult.message) : `正确答案是: ${songResult.songname}`
                        ]
                    }
                case '头像':
                    const iconResult = await iconInfo.getIconInfo(game.resource.id)
                    return {
                        success: true,
                        message: [
                            `恭喜你答对了！\n你用了${game.attempts}次机会`,
                            iconResult.isImage ? segment.image(iconResult.message) : `正确答案是: ${iconResult.name}`
                        ]
                    }
                case '姓名框':
                    const plateResult = await plateInfo.getPlateInfo(game.resource.id)
                    return {
                        success: true,
                        message: [
                            `恭喜你答对了！\n你用了${game.attempts}次机会`,
                            plateResult.isImage ? segment.image(plateResult.message) : `正确答案是: ${plateResult.name}`
                        ]
                    }
                case '背景':
                    const frameResult = await frameInfo.getFrameInfo(game.resource.id)
                    return {
                        success: true,
                        message: [
                            `恭喜你答对了！\n你用了${game.attempts}次机会`,
                            frameResult.isImage ? segment.image(frameResult.message) : `正确答案是: ${frameResult.name}`
                        ]
                    }
                default:
                    return {
                        success: true,
                        message: `恭喜你答对了！\n正确答案是: ${game.resource.name || game.resource.title}\n你用了${game.attempts}次机会`
                    }
            }
        } else {
            if (game.attempts >= game.maxAttempts) {
                this.games.delete(groupId)
                
                // 根据类型使用不同的信息展示
                const actualType = game.type.endsWith('图') ? game.type.replace('图', '') : game.type
                
                switch (actualType) {
                    case '歌曲':
                    case '曲绘':
                    case '音乐':  // 音乐游戏显示完整信息
                        const songResult = await musicInfo.getMusicInfo(game.resource.id)
                        return {
                            success: false,
                            message: [
                                `游戏结束！`,
                                songResult.isImage ? segment.image(songResult.message) : `正确答案是: ${songResult.songname}`
                            ]
                        }
                    case '头像':
                        const iconResult = await iconInfo.getIconInfo(game.resource.id)
                        return {
                            success: false,
                            message: [
                                `游戏结束！`,
                                iconResult.isImage ? segment.image(iconResult.message) : `正确答案是: ${iconResult.name}`
                            ]
                        }
                    case '姓名框':
                        const plateResult = await plateInfo.getPlateInfo(game.resource.id)
                        return {
                            success: false,
                            message: [
                                `游戏结束！`,
                                plateResult.isImage ? segment.image(plateResult.message) : `正确答案是: ${plateResult.name}`
                            ]
                        }
                    case '背景':
                        const frameResult = await frameInfo.getFrameInfo(game.resource.id)
                        return {
                            success: false,
                            message: [
                                `游戏结束！`,
                                frameResult.isImage ? segment.image(frameResult.message) : `正确答案是: ${frameResult.name}`
                            ]
                        }
                    default:
                        return {
                            success: false,
                            message: `游戏结束！\n正确答案是: ${game.resource.name || game.resource.title}`
                        }
                }
            }

            if (game.type === '音乐') {
                // 音乐游戏只返回答案错误提示
                return {
                    success: false,
                    message: `答案错误！\n还剩${game.maxAttempts - game.attempts}次机会`
                }
            } else if (game.type.endsWith('图')) {
                // 如果是图片猜谜游戏，生成新的遮罩图片
                const adapter = new APIAdapter()
                let imageAsset

                switch (game.type) {
                    case '曲绘图':
                        imageAsset = await adapter.getJacketAsset(game.resource.id)
                        break
                    case '头像图':
                        imageAsset = await adapter.getIconAsset(game.resource.id)
                        break
                    case '姓名框图':
                        imageAsset = await adapter.getPlateAsset(game.resource.id)
                        break
                }

                if (imageAsset) {
                    const maskedImage = await this.generateMaskedImage(imageAsset, game.attempts + 1, game.type)
                    if (maskedImage) {
                        return {
                            success: false,
                            message: [
                                `答案错误！\n还剩${game.maxAttempts - game.attempts}次机会`,
                                segment.image(`file://${maskedImage}`)
                            ]
                        }
                    }
                }
            }

            // 普通游戏继续使用文字提示
            const hint = await this.generateHint(game, game.attempts)
            return {
                success: false,
                message: `答案错误！\n新提示: ${hint}\n还剩${game.maxAttempts - game.attempts}次机会`
            }
        }
    }

    // 验证答案
    async verifyAnswer(type, resource, answer) {
        // 将图片类型转换为对应的资源类型
        const actualType = type.endsWith('图') ? type.replace('图', '') : type

        switch (actualType) {
            case '歌曲':
            case '曲绘':  // 曲绘图对应歌曲
            case '音乐':  // 音乐游戏也是猜歌曲
                const song = aliasResolver.searchSong(answer)
                return song && song.id === resource.id
            case '姓名框':
                const plate = aliasResolver.searchPlate(answer)
                return plate && plate.id === resource.id
            case '头像':
                const icon = aliasResolver.searchIcon(answer)
                return icon && icon.id === resource.id
            case '背景':
                const frame = aliasResolver.searchFrame(answer)
                return frame && frame.id === resource.id
            default:
                return false
        }
    }

    // 结束游戏
    async endGame(groupId) {
        const game = this.games.get(groupId)
        if (!game) {
            return {
                success: false,
                message: '当前没有进行中的游戏'
            }
        }

        this.games.delete(groupId)

        // 根据类型使用不同的信息展示
        const actualType = game.type.endsWith('图') ? game.type.replace('图', '') : game.type
        
        switch (actualType) {
            case '歌曲':
            case '音乐':  // 添加音乐游戏的结果展示
                const songResult = await musicInfo.getMusicInfo(game.resource.id)
                return {
                    success: true,
                    message: [
                        `游戏已结束`,
                        songResult.isImage ? segment.image(songResult.message) : `正确答案是: ${songResult.songname}`
                    ]
                }
            case '头像':
                const iconResult = await iconInfo.getIconInfo(game.resource.id)
                return {
                    success: true,
                    message: [
                        `游戏已结束`,
                        iconResult.isImage ? segment.image(iconResult.message) : `正确答案是: ${iconResult.name}`
                    ]
                }
            case '姓名框':
                const plateResult = await plateInfo.getPlateInfo(game.resource.id)
                return {
                    success: true,
                    message: [
                        `游戏已结束`,
                        plateResult.isImage ? segment.image(plateResult.message) : `正确答案是: ${plateResult.name}`
                    ]
                }
            case '背景':
                const frameResult = await frameInfo.getFrameInfo(game.resource.id)
                return {
                    success: true,
                    message: [
                        `游戏已结束`,
                        frameResult.isImage ? segment.image(frameResult.message) : `正确答案是: ${frameResult.name}`
                    ]
                }
            default:
                return {
                    success: true,
                    message: `游戏已结束\n正确答案是: ${game.resource.name || game.resource.title}`
                }
        }
    }

    // 初始化图片猜谜游戏
    async initImageGame(groupId, type) {
        try {
            // 检查是否已有游戏在进行
            if (this.games.has(groupId)) {
                return {
                    success: false,
                    message: '当前已有游戏在进行中'
                }
            }

            // 获取随机资源
            let resource
            switch (type) {
                case '曲绘图':
                    resource = await this.getRandomResource('歌曲')
                    break
                case '头像图':
                    resource = await this.getRandomResource('头像')
                    break
                case '姓名框图':
                    resource = await this.getRandomResource('姓名框')
                    break
                default:
                    return {
                        success: false,
                        message: '不支持的游戏类型'
                    }
            }

            if (!resource) {
                return {
                    success: false,
                    message: '获取随机资源失败'
                }
            }

            // 获取图片资源
            const adapter = new APIAdapter()
            let imageAsset

            switch (type) {
                case '曲绘图':
                    imageAsset = await adapter.getJacketAsset(resource.id)
                    break
                case '头像图':
                    imageAsset = await adapter.getIconAsset(resource.id)
                    break
                case '姓名框图':
                    imageAsset = await adapter.getPlateAsset(resource.id)
                    break
            }

            if (!imageAsset) {
                return {
                    success: false,
                    message: '获取图片资源失败'
                }
            }

            // 创建游戏信息
            const gameInfo = {
                type: type,
                resource: resource,
                startTime: Date.now(),
                attempts: 0,
                maxAttempts: 5,
                status: 'loading',  // 添加loading状态
                imageAsset: imageAsset  // 保存图片资源路径
            }

            // 存储游戏信息
            this.games.set(groupId, gameInfo)

            // 在后台打印答案
            logger.mark(logger.yellow('----------------------------------------'))
            logger.mark(logger.yellow(`[maimai-plugin] 群${groupId}的猜${type}游戏答案:`))
            logger.mark(logger.yellow(`答案: ${resource.name || resource.title}`))
            logger.mark(logger.yellow(`ID: ${resource.id}`))
            logger.mark(logger.yellow('----------------------------------------'))

            // 生成初始遮罩图片（只显示20%）
            const maskedImage = await this.generateMaskedImage(imageAsset, 1, type)
            if (!maskedImage) {
                return {
                    success: false,
                    message: '生成图片提示失败'
                }
            }

            // 返回遮罩图片作为提示
            return {
                success: true,
                message: [
                    `猜${type}游戏开始！\n请根据图片猜测答案，你有${gameInfo.maxAttempts}次机会`,
                    segment.image(`file://${maskedImage}`)
                ]
            }
        } catch (err) {
            logger.error(`[maimai-plugin] 初始化猜${type}游戏失败`)
            logger.error(err)
            return {
                success: false,
                message: '游戏初始化失败'
            }
        }
    }

    // 生成带遮罩的图片提示
    async generateMaskedImage(imageAsset, hintLevel, type) {
        try {
            // 启动浏览器
            const browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            })

            try {
                const page = await browser.newPage()
                
                // 根据类型设置不同的尺寸
                let width, height
                if (type === '姓名框图') {
                    width = 720
                    height = 116  // 使用正确的姓名框比例
                } else {
                    width = 500
                    height = 500  // 其他类型保持正方形
                }
                
                // 创建HTML模板，根据提示等级调整遮罩效果
                const html = `
                <html>
                <body style="margin:0;padding:0;background:#000000;">
                    <div style="position:relative;width:${width}px;height:${height}px;overflow:hidden;">
                        <img src="data:image/png;base64,${fs.readFileSync(imageAsset).toString('base64')}" 
                             style="width:100%;height:100%;object-fit:contain;">
                        ${this.generateMaskStyle(hintLevel, width, height)}
                    </div>
                </body>
                </html>`

                await page.setContent(html)
                await page.setViewport({ width, height })

                // 确保临时目录存在
                const tempDir = path.join(process.cwd(), 'temp', 'maimai-plugin')
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true })
                }

                // 生成图片
                const imagePath = path.join(tempDir, `guess_hint_${Date.now()}.png`)
                await page.screenshot({
                    path: imagePath,
                    type: 'png'
                })

                return imagePath
            } finally {
                await browser.close()
            }
        } catch (err) {
            logger.error(`[maimai-plugin] 生成遮罩图片失败: ${err}`)
            return null
        }
    }

    // 根据提示等级生成不同的遮罩样式
    generateMaskStyle(hintLevel, width, height) {
        // 总共有5个提示等级,用于计算遮罩区块显示的数量
        const totalHints = 5
        const maskStyles = []
        
        // 根据图片类型调整遮罩块大小
        const size = height <= 200 ? 40 : 100  // 姓名框使用更小的遮罩块
        const cols = Math.ceil(width / size)
        const rows = Math.ceil(height / size)
        const total = cols * rows
        
        // 根据提示等级计算要显示的区块数量
        const visibleBlocks = Math.floor(total * (hintLevel / totalHints))
        
        // 生成所有可能的位置
        let positions = []
        for (let i = 0; i < total; i++) {
            positions.push(i)
        }
        
        // 随机选择要遮罩的位置
        for (let i = 0; i < total - visibleBlocks; i++) {
            const idx = Math.floor(Math.random() * positions.length)
            const pos = positions.splice(idx, 1)[0]
            const row = Math.floor(pos / cols)
            const col = pos % cols
            
            maskStyles.push(`
                <div style="
                    position: absolute;
                    left: ${col * size}px;
                    top: ${row * size}px;
                    width: ${size}px;
                    height: ${size}px;
                    background: #000000;
                    z-index: 1;
                "></div>
            `)
        }
        
        return maskStyles.join('')
    }

    // 初始化音乐猜谜游戏
    async initMusicGame(groupId) {
        try {
            // 检查是否已有游戏在进行
            if (this.games.has(groupId)) {
                return {
                    success: false,
                    message: '当前已有游戏在进行中'
                }
            }

            // 获取随机歌曲
            const resource = await this.getRandomResource('歌曲')
            if (!resource) {
                return {
                    success: false,
                    message: '获取随机资源失败'
                }
            }

            // 获取音频资源
            const adapter = new APIAdapter()
            const musicAsset = await adapter.getMusicAsset(resource.id)

            if (!musicAsset) {
                return {
                    success: false,
                    message: '获取音频资源失败'
                }
            }

            // 创建游戏信息
            const gameInfo = {
                type: '音乐',
                resource: resource,
                startTime: Date.now(),
                attempts: 0,
                maxAttempts: 5,
                status: 'loading',  // 添加loading状态表示音频正在发送
                musicAsset: musicAsset  // 保存音频资源路径
            }

            // 存储游戏信息
            this.games.set(groupId, gameInfo)

            // 在后台打印答案
            logger.mark(logger.yellow('----------------------------------------'))
            logger.mark(logger.yellow(`[maimai-plugin] 群${groupId}的猜音乐游戏答案:`))
            logger.mark(logger.yellow(`答案: ${resource.title}`))
            logger.mark(logger.yellow(`ID: ${resource.id}`))
            logger.mark(logger.yellow('----------------------------------------'))

            // 返回音频作为提示
            return {
                success: true,
                message: [
                    `猜音乐游戏开始！\n请根据音频猜测歌曲名称，你有${gameInfo.maxAttempts}次机会`,
                    segment.record(`file://${musicAsset}`)
                ]
            }
        } catch (err) {
            logger.error(`[maimai-plugin] 初始化猜音乐游戏失败`)
            logger.error(err)
            return {
                success: false,
                message: '游戏初始化失败'
            }
        }
    }

    // 添加新方法：设置音乐游戏为就绪状态
    setMusicGameReady(groupId) {
        const game = this.games.get(groupId)
        if (game && game.type === '音乐' && game.status === 'loading') {
            game.status = 'playing'
        }
    }

    // 设置游戏为就绪状态
    setGameReady(groupId) {
        const game = this.games.get(groupId)
        if (game && game.status === 'loading') {
            game.status = 'playing'
        }
    }
}

export const guessGame = new GuessGame()
