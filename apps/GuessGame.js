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

    // 检查群聊权限
    async checkGroup(e) {
        if (!e.isGroup) {
            await e.reply('该功能仅支持群聊使用')
            return false
        }
        return true
    }

    // 处理游戏结果
    async handleGameResult(e, result, successCallback = null) {
        if (result.success) {
            // 如果是数组消息（包含文字和媒体），分开发送
            if (Array.isArray(result.message)) {
                await e.reply(result.message[0])
                await e.reply(result.message[1])
            } else {
                await e.reply(result.message)
            }
            // 如果有成功回调，执行它
            if (successCallback) {
                await successCallback()
            }
            return true
        } else {
            await e.reply(result.message)
            return false
        }
    }

    // 通用的游戏启动流程
    async startGameProcess(e, type, initFunction, loadingMessage, readyMessage, readyDelay = 2000) {
        if (!await this.checkGroup(e)) return false

        let msg = await e.reply(loadingMessage, { at: true })
        
        try {
            const result = await initFunction(e.group_id, type)
            
            if (msg?.message_id && e.group) {
                await e.group.recallMsg(msg.message_id)
            }
            
            return await this.handleGameResult(e, result, async () => {
                setTimeout(async () => {
                    if (readyMessage) {
                        await e.reply(readyMessage)
                    }
                    guessGame.setGameReady(e.group_id)
                }, readyDelay)
            })
        } catch (err) {
            logger.error(`[maimai-plugin] 启动${type || ''}游戏失败`)
            logger.error(err)
            await e.reply('启动游戏失败，请稍后再试')
            return false
        }
    }

    // 开始普通游戏
    async startGame(e) {
        const type = e.msg.match(/(歌曲|姓名框|头像|背景)/)[0]
        return await this.startGameProcess(
            e,
            type,
            guessGame.initGame.bind(guessGame),
            '正在初始化游戏，请稍后...',
            null,
            1000
        )
    }

    // 开始图片猜谜游戏
    async startImageGame(e) {
        const type = e.msg.match(/(曲绘图|头像图|姓名框图)/)[0]
        return await this.startGameProcess(
            e,
            type,
            guessGame.initImageGame.bind(guessGame),
            '正在获取图片资源，请稍后...',
            '图片已发送，请仔细看哦~'
        )
    }

    // 开始音乐猜谜游戏
    async startMusicGame(e) {
        return await this.startGameProcess(
            e,
            null,
            guessGame.initMusicGame.bind(guessGame),
            '正在获取音乐资源，请稍后...',
            '音乐已发送，请仔细听哦~'
        )
    }

    // 结束游戏
    async stopGame(e) {
        if (!await this.checkGroup(e)) return false

        try {
            const result = await guessGame.endGame(e.group_id)
            return await this.handleGameResult(e, result)
        } catch (err) {
            logger.error('[maimai-plugin] 结束猜谜游戏失败')
            logger.error(err)
            await e.reply('结束游戏失败，请稍后再试')
            return false
        }
    }

    // 获取提示
    async getHint(e) {
        if (!await this.checkGroup(e)) return false

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
        // 只处理群聊消息且必须@机器人
        if (!e.isGroup || !e.atBot) return false

        // 检查是否有进行中的游戏
        const game = guessGame.games.get(e.group_id)
        if (!game) return false

        try {
            // 检查答案
            const result = await guessGame.checkAnswer(e.group_id, e.msg)
            return await this.handleGameResult(e, result)
        } catch (err) {
            logger.error('[maimai-plugin] 检查答案失败')
            logger.error(err)
            await e.reply('检查答案失败，请稍后再试')
            return false
        }
    }
}
