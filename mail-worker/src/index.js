import app from './hono/webs';
import { email } from './email/email';
import userService from './service/user-service';
import verifyRecordService from './service/verify-record-service';
import emailService from './service/email-service';
import analysisService from './service/analysis-service';
import oauthService from './service/oauth-service';
export default {
 async fetch(req, env, ctx) {
const url = new URL(req.url)

if (url.pathname.startsWith('/api/')) {
url.pathname = url.pathname.replace('/api', '')
req = new Request(url.toString(), req)
return app.fetch(req, env, ctx);
}

return env.assets.fetch(req);
},
email: email,
async scheduled(c, env, ctx) {
if (c.cron === '*/30 * * * *') {
await analysisService.refreshEchartsCache({ env })
return;
}

await verifyRecordService.clearRecord({env})
await userService.resetDaySendCount({ env })
await emailService.completeReceiveAll({ env })
await oauthService.clearNoBindOathUser({ env })
await analysisService.refreshEchartsCache({ env })
},
};
