import app from '../hono/hono';
import result from '../model/result';
import inboundService from '../service/inbound-service';
import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';

/**
 * Inbound email API for receiving emails from smtp2http
 * Endpoint: POST /inbound
 * 
 * Security: Uses API Key authentication
 * Expected header: X-Inbound-Key: <api_key>
 * 
 * Request body: EmailMessage format from smtp2http
 */

// Middleware for API Key authentication
async function validateInboundApiKey(c, next) {
    try {
        const apiKey = c.req.header('X-Inbound-Key');
        
        if (!apiKey) {
            throw new BizError('Missing X-Inbound-Key header', 401);
        }

        // Get configured API keys from environment or KV storage
        const validApiKeys = await getValidApiKeys(c);
        
        if (!validApiKeys.includes(apiKey)) {
            console.error(`Invalid inbound API key attempted: ${apiKey.substring(0, 8)}...`);
            throw new BizError('Invalid API key', 401);
        }

        // Log successful authentication
        console.log(`Inbound email API authenticated with key: ${apiKey.substring(0, 8)}...`);
        
        await next();
    } catch (error) {
        console.error('Inbound API authentication failed:', error);
        throw error;
    }
}

// Get valid API keys from configuration
async function getValidApiKeys(c) {
    try {
        // Try to get from KV storage first
        const kvKeys = await c.env.kv.get('inbound_api_keys');
        if (kvKeys) {
            return JSON.parse(kvKeys);
        }

        // Fallback to environment variable
        const envKeys = c.env.INBOUND_API_KEYS;
        if (envKeys) {
            return envKeys.split(',').map(key => key.trim());
        }

        // Default fallback - should be configured in production
        console.warn('No inbound API keys configured, using default key');
        return ['default-inbound-key-change-me'];
    } catch (error) {
        console.error('Error getting valid API keys:', error);
        return ['default-inbound-key-change-me'];
    }
}

/**
 * POST /inbound - Receive email from smtp2http
 * 
 * Expected request body format (EmailMessage from smtp2http):
 * {
 *   "id": "message-id",
 *   "date": "date-string", 
 *   "subject": "email subject",
 *   "body": {
 *     "text": "plain text content",
 *     "html": "html content"
 *   },
 *   "addresses": {
 *     "from": {"name": "sender name", "address": "sender@example.com"},
 *     "to": {"name": "recipient name", "address": "recipient@example.com"},
 *     "cc": [...],
 *     "bcc": [...],
 *     "reply_to": [...]
 *   },
 *   "attachments": [...],
 *   "embedded_files": [...]
 * }
 */
app.post('/inbound', validateInboundApiKey, async (c) => {
    try {
        console.log('Received inbound email request');
        
        // Get request body
        const emailMessage = await c.req.json();
        
        // Validate basic structure
        if (!emailMessage || !emailMessage.addresses || !emailMessage.addresses.to) {
            throw new BizError('Invalid email message format', 400);
        }

        console.log(`Processing inbound email: ${emailMessage.subject || 'No Subject'} to ${emailMessage.addresses.to.address}`);

        // Process the email using inbound service
        const processedEmail = await inboundService.processInboundEmail(c, emailMessage);

        console.log(`Successfully processed inbound email with ID: ${processedEmail.emailId}`);

        return c.json(result.ok({
            emailId: processedEmail.emailId,
            status: 'processed',
            message: 'Email received and processed successfully'
        }));

    } catch (error) {
        console.error('Error processing inbound email:', error);
        
        // Return appropriate error response
        if (error instanceof BizError) {
            return c.json(result.error(error.message), error.code || 500);
        }
        
        return c.json(result.error('Internal server error'), 500);
    }
});

/**
 * GET /inbound/health - Health check endpoint for smtp2http monitoring
 */
app.get('/inbound/health', async (c) => {
    return c.json(result.ok({
        status: 'healthy',
        service: 'cloud-mail-inbound',
        timestamp: new Date().toISOString()
    }));
});
