import { Hono } from 'hono';
const app = new Hono();

import result from '../model/result';
import { cors } from 'hono/cors';
import initService from '../init/init';

let schemaEnsured = false;
let schemaEnsurePromise = null;

async function ensureSchema(c) {
	if (schemaEnsured || !c.env?.db) {
		return;
	}

	if (!schemaEnsurePromise) {
		schemaEnsurePromise = initService.ensureCurrentSchema(c)
			.then(() => {
				schemaEnsured = true;
			})
			.catch((e) => {
				schemaEnsurePromise = null;
				console.warn(`自动检查数据库结构失败：${e.message}`);
			});
	}

	await schemaEnsurePromise;
}

app.use('*', cors());

app.use('*', async (c, next) => {
	await ensureSchema(c);
	await next();
});

// Custom logging middleware with timezone support
app.use('*', async (c, next) => {
	const start = Date.now();
	const method = c.req.method;
	const path = c.req.path;

	// Skip logging for frequent polling endpoints to reduce noise
	const skipLogging = [
		'/email/latest',
		'/health',
		'/ping'
	].some(endpoint => path.includes(endpoint));

	await next();

	if (!skipLogging) {
		const duration = Date.now() - start;
		const status = c.res.status;

		// Format timestamp in Beijing time (UTC+8)
		const now = new Date();
		const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
		const timestamp = beijingTime.toISOString().replace('T', ' ').slice(0, 19) + ' +08:00';

		// Simple, clean log format
		console.log(`[${timestamp}] ${method} ${path} - ${status} (${duration}ms)`);

		// Log errors with more detail
		if (status >= 400) {
			console.error(`[ERROR] ${method} ${path} - Status: ${status}, Duration: ${duration}ms`);
		}
	}
});

app.onError((err, c) => {
	if (err.name === 'BizError') {
		console.log(err.message);
	}else {
		console.error(err);
	}

	if (err.message === `Cannot read properties of undefined (reading 'get')`) {
		return c.json(result.fail('KV数据库未绑定<br>KV database not bound',502));
	}

	if (err.message === `Cannot read properties of undefined (reading 'put')`) {
		return c.json(result.fail('KV数据库未绑定<br>KV database not bound',502));
	}

	if (err.message === `Cannot read properties of undefined (reading 'prepare')`) {
		return c.json(result.fail('D1数据库未绑定<br>D1 database not bound',502));
	}

	return c.json(result.fail(err.message, err.code));
});

export default app;


