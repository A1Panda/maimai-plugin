import plugin from '../../../lib/plugins/plugin.js'
import { guessGame } from '../model/GuessGame.js'

export class GuessGameHandler extends plugin {
    constructor() {
        super({
            name: 'maimai-guess',
            dsc: 'maimai猜谜游戏',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#?mai(mai)? ?(猜|guess) ?(歌曲|姓名框|头像|背景)$',
                    fnc: 'startGame'
                },
                {
                    reg: '^#?mai(mai)? ?(猜|guess) ?(曲绘图|头像图|姓名框图)$',
                    fnc: 'startImageGame'
                },
                {
                    reg: '^#?mai(mai)? ?(猜|guess) ?(音乐)$',
                    fnc: 'startMusicGame'
                },
                {
                    reg: '^#?mai(mai)? ?(结束|停止|取消|end|stop) ?(猜|guess)?$',
                    fnc: 'stopGame'
                },
                {
                    reg: '^#?mai(mai)? ?(提示|hint)$',
                    fnc: 'getHint'
                }
            ]
        })
    }

    // 开始游戏
    async startGame(e) {
        // 只允许群聊使用
        if (!e.isGroup) {
            await e.reply('该功能仅支持群聊使用')
            return false
        }

        let msg = await e.reply('正在处理数据请稍后...', { at: true })
        setTimeout(() => {
            if (msg?.message_id && e.group) e.group.recallMsg(msg.message_id)
        }, 6000)

        try {
            // 获取游戏类型
            const type = e.msg.match(/(歌曲|姓名框|头像|背景)/)[0]

            // 初始化游戏
            const result = await guessGame.initGame(e.group_id, type)
            await e.reply(result.message)

            return true
        } catch (err) {
            logger.error('[maimai-plugin] 启动猜谜游戏失败')
            logger.error(err)
            await e.reply('启动游戏失败，请稍后再试')
            return false
        }
    }

    // 开始图片猜谜游戏
    async startImageGame(e) {
        // 只允许群聊使用
        if (!e.isGroup) {
            await e.reply('该功能仅支持群聊使用')
            return false
        }

        let msg = await e.reply('正在处理数据请稍后...', { at: true })
        setTimeout(() => {
            if (msg?.message_id && e.group) e.group.recallMsg(msg.message_id)
        }, 6000)

        try {
            // 获取游戏类型
            const type = e.msg.match(/(曲绘图|头像图|姓名框图)/)[0]

            // 初始化游戏
            const result = await guessGame.initImageGame(e.group_id, type)
            await e.reply(result.message)

            return true
        } catch (err) {
            logger.error('[maimai-plugin] 启动图片猜谜游戏失败')
            logger.error(err)
            await e.reply('启动游戏失败，请稍后再试')
            return false
        }
    }

    // 开始音乐猜谜游戏
    async startMusicGame(e) {
        // 只允许群聊使用
        if (!e.isGroup) {
            await e.reply('该功能仅支持群聊使用')
            return false
        }

        let msg = await e.reply('正在获取音乐资源，请稍后...', { at: true })
        
        try {
            // 初始化游戏
            const result = await guessGame.initMusicGame(e.group_id)
            
            // 先撤回提示消息
            if (msg?.message_id && e.group) {
                await e.group.recallMsg(msg.message_id)
            }
            
            // 发送游戏消息
            await e.reply(result.message)
            
            // 延迟发送提示并设置游戏状态为就绪
            setTimeout(async () => {
                await e.reply('音乐已发送，请仔细听哦~')
                guessGame.setMusicGameReady(e.group_id)
            }, 2000)

            return true
        } catch (err) {
            logger.error('[maimai-plugin] 启动音乐猜谜游戏失败')
            logger.error(err)
            await e.reply('启动游戏失败，请稍后再试')
            return false
        }
    }

    // 结束游戏
    async stopGame(e) {
        // 只允许群聊使用
        if (!e.isGroup) {
            await e.reply('该功能仅支持群聊使用')
            return false
        }

        try {
            const result = await guessGame.endGame(e.group_id)
            await e.reply(result.message)
            return true
        } catch (err) {
            logger.error('[maimai-plugin] 结束猜谜游戏失败')
            logger.error(err)
            await e.reply('结束游戏失败，请稍后再试')
            return false
        }
    }

    // 获取提示
    async getHint(e) {
        // 只允许群聊使用
        if (!e.isGroup) {
            await e.reply('该功能仅支持群聊使用')
            return false
        }

        try {
            const game = guessGame.games.get(e.group_id)
            if (!game) {
                await e.reply('当前没有进行中的游戏')
                return false
            }

            const hint = await guessGame.generateHint(game, game.attempts)
            await e.reply(`当前提示: ${hint}\n还剩${game.maxAttempts - game.attempts}次机会`)
            return true
        } catch (err) {
            logger.error('[maimai-plugin] 获取提示失败')
            logger.error(err)
            await e.reply('获取提示失败，请稍后再试')
            return false
        }
    }

    // 接收消息
    async accept(e) {
        // 只处理群聊消息
        if (!e.isGroup) return false

        // 检查是否有进行中的游戏
        const game = guessGame.games.get(e.group_id)
        if (!game) return false

        try {
            // 检查答案
            const result = await guessGame.checkAnswer(e.group_id, e.msg)
            await e.reply(result.message)
            return true
        } catch (err) {
            logger.error('[maimai-plugin] 检查答案失败')
            logger.error(err)
            await e.reply('检查答案失败，请稍后再试')
            return false
        }
    }
}
