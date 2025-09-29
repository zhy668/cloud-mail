/**
 * 管理员权限工具类
 * 支持单个管理员邮箱或多个管理员邮箱数组
 */
const adminUtils = {
    /**
     * 检查邮箱是否为管理员
     * @param {Object} c - Hono context
     * @param {string} email - 要检查的邮箱
     * @returns {boolean} 是否为管理员
     */
    isAdmin(c, email) {
        const admin = c.env.admin;
        
        // 如果admin是字符串（单个管理员）
        if (typeof admin === 'string') {
            return email === admin;
        }
        
        // 如果admin是数组（多个管理员）
        if (Array.isArray(admin)) {
            return admin.includes(email);
        }
        
        // 兼容性处理：如果admin未定义或格式错误，返回false
        return false;
    },

    /**
     * 获取所有管理员邮箱列表
     * @param {Object} c - Hono context
     * @returns {string[]} 管理员邮箱数组
     */
    getAdminEmails(c) {
        const admin = c.env.admin;
        
        // 如果admin是字符串（单个管理员）
        if (typeof admin === 'string') {
            return [admin];
        }
        
        // 如果admin是数组（多个管理员）
        if (Array.isArray(admin)) {
            return admin;
        }
        
        // 兼容性处理：如果admin未定义或格式错误，返回空数组
        return [];
    },

    /**
     * 验证用户是否为管理员（抛出异常版本）
     * @param {Object} c - Hono context
     * @param {string} email - 要验证的邮箱
     * @throws {BizError} 如果不是管理员则抛出异常
     */
    async verifyAdmin(c, email) {
        if (!this.isAdmin(c, email)) {
            // 动态导入避免循环依赖
            const { default: BizError } = await import('../error/biz-error.js');
            const { t } = await import('../i18n/i18n.js');
            throw new BizError(t('notAdmin'));
        }
    }
};

export default adminUtils;
