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

		// Log the payload for debugging
		console.log('SMTP2GO Request Details:');
		console.log('- API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
		console.log('- Sender:', sender);
		console.log('- Sender Domain:', sender.split('@')[1]);
		console.log('- Recipients:', Array.isArray(to) ? to : [to]);
		console.log('- Subject:', subject);
		console.log('- Payload:', JSON.stringify(payload, null, 2));

		// Validate sender domain
		const senderDomain = sender.split('@')[1];
		console.log('⚠️  IMPORTANT: Ensure domain', senderDomain, 'is verified in your SMTP2GO account');

		// Check if this might be a domain verification issue
		if (!senderDomain || senderDomain.includes('abrdns.com')) {
			console.warn('🚨 POTENTIAL ISSUE: Using abrdns.com subdomain. This domain must be verified in SMTP2GO.');
			console.warn('📋 SOLUTION: Add and verify', senderDomain, 'in your SMTP2GO account settings.');
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

			// Log the response for debugging
			console.log('SMTP2GO Response Status:', response.status);
			console.log('SMTP2GO Response:', JSON.stringify(result, null, 2));

			if (!response.ok) {
				// Handle API errors according to SMTP2GO format
				const errorMessage = result.data?.error || result.error || `HTTP ${response.status}`;
				const errorCode = result.data?.error_code || 'UNKNOWN_ERROR';
				console.error('SMTP2GO API Error Details:');
				console.error('- Status:', response.status);
				console.error('- Error Code:', errorCode);
				console.error('- Error Message:', errorMessage);
				console.error('- Full Response:', result);
				throw new BizError(`SMTP2GO API Error [${errorCode}]: ${errorMessage}`);
			}

			// Check if the email was successfully sent according to SMTP2GO response format
			if (result.data && result.data.failed > 0) {
				const failures = result.data.failures || [];
				const failureMessages = failures.map(f => f.error || 'Unknown error').join(', ');
				console.error('SMTP2GO Send Failed:', failureMessages, 'Full response:', result);
				throw new BizError(`SMTP2GO Send Failed: ${failureMessages}`);
			}

			// Validate that we have a successful response with email_id
			if (!result.data || !result.data.email_id) {
				console.error('SMTP2GO Invalid Response: Missing email_id', result);
				throw new BizError('SMTP2GO Send Failed: Invalid response format');
			}

			// Log success but warn about potential delivery issues
			console.log('✅ SMTP2GO API Success - Email ID:', result.data.email_id);
			console.log('📧 Email queued for delivery. Check SMTP2GO dashboard for delivery status.');
			console.log('⚠️  If bounces occur, verify sender domain is properly configured in SMTP2GO.');

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
