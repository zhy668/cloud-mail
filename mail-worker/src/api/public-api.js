import app from '../hono/hono';
import result from '../model/result';
import publicService from '../service/public-service';

app.post('/public/genToken', async (c) => {
	const data = await publicService.genToken(c, await c.req.json());
	return c.json(result.ok(data));
});

app.post('/public/emailList', async (c) => {
	const list = await publicService.emailList(c, await c.req.json());
	return c.json(result.ok(list));
});

app.post('/public/addUser', async (c) => {
	await publicService.addUser(c, await c.req.json());
	return c.json(result.ok());
});

app.post('/public/addUserAccount', async (c) => {
	const account = await publicService.addUserAccount(c, await c.req.json());
	return c.json(result.ok(account));
});

app.delete('/public/deleteUserAccount', async (c) => {
	await publicService.deleteUserAccount(c, c.req.query());
	return c.json(result.ok());
});

app.get('/public/listUserAccount', async (c) => {
	const list = await publicService.listUserAccount(c, c.req.query());
	return c.json(result.ok(list));
});
