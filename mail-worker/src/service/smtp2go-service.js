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

		// Prepare the request payload according to SMTP2GO API format
		const payload = {
			api_key: apiKey,
			to: Array.isArray(to) ? to : [to],
			sender: sender,
			subject: subject
		};

		// Log the payload for debugging
		console.log('SMTP2GO Payload:', JSON.stringify(payload, null, 2));

		// Add optional parameters
		if (textBody) {
			payload.text_body = textBody;
		}

		if (htmlBody) {
			payload.html_body = htmlBody;
		}

		if (attachments && attachments.length > 0) {
			payload.attachments = attachments;
		}

		if (headers && Array.isArray(headers)) {
			payload.custom_headers = headers;
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

			// Log the response for debugging
			console.log('SMTP2GO Response:', JSON.stringify(result, null, 2));

			if (!response.ok) {
				// Handle API errors
				const errorMessage = result.data?.error || result.error || `HTTP ${response.status}`;
				console.error('SMTP2GO API Error:', errorMessage, 'Full response:', result);
				throw new BizError(`SMTP2GO API Error: ${errorMessage}`);
			}

			// Check if the email was successfully sent
			if (result.data && result.data.failed > 0) {
				const failures = result.data.failures || [];
				const failureMessages = failures.map(f => f.error || 'Unknown error').join(', ');
				console.error('SMTP2GO Send Failed:', failureMessages, 'Full response:', result);
				throw new BizError(`SMTP2GO Send Failed: ${failureMessages}`);
			}

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
