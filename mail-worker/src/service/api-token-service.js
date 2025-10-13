import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';
import userService from './user-service';
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
	}
};

export default apiTokenService;

