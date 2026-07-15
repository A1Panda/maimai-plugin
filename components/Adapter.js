import LXAPI from './LXAPI.js'
import SYAPI from './SYAPI.js'
import configManager from './ConfigManager.js'

export default class APIAdapter {
    constructor() {
        // 根据defaultAPI选择API实例
        if (configManager.defaultAPI === 1) {
            this.api = new LXAPI()
        } else if (configManager.defaultAPI === 2) {
            this.api = new SYAPI()
        } else {
            throw new Error('无效的API配置')
        }

        // 使用 Proxy 自动代理所有 api 方法，无需手动逐个声明
        return new Proxy(this, {
            get(target, prop) {
                // 自身属性（如 api）优先
                if (prop in target) return Reflect.get(target, prop)
                // 方法代理到 this.api
                if (typeof target.api[prop] === 'function') {
                    return (...args) => target.api[prop](...args)
                }
            }
        })
    }
}
