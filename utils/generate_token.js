import { CryptoUtil } from './crypto.js'

/**
 * 此脚本用于生成加密后的token
 * 使用方法：
 * 1. 将你的token作为参数传入
 * 2. 运行脚本: node generate_token.js <your_token>
 */

// 从命令行参数获取token
const token = process.argv[2]

if (!token) {
    console.error('请提供token作为参数')
    console.error('使用方法: node generate_token.js <your_token>')
    process.exit(1)
}

// 加密token
const encryptedToken = CryptoUtil.encrypt(token)
console.log('加密后的token:', encryptedToken)

// 测试解密
const decryptedToken = CryptoUtil.decrypt(encryptedToken)
console.log('解密测试是否成功:', decryptedToken === token) 