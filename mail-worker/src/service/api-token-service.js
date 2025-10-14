import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';
import userService from './user-service';
import roleService from './role-service';
import adminUtils from '../utils/admin-utils';
import cryptoUtils from '../utils/crypto-utils';
import { isDel } from '../const/entity-const';
import { v4 as uuidv4 } from 'uuid';
import orm from '../entity/orm';
import user from '../entity/user';
import { eq } from 'drizzle-orm';
import KvConst from '../const/kv-const';

const apiTokenService = {
	/**
	 * 生成用户API Token
	 * @param {Object} c - Hono context
	 * @param {Object} params - { email, password }
	 * @returns {Object} { token, userId }
	 */
	async generateToken(c, params) {
		const { email, password } = params;

		if (!email || !password) {
			throw new BizError(t('emailAndPwdEmpty'));
		}

		// 验证用户
		const userRow = await userService.selectByEmailIncludeDel(c, email);

		if (!userRow || userRow.isDel === isDel.DELETE) {
			throw new BizError(t('notExistUser'));
		}

		if (!await cryptoUtils.verifyPassword(password, userRow.salt, userRow.password)) {
			throw new BizError(t('IncorrectPwd'));
		}

		// 检查用户角色的API权限
		const roleRow = await roleService.selectById(c, userRow.type);

		if (!roleRow) {
			throw new BizError(t('roleNotExist'));
		}

		// 非管理员需要检查API权限
		if (!adminUtils.isAdmin(c, userRow.email) && roleRow.enableApi !== 1) {
			console.log(`[API Permission Denied] User: ${userRow.email}, Role: ${roleRow.name}, EnableApi: ${roleRow.enableApi}`);
			throw new BizError(t('apiPermissionDenied'), 403);
		}

		// 生成新的API Token
		const apiToken = uuidv4();

		// 保存到数据库
		await orm(c)
			.update(user)
			.set({ apiToken })
			.where(eq(user.userId, userRow.userId))
			.run();

		// 同时保存到KV，用于快速验证
		await c.env.kv.put(KvConst.USER_API_TOKEN + apiToken, JSON.stringify({
			userId: userRow.userId,
			email: userRow.email
		}));

		return { 
			token: apiToken,
			userId: userRow.userId
		};
	},

	/**
	 * 验证API Token
	 * @param {Object} c - Hono context
	 * @param {string} token - API Token
	 * @returns {Object|null} { userId, email } or null
	 */
	async verifyToken(c, token) {
		if (!token) {
			return null;
		}

		try {
			// 先从KV中查询（快速验证）
			const kvData = await c.env.kv.get(KvConst.USER_API_TOKEN + token, { type: 'json' });

			if (kvData) {
				// 验证用户是否仍然存在且未被删除
				const userRow = await userService.selectById(c, kvData.userId);
				if (userRow) {
					// 检查用户角色的API权限
					const roleRow = await roleService.selectById(c, userRow.type);

					// 非管理员需要检查API权限
					if (!adminUtils.isAdmin(c, userRow.email) && (!roleRow || roleRow.enableApi !== 1)) {
						console.log(`[API Token Verify Failed] User: ${userRow.email}, Role: ${roleRow?.name || 'N/A'}, EnableApi: ${roleRow?.enableApi || 'N/A'}`);
						return null;
					}

					return {
						userId: kvData.userId,
						email: kvData.email
					};
				}
			}

			// KV中没有，从数据库查询
			const userRow = await orm(c)
				.select()
				.from(user)
				.where(eq(user.apiToken, token))
				.get();

			if (!userRow || userRow.isDel === isDel.DELETE || !userRow.apiToken) {
				return null;
			}

			// 检查用户角色的API权限
			const roleRow = await roleService.selectById(c, userRow.type);

			// 非管理员需要检查API权限
			if (!adminUtils.isAdmin(c, userRow.email) && (!roleRow || roleRow.enableApi !== 1)) {
				console.log(`[API Token Verify Failed] User: ${userRow.email}, Role: ${roleRow?.name || 'N/A'}, EnableApi: ${roleRow?.enableApi || 'N/A'}`);
				return null;
			}

			// 只有当数据库中有token时才更新KV缓存
			// 这样可以避免已撤销的token被重新激活
			await c.env.kv.put(KvConst.USER_API_TOKEN + token, JSON.stringify({
				userId: userRow.userId,
				email: userRow.email
			}));

			return {
				userId: userRow.userId,
				email: userRow.email
			};
		} catch (error) {
			console.error('API Token verification error:', error);
			return null;
		}
	},

	/**
	 * 撤销用户的API Token
	 * @param {Object} c - Hono context
	 * @param {number} userId - 用户ID
	 */
	async revokeToken(c, userId) {
		// 获取当前token
		const userRow = await userService.selectById(c, userId);
		
		if (userRow && userRow.apiToken) {
			// 从KV中删除
			await c.env.kv.delete(KvConst.USER_API_TOKEN + userRow.apiToken);
		}

		// 从数据库中清除
		await orm(c)
			.update(user)
			.set({ apiToken: null })
			.where(eq(user.userId, userId))
			.run();
	},

	/**
	 * 通过邮箱和密码撤销Token
	 * @param {Object} c - Hono context
	 * @param {Object} params - { email, password }
	 */
	async revokeTokenByCredentials(c, params) {
		const { email, password } = params;

		if (!email || !password) {
			throw new BizError(t('emailAndPwdEmpty'));
		}

		// 验证用户
		const userRow = await userService.selectByEmailIncludeDel(c, email);

		if (!userRow || userRow.isDel === isDel.DELETE) {
			throw new BizError(t('notExistUser'));
		}

		if (!await cryptoUtils.verifyPassword(password, userRow.salt, userRow.password)) {
			throw new BizError(t('IncorrectPwd'));
		}

		// 撤销Token
		await this.revokeToken(c, userRow.userId);
	},

	/**
	 * 检查并更新API创建邮箱次数限制
	 * @param {Object} c - Hono context
	 * @param {number} userId - 用户ID
	 * @throws {BizError} 如果超过限制
	 */
	async checkAndUpdateApiAddAccountLimit(c, userId) {
		// 获取用户信息
		const userRow = await userService.selectById(c, userId);

		if (!userRow) {
			throw new BizError(t('notExistUser'));
		}

		// 管理员不受限制
		if (adminUtils.isAdmin(c, userRow.email)) {
			return;
		}

		// 获取角色配置
		const roleRow = await roleService.selectById(c, userRow.type);

		if (!roleRow) {
			throw new BizError(t('roleNotExist'));
		}

		// 如果是ban类型或没有设置限制,不限制
		if (roleRow.apiAddAccountType === 'ban' || !roleRow.apiAddAccountCount) {
			return;
		}

		const now = new Date();
		const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

		// 检查是否需要重置计数(day类型)
		if (roleRow.apiAddAccountType === 'day') {
			const resetTime = userRow.apiAddResetTime;

			// 如果是新的一天,重置计数
			if (!resetTime || resetTime !== today) {
				await orm(c)
					.update(user)
					.set({
						apiAddCount: 0,
						apiAddResetTime: today
					})
					.where(eq(user.userId, userId))
					.run();

				// 更新内存中的值
				userRow.apiAddCount = 0;
				userRow.apiAddResetTime = today;
			}
		}

		// 检查是否超过限制
		if (userRow.apiAddCount >= roleRow.apiAddAccountCount) {
			console.log(`[API Add Account Limit] User: ${userRow.email}, Type: ${roleRow.apiAddAccountType}, Count: ${userRow.apiAddCount}/${roleRow.apiAddAccountCount}`);
			if (roleRow.apiAddAccountType === 'day') {
				throw new BizError(t('apiAddAccountDayLimit'), 403);
			} else if (roleRow.apiAddAccountType === 'count') {
				throw new BizError(t('apiAddAccountTotalLimit'), 403);
			}
		}

		// 增加计数
		await orm(c)
			.update(user)
			.set({
				apiAddCount: userRow.apiAddCount + 1
			})
			.where(eq(user.userId, userId))
			.run();
	}
};

export default apiTokenService;

