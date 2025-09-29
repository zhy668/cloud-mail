import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';

const smtp2goService = {

	/**
	 * Send email using SMTP2GO API
	 * @param {Object} c - Context object
	 * @param {Object} params - Email parameters
	 * @param {string} params.apiKey - SMTP2GO API key
	 * @param {string} params.sender - Sender email address
	 * @param {Array<string>} params.to - Array of recipient email addresses
	 * @param {string} params.subject - Email subject
	 * @param {string} params.textBody - Plain text body (optional)
	 * @param {string} params.htmlBody - HTML body (optional)
	 * @param {Array} params.attachments - Array of attachments (optional)
	 * @param {Object} params.headers - Custom headers (optional)
	 * @returns {Promise<Object>} Response from SMTP2GO API
	 */
	async send(c, params) {
		const {
			apiKey,
			sender,
			to,
			subject,
			textBody,
			htmlBody,
			attachments,
			headers
		} = params;

		if (!apiKey) {
			throw new BizError(t('noSmtp2goToken'));
		}

		if (!sender) {
			throw new BizError(t('noSender'));
		}

		if (!to || !Array.isArray(to) || to.length === 0) {
			throw new BizError(t('noRecipients'));
		}

		if (!subject) {
			throw new BizError(t('noSubject'));
		}

		// Validate and improve subject to avoid content filtering
		let validatedSubject = subject;
		if (!validatedSubject || validatedSubject.trim().length < 3) {
			validatedSubject = 'Message from ' + (sender.split('@')[0] || 'cloud-mail');
			console.warn('⚠️ Subject too short, using default:', validatedSubject);
		}

		// Prepare the request payload according to SMTP2GO API format
		// According to docs: API Key can be in header OR body, let's try body approach
		const payload = {
			api_key: apiKey,
			sender: sender,
			to: Array.isArray(to) ? to : [to],
			subject: validatedSubject
		};

		// Simplified logging with Beijing timezone
		const now = new Date();
		const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
		const timestamp = beijingTime.toISOString().replace('T', ' ').slice(0, 19) + ' +08:00';

		console.log(`[${timestamp}] SMTP2GO: Sending email from ${sender} to ${Array.isArray(to) ? to.join(', ') : to}`);
		console.log(`[${timestamp}] SMTP2GO: Subject: "${validatedSubject}"`);

		// Only warn about domain issues, not every request
		const senderDomain = sender.split('@')[1];
		if (!senderDomain || senderDomain.includes('abrdns.com')) {
			console.warn(`[${timestamp}] SMTP2GO: ⚠️ Domain ${senderDomain} may need verification in SMTP2GO account`);
		}

		// Add optional parameters with content validation
		if (textBody && textBody.trim()) {
			payload.text_body = textBody.trim();
		} else {
			// Provide default text body if empty to avoid content filtering
			payload.text_body = subject || 'Email sent via cloud-mail system';
		}

		if (htmlBody && htmlBody.trim()) {
			payload.html_body = htmlBody.trim();
		} else if (payload.text_body) {
			// Generate basic HTML from text if HTML is missing
			payload.html_body = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${subject || 'Email'}</title>
</head>
<body>
    <p>${payload.text_body.replace(/\n/g, '<br>')}</p>
</body>
</html>`;
		}

		if (attachments && attachments.length > 0) {
			payload.attachments = attachments;
		}

		// Add custom headers for better deliverability
		const customHeaders = [];

		// Add user-provided headers
		if (headers && Array.isArray(headers)) {
			customHeaders.push(...headers);
		}

		// Add standard headers to improve deliverability
		customHeaders.push(
			{ header: 'X-Mailer', value: 'cloud-mail-system' },
			{ header: 'X-Priority', value: '3' },
			{ header: 'Message-ID', value: `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@${sender.split('@')[1]}>` }
		);

		if (customHeaders.length > 0) {
			payload.custom_headers = customHeaders;
		}

		try {
			const response = await fetch('https://api.smtp2go.com/v3/email/send', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			const result = await response.json();

			// Simplified response logging with timestamp
			const responseTime = new Date();
			const responseBeijingTime = new Date(responseTime.getTime() + 8 * 60 * 60 * 1000);
			const responseTimestamp = responseBeijingTime.toISOString().replace('T', ' ').slice(0, 19) + ' +08:00';

			if (!response.ok) {
				// Handle API errors according to SMTP2GO format
				const errorMessage = result.data?.error || result.error || `HTTP ${response.status}`;
				const errorCode = result.data?.error_code || 'UNKNOWN_ERROR';
				console.error(`[${responseTimestamp}] SMTP2GO: ❌ API Error [${errorCode}]: ${errorMessage}`);
				throw new BizError(`SMTP2GO API Error [${errorCode}]: ${errorMessage}`);
			}

			// Check if the email was successfully sent according to SMTP2GO response format
			if (result.data && result.data.failed > 0) {
				const failures = result.data.failures || [];
				const failureMessages = failures.map(f => f.error || 'Unknown error').join(', ');
				console.error(`[${responseTimestamp}] SMTP2GO: ❌ Send failed: ${failureMessages}`);
				throw new BizError(`SMTP2GO Send Failed: ${failureMessages}`);
			}

			// Validate that we have a successful response with email_id
			if (!result.data || !result.data.email_id) {
				console.error(`[${responseTimestamp}] SMTP2GO: ❌ Invalid response: Missing email_id`);
				throw new BizError('SMTP2GO Send Failed: Invalid response format');
			}

			// Simple success log
			console.log(`[${responseTimestamp}] SMTP2GO: ✅ Email sent successfully, ID: ${result.data.email_id}`);

			return result;

		} catch (error) {
			if (error instanceof BizError) {
				throw error;
			}
			
			// Handle network or other errors
			console.error('SMTP2GO Service Error:', error);
			throw new BizError(`SMTP2GO Service Error: ${error.message}`);
		}
	},

	/**
	 * Send batch emails using SMTP2GO API
	 * @param {Object} c - Context object
	 * @param {Object} params - Batch email parameters
	 * @param {string} params.apiKey - SMTP2GO API key
	 * @param {Array} params.emails - Array of email objects
	 * @returns {Promise<Object>} Response from SMTP2GO API
	 */
	async sendBatch(c, params) {
		const { apiKey, emails } = params;

		if (!apiKey) {
			throw new BizError(t('noSmtp2goToken'));
		}

		if (!emails || !Array.isArray(emails) || emails.length === 0) {
			throw new BizError(t('noEmails'));
		}

		// Send emails one by one for now
		// SMTP2GO doesn't have a direct batch API like Resend
		const results = [];
		const errors = [];

		for (const email of emails) {
			try {
				const result = await this.send(c, {
					apiKey,
					...email
				});
				results.push(result);
			} catch (error) {
				errors.push({
					email: email.to,
					error: error.message
				});
			}
		}

		return {
			succeeded: results.length,
			failed: errors.length,
			results,
			errors
		};
	},

	/**
	 * Validate SMTP2GO API key
	 * @param {Object} c - Context object
	 * @param {string} apiKey - SMTP2GO API key to validate
	 * @returns {Promise<boolean>} True if valid, false otherwise
	 */
	async validateApiKey(c, apiKey) {
		if (!apiKey) {
			return false;
		}

		try {
			// Use a simple API call to validate the key
			// We'll try to get account info or send a test email
			const response = await fetch('https://api.smtp2go.com/v3/stats/summary', {
				method: 'GET',
				headers: {
					'X-Smtp2go-Api-Key': apiKey,
					'accept': 'application/json'
				}
			});

			return response.ok;
		} catch (error) {
			console.error('SMTP2GO API Key Validation Error:', error);
			return false;
		}
	}
};

export default smtp2goService;
