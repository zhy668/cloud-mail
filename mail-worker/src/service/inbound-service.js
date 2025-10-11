import emailService from './email-service';
import accountService from './account-service';
import settingService from './setting-service';
import attService from './att-service';
import r2Service from './r2-service';
import roleService from './role-service';
import userService from './user-service';
import constant from '../const/constant';
import fileUtils from '../utils/file-utils';
import emailUtils from '../utils/email-utils';
import verifyUtils from '../utils/verify-utils';
import adminUtils from '../utils/admin-utils';
import { emailConst, isDel, roleConst, settingConst } from '../const/entity-const';
import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';

const inboundService = {

    /**
     * Process inbound email from smtp2http
     * @param {Object} c - Hono context
     * @param {Object} emailMessage - EmailMessage from smtp2http
     * @returns {Object} Processed email record
     */
    async processInboundEmail(c, emailMessage) {
        try {
            console.log('Starting inbound email processing');

            // Get system settings
            const settings = await settingService.query({ env: c.env });
            const { receive, r2Domain, noRecipient, domainList } = settings;

            // Check if email receiving is enabled
            if (receive === settingConst.receive.CLOSE) {
                throw new BizError('Email receiving is disabled', 503);
            }

            // Convert smtp2http format to internal format
            const convertedData = await this.convertEmailMessage(emailMessage);

            // Validate recipient domain
            const recipientEmail = convertedData.toEmail;
            const recipientDomain = emailUtils.getDomain(recipientEmail.toLowerCase());

            // Check if recipient domain is in allowed domain list
            const allowedDomains = domainList.map(domain => domain.replace('@', '').toLowerCase());
            if (!allowedDomains.includes(recipientDomain)) {
                console.log(`Inbound email rejected: recipient domain ${recipientDomain} not in allowed list`);
                throw new BizError(`Recipient domain ${recipientDomain} not allowed`, 403);
            }

            console.log(`Inbound email domain validation passed for: ${recipientDomain}`);

            // Find recipient account
            const account = await accountService.selectByEmailIncludeDel({ env: c.env }, recipientEmail);

            // Check if recipient exists (if required)
            if (!account && noRecipient === settingConst.noRecipient.CLOSE) {
                throw new BizError('Recipient not found', 404);
            }

            // Apply role-based restrictions if account exists
            if (account) {
                const userRow = await userService.selectById({ env: c.env }, account.userId);
                if (!adminUtils.isAdmin({ env: c.env }, userRow.email)) {
                    await this.applyRoleRestrictions(c, account, convertedData);
                }
            }

            // Prepare email parameters for storage
            const emailParams = {
                toEmail: convertedData.toEmail,
                toName: convertedData.toName,
                sendEmail: convertedData.sendEmail,
                name: convertedData.name,
                subject: convertedData.subject,
                content: convertedData.content,
                text: convertedData.text,
                cc: convertedData.cc,
                bcc: convertedData.bcc,
                recipient: convertedData.recipient,
                inReplyTo: convertedData.inReplyTo,
                relation: convertedData.relation,
                messageId: convertedData.messageId,
                userId: account ? account.userId : 0,
                accountId: account ? account.accountId : 0,
                isDel: isDel.DELETE,
                status: emailConst.status.SAVING
            };

            // Process attachments (both regular attachments and embedded files)
            const allAttachments = [
                ...(convertedData.attachments || []),
                ...(convertedData.embeddedFiles || [])
            ];
            const { attachments, cidAttachments } = await this.processAttachments(allAttachments);

            // Save email to database
            let emailRow = await emailService.receive({ env: c.env }, emailParams, cidAttachments, r2Domain);

            // Update attachment references
            attachments.forEach(attachment => {
                attachment.emailId = emailRow.emailId;
                attachment.userId = emailRow.userId;
                attachment.accountId = emailRow.accountId;
            });

            // Save attachments to R2 storage
            if (attachments.length > 0 && await r2Service.hasOSS({ env: c.env })) {
                try {
                    await attService.addAtt({ env: c.env }, attachments);
                } catch (e) {
                    console.error('Error saving attachments:', e);
                }
            }

            // Complete email processing
            emailRow = await emailService.completeReceive(
                { env: c.env }, 
                account ? emailConst.status.RECEIVE : emailConst.status.NOONE, 
                emailRow.emailId
            );

            console.log(`Inbound email processed successfully: ${emailRow.emailId}`);
            return emailRow;

        } catch (error) {
            console.error('Error processing inbound email:', error);
            throw error;
        }
    },

    /**
     * Convert smtp2http EmailMessage format to cloud-mail internal format
     * @param {Object} emailMessage - EmailMessage from smtp2http
     * @returns {Object} Converted email data
     */
    async convertEmailMessage(emailMessage) {
        try {
            // Extract addresses
            const fromAddress = emailMessage.addresses.from || {};
            const toAddress = emailMessage.addresses.to || {};
            
            // Convert CC and BCC arrays
            const cc = emailMessage.addresses.cc || [];
            const bcc = emailMessage.addresses.bcc || [];
            const recipient = [toAddress, ...cc, ...bcc].filter(addr => addr && addr.address);

            return {
                // Basic email info
                toEmail: toAddress.address || '',
                toName: toAddress.name || '',
                sendEmail: fromAddress.address || '',
                name: fromAddress.name || emailUtils.getName(fromAddress.address || ''),
                subject: emailMessage.subject || '',
                content: emailMessage.body?.html || '',
                text: emailMessage.body?.text || '',
                
                // Address arrays as JSON strings
                cc: JSON.stringify(cc),
                bcc: JSON.stringify(bcc),
                recipient: JSON.stringify(recipient),
                
                // Message references
                inReplyTo: emailMessage.addresses?.in_reply_to?.join(',') || '',
                relation: emailMessage.references?.join(',') || '',
                messageId: emailMessage.id || '',
                
                // Attachments
                attachments: emailMessage.attachments || [],
                embeddedFiles: emailMessage.embedded_files || []
            };
        } catch (error) {
            console.error('Error converting email message:', error);
            throw new BizError('Failed to convert email format', 400);
        }
    },

    /**
     * Process attachments from smtp2http format
     * @param {Array} attachments - Attachments and embedded files from smtp2http
     * @returns {Object} Processed attachments
     */
    async processAttachments(attachments = []) {
        const processedAttachments = [];
        const cidAttachments = [];

        for (let item of attachments) {
            try {
                // Decode base64 content
                const content = Buffer.from(item.data, 'base64');

                const attachment = {
                    filename: item.filename || `embedded_${item.cid || Date.now()}`,
                    mimeType: item.content_type,
                    content: content,
                    key: constant.ATTACHMENT_PREFIX + await fileUtils.getBuffHash(content) + fileUtils.getExtFileName(item.filename || 'file'),
                    size: content.length,
                    contentId: item.cid || null
                };

                processedAttachments.push(attachment);

                if (attachment.contentId) {
                    cidAttachments.push(attachment);
                }
            } catch (error) {
                console.error('Error processing attachment:', item.filename || item.cid, error);
                // Continue processing other attachments
            }
        }

        return { attachments: processedAttachments, cidAttachments };
    },

    /**
     * Apply role-based restrictions to email
     * @param {Object} c - Hono context
     * @param {Object} account - Recipient account
     * @param {Object} convertedData - Converted email data
     */
    async applyRoleRestrictions(c, account, convertedData) {
        try {
            const { banEmail, banEmailType, availDomain } = await roleService.selectByUserId({ env: c.env }, account.userId);

            // Check domain permissions
            if (!roleService.hasAvailDomainPerm(availDomain, convertedData.toEmail)) {
                throw new BizError('Mailbox disabled for this domain', 403);
            }

            // Check banned emails
            const banEmailList = banEmail.split(',').filter(item => item !== '');

            if (banEmailList.includes('*')) {
                this.handleBannedEmail(banEmailType, convertedData);
                return;
            }

            for (const item of banEmailList) {
                if (verifyUtils.isDomain(item)) {
                    const banDomain = item.toLowerCase();
                    const receiveDomain = emailUtils.getDomain(convertedData.sendEmail.toLowerCase());
                    
                    if (banDomain === receiveDomain) {
                        this.handleBannedEmail(banEmailType, convertedData);
                        return;
                    }
                } else {
                    if (item.toLowerCase() === convertedData.sendEmail.toLowerCase()) {
                        this.handleBannedEmail(banEmailType, convertedData);
                        return;
                    }
                }
            }
        } catch (error) {
            console.error('Error applying role restrictions:', error);
            throw error;
        }
    },

    /**
     * Handle banned email based on ban type
     * @param {string} banEmailType - Type of ban (ALL or CONTENT)
     * @param {Object} convertedData - Converted email data
     */
    handleBannedEmail(banEmailType, convertedData) {
        if (banEmailType === roleConst.banEmailType.ALL) {
            throw new BizError('Mailbox disabled for this sender', 403);
        }

        if (banEmailType === roleConst.banEmailType.CONTENT) {
            convertedData.content = 'The content has been deleted';
            convertedData.text = 'The content has been deleted';
            convertedData.attachments = [];
            convertedData.embeddedFiles = [];
        }
    }
};

export default inboundService;
