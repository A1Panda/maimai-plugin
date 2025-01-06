export class CryptoUtil {
    /**
     * 编码文本
     * @param {string} text 要编码的文本
     * @returns {string} 编码后的文本
     */
    static encrypt(text) {
        try {
            return Buffer.from(text).toString('base64')
        } catch (error) {
            console.error('编码失败:', error)
            return text
        }
    }

    /**
     * 解码文本
     * @param {string} encoded 编码后的文本
     * @returns {string} 解码后的文本
     */
    static decrypt(encoded) {
        try {
            return Buffer.from(encoded, 'base64').toString('utf8')
        } catch (error) {
            console.error('解码失败:', error)
            return encoded
        }
    }
} 