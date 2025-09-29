import emailService from './email-service';
import { emailConst } from '../const/entity-const';
import BizError from '../error/biz-error';

const resendService = {

	async webhooks(c, body) {

		const params = {}

		// Simplified webhook logging with Beijing timezone
		const now = new Date();
		const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
		const timestamp = beijingTime.toISOString().replace('T', ' ').slice(0, 19) + ' +08:00';

		console.log(`[${timestamp}] Webhook: ${body.type} for email ${body.data?.email_id || 'unknown'}`)
		if (body.type === 'email.delivered') {
			params.status = emailConst.status.DELIVERED
			params.resendEmailId = body.data.email_id
			params.message = null
		}

		if (body.type === 'email.complained') {
			params.status = emailConst.status.COMPLAINED
			params.resendEmailId = body.data.email_id
			params.message = null
		}

		if (body.type === 'email.bounced') {
			let bounce = body.data.bounce
			bounce = JSON.stringify(bounce);
			params.status = emailConst.status.BOUNCED
			params.resendEmailId = body.data.email_id
			params.message = bounce
		}

		if (body.type === 'email.delivery_delayed') {
			params.status = emailConst.status.DELAYED
			params.resendEmailId = body.data.email_id
			params.message = null
		}

		const emailRow = await emailService.updateEmailStatus(c, params)

		if (!emailRow) {
			throw new BizError('更新邮件状态记录失败');
		}

	}
}

export default resendService
