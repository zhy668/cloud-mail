import app from '../hono/hono';
import result from '../model/result';
import apiTokenService from '../service/api-token-service';
import accountService from '../service/account-service';
import userContext from '../security/user-context';
import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';
import userService from '../service/user-service';
import roleService from '../service/role-service';
import settingService from '../service/setting-service';
import { settingConst } from '../const/entity-const';
import verifyUtils from '../utils/verify-utils';
import emailUtils from '../utils/email-utils';
import adminUtils from '../utils/admin-utils';
import orm from '../entity/orm';
import email from '../entity/email';
import { and, asc, desc, eq, sql } from 'drizzle-orm';

/**
 * 生成用户API Token
 * POST /user/token/generate
 * Body: { email, password }
 */
app.post('/user/token/generate', async (c) => {
	const data = await apiTokenService.generateToken(c, await c.req.json());
	return c.json(result.ok(data));
});

/**
 * 撤销用户API Token
 * POST /user/token/revoke
 * Body: { email, password }
 */
app.post('/user/token/revoke', async (c) => {
	await apiTokenService.revokeTokenByCredentials(c, await c.req.json());
	return c.json(result.ok());
});

/**
 * 添加邮箱账户（用户只能为自己添加）
 * POST /user/account/add
 * Header: Authorization: <api-token>
 * Body: { email }
 */
app.post('/user/account/add', async (c) => {
	const userId = userContext.getUserId(c);
	const params = await c.req.json();
	const { email } = params;

	// 验证邮箱格式
	if (!email) {
		throw new BizError(t('emptyEmail'));
	}

	if (!verifyUtils.isEmail(email)) {
		throw new BizError(t('notEmail'));
	}

	// 检查多号模式配置
	const { addEmail, manyEmail } = await settingService.query(c);
	
	if (!(addEmail === settingConst.addEmail.OPEN && manyEmail === settingConst.manyEmail.OPEN)) {
		throw new BizError(t('addAccountDisabled'));
	}

	// 检查域名是否在允许列表中
	if (!c.env.domain.includes(emailUtils.getDomain(email))) {
		throw new BizError(t('notExistDomain'));
	}

	// 检查邮箱是否已存在
	const existingAccount = await accountService.selectByEmailIncludeDel(c, email);
	
	if (existingAccount) {
		throw new BizError(t('isRegAccount'));
	}

	// 获取用户信息和角色
	const userRow = await userService.selectById(c, userId);
	const roleRow = await roleService.selectById(c, userRow.type);

	if (!roleRow) {
		throw new BizError(t('roleNotExist'));
	}

	// 检查用户权限（非管理员需要检查）
	if (!adminUtils.isAdmin(c, userRow.email)) {
		// 检查账户数量限制
		if (roleRow.accountCount > 0) {
			const userAccountCount = await accountService.countUserAccount(c, userId);
			if (userAccountCount >= roleRow.accountCount) {
				throw new BizError(t('accountLimit'), 403);
			}
		}

		// 检查域名权限
		if (!roleService.hasAvailDomainPerm(roleRow.availDomain, email)) {
			throw new BizError(t('noDomainPermAdd'), 403);
		}
	}

	// 添加邮箱（不需要验证码，因为是API调用）
	const account = await accountService.addByAdmin(c, { userId, email });
	
	return c.json(result.ok(account));
});

/**
 * 删除邮箱账户（用户只能删除自己的）
 * DELETE /user/account/delete
 * Header: Authorization: <api-token>
 * Query: accountId=123
 */
app.delete('/user/account/delete', async (c) => {
	const userId = userContext.getUserId(c);
	const { accountId } = c.req.query();

	if (!accountId) {
		throw new BizError(t('emptyAccountId'));
	}

	// 验证账户是否属于当前用户
	const account = await accountService.selectById(c, Number(accountId));
	
	if (!account) {
		throw new BizError(t('accountNotExist'));
	}

	if (account.userId !== userId) {
		throw new BizError(t('noPermission'), 403);
	}

	// 删除账户
	await accountService.delete(c, { accountId }, userId);
	
	return c.json(result.ok());
});

/**
 * 查询用户的邮箱账户列表
 * GET /user/account/list
 * Header: Authorization: <api-token>
 */
app.get('/user/account/list', async (c) => {
	const userId = userContext.getUserId(c);

	// 使用现有的list方法
	const list = await accountService.list(c, {}, userId);

	return c.json(result.ok(list));
});

/**
 * 查询用户的邮件列表（支持高级筛选）
 * POST /user/email/list
 * Header: Authorization: <api-token>
 * Body: {
 *   toEmail?: string,      // 收件人邮箱，支持模糊
 *   sendName?: string,     // 发件人名字，支持模糊
 *   sendEmail?: string,    // 发件人邮箱，支持模糊
 *   subject?: string,      // 邮件主题，支持模糊
 *   content?: string,      // 邮件html，支持模糊
 *   timeSort?: string,     // 时间排序（asc 最旧，desc 最新）默认desc
 *   type?: integer,        // 邮件类型 （0 收件，1发件，空 全部）
 *   isDel?: integer,       // 是否删除 （0 正常，1删除，空 全部）
 *   num?: integer,         // 页码，默认1
 *   size?: integer         // 每页数量，默认20
 * }
 */
app.post('/user/email/list', async (c) => {
	const userId = userContext.getUserId(c);
	let { toEmail, content, subject, sendName, sendEmail, timeSort, num, size, type, isDel } = await c.req.json();

	const query = orm(c).select({
		emailId: email.emailId,
		sendEmail: email.sendEmail,
		sendName: email.name,
		subject: email.subject,
		toEmail: email.toEmail,
		toName: email.toName,
		type: email.type,
		createTime: email.createTime,
		content: email.content,
		text: email.text,
		isDel: email.isDel,
	}).from(email);

	if (!size) {
		size = 20;
	}

	if (!num) {
		num = 1;
	}

	size = Number(size);
	num = Number(num);

	num = (num - 1) * size;

	let conditions = [];

	// 重要：只查询当前用户的邮件
	conditions.push(eq(email.userId, userId));

	if (toEmail) {
		conditions.push(sql`${email.toEmail} COLLATE NOCASE LIKE ${toEmail}`);
	}

	if (sendEmail) {
		conditions.push(sql`${email.sendEmail} COLLATE NOCASE LIKE ${sendEmail}`);
	}

	if (sendName) {
		conditions.push(sql`${email.name} COLLATE NOCASE LIKE ${sendName}`);
	}

	if (subject) {
		conditions.push(sql`${email.subject} COLLATE NOCASE LIKE ${subject}`);
	}

	if (content) {
		conditions.push(sql`${email.content} COLLATE NOCASE LIKE ${content}`);
	}

	if (type || type === 0) {
		conditions.push(eq(email.type, type));
	}

	if (isDel || isDel === 0) {
		conditions.push(eq(email.isDel, isDel));
	}

	if (conditions.length === 1) {
		query.where(...conditions);
	} else if (conditions.length > 1) {
		query.where(and(...conditions));
	}

	if (timeSort === 'asc') {
		query.orderBy(asc(email.emailId));
	} else {
		query.orderBy(desc(email.emailId));
	}

	const list = await query.limit(size).offset(num).all();

	return c.json(result.ok(list));
});

export default app;

