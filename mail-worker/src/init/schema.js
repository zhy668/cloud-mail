export async function ensureCurrentSchema(c) {
	if (!c.env?.db) {
		return;
	}

	await addMissingColumns(c, 'email', [
		{ name: 'type', sql: `ALTER TABLE email ADD COLUMN type INTEGER NOT NULL DEFAULT 0;` },
		{ name: 'status', sql: `ALTER TABLE email ADD COLUMN status INTEGER NOT NULL DEFAULT 0;` },
		{ name: 'resend_email_id', sql: `ALTER TABLE email ADD COLUMN resend_email_id TEXT;` },
		{ name: 'message', sql: `ALTER TABLE email ADD COLUMN message TEXT;` },
		{ name: 'recipient', sql: `ALTER TABLE email ADD COLUMN recipient TEXT NOT NULL DEFAULT '[]';` },
		{ name: 'cc', sql: `ALTER TABLE email ADD COLUMN cc TEXT NOT NULL DEFAULT '[]';` },
		{ name: 'bcc', sql: `ALTER TABLE email ADD COLUMN bcc TEXT NOT NULL DEFAULT '[]';` },
		{ name: 'message_id', sql: `ALTER TABLE email ADD COLUMN message_id TEXT NOT NULL DEFAULT '';` },
		{ name: 'in_reply_to', sql: `ALTER TABLE email ADD COLUMN in_reply_to TEXT NOT NULL DEFAULT '';` },
		{ name: 'relation', sql: `ALTER TABLE email ADD COLUMN relation TEXT NOT NULL DEFAULT '';` },
		{
			name: 'to_email',
			sql: `ALTER TABLE email ADD COLUMN to_email TEXT NOT NULL DEFAULT '';`,
			afterAddSql: `UPDATE email SET to_email = json_extract(recipient, '$[0].address') WHERE to_email = '';`
		},
		{
			name: 'to_name',
			sql: `ALTER TABLE email ADD COLUMN to_name TEXT NOT NULL DEFAULT '';`,
			afterAddSql: `UPDATE email SET to_name = json_extract(recipient, '$[0].name') WHERE to_name = '';`
		},
		{ name: 'code', sql: `ALTER TABLE email ADD COLUMN code TEXT NOT NULL DEFAULT '';` },
		{ name: 'smtp2go_email_id', sql: `ALTER TABLE email ADD COLUMN smtp2go_email_id TEXT;` },
		{
			name: 'unread',
			sql: `ALTER TABLE email ADD COLUMN unread INTEGER NOT NULL DEFAULT 0;`,
			afterAddSql: `UPDATE email SET unread = 1;`
		}
	]);

	await addMissingColumns(c, 'setting', [
		{ name: 'reg_verify_count', sql: `ALTER TABLE setting ADD COLUMN reg_verify_count INTEGER NOT NULL DEFAULT 1;` },
		{ name: 'add_verify_count', sql: `ALTER TABLE setting ADD COLUMN add_verify_count INTEGER NOT NULL DEFAULT 1;` },
		{ name: 'send', sql: `ALTER TABLE setting ADD COLUMN send INTEGER NOT NULL DEFAULT 0;` },
		{ name: 'r2_domain', sql: `ALTER TABLE setting ADD COLUMN r2_domain TEXT;` },
		{ name: 'secret_key', sql: `ALTER TABLE setting ADD COLUMN secret_key TEXT;` },
		{ name: 'site_key', sql: `ALTER TABLE setting ADD COLUMN site_key TEXT;` },
		{ name: 'background', sql: `ALTER TABLE setting ADD COLUMN background TEXT;` },
		{ name: 'login_opacity', sql: `ALTER TABLE setting ADD COLUMN login_opacity INTEGER NOT NULL DEFAULT 0.88;` },
		{ name: 'reg_key', sql: `ALTER TABLE setting ADD COLUMN reg_key INTEGER NOT NULL DEFAULT 1;` },
		{ name: 'tg_bot_token', sql: `ALTER TABLE setting ADD COLUMN tg_bot_token TEXT NOT NULL DEFAULT '';` },
		{ name: 'tg_chat_id', sql: `ALTER TABLE setting ADD COLUMN tg_chat_id TEXT NOT NULL DEFAULT '';` },
		{ name: 'tg_bot_status', sql: `ALTER TABLE setting ADD COLUMN tg_bot_status INTEGER NOT NULL DEFAULT 1;` },
		{ name: 'forward_email', sql: `ALTER TABLE setting ADD COLUMN forward_email TEXT NOT NULL DEFAULT '';` },
		{ name: 'forward_status', sql: `ALTER TABLE setting ADD COLUMN forward_status INTEGER NOT NULL DEFAULT 1;` },
		{ name: 'rule_email', sql: `ALTER TABLE setting ADD COLUMN rule_email TEXT NOT NULL DEFAULT '';` },
		{ name: 'rule_type', sql: `ALTER TABLE setting ADD COLUMN rule_type INTEGER NOT NULL DEFAULT 0;` },
		{ name: 'resend_tokens', sql: `ALTER TABLE setting ADD COLUMN resend_tokens TEXT NOT NULL DEFAULT '{}';` },
		{ name: 'smtp2go_tokens', sql: `ALTER TABLE setting ADD COLUMN smtp2go_tokens TEXT NOT NULL DEFAULT '{}';` },
		{ name: 'notice_title', sql: `ALTER TABLE setting ADD COLUMN notice_title TEXT NOT NULL DEFAULT 'Cloud Mail';` },
		{ name: 'notice_content', sql: `ALTER TABLE setting ADD COLUMN notice_content TEXT NOT NULL DEFAULT '';` },
		{ name: 'notice_type', sql: `ALTER TABLE setting ADD COLUMN notice_type TEXT NOT NULL DEFAULT 'none';` },
		{ name: 'notice_duration', sql: `ALTER TABLE setting ADD COLUMN notice_duration INTEGER NOT NULL DEFAULT 0;` },
		{ name: 'notice_position', sql: `ALTER TABLE setting ADD COLUMN notice_position TEXT NOT NULL DEFAULT 'top-right';` },
		{ name: 'notice_offset', sql: `ALTER TABLE setting ADD COLUMN notice_offset INTEGER NOT NULL DEFAULT 0;` },
		{ name: 'notice_width', sql: `ALTER TABLE setting ADD COLUMN notice_width INTEGER NOT NULL DEFAULT 340;` },
		{ name: 'notice', sql: `ALTER TABLE setting ADD COLUMN notice INTEGER NOT NULL DEFAULT 0;` },
		{ name: 'no_recipient', sql: `ALTER TABLE setting ADD COLUMN no_recipient INTEGER NOT NULL DEFAULT 1;` },
		{ name: 'login_domain', sql: `ALTER TABLE setting ADD COLUMN login_domain INTEGER NOT NULL DEFAULT 0;` },
		{ name: 'bucket', sql: `ALTER TABLE setting ADD COLUMN bucket TEXT NOT NULL DEFAULT '';` },
		{ name: 'region', sql: `ALTER TABLE setting ADD COLUMN region TEXT NOT NULL DEFAULT '';` },
		{ name: 'endpoint', sql: `ALTER TABLE setting ADD COLUMN endpoint TEXT NOT NULL DEFAULT '';` },
		{ name: 's3_access_key', sql: `ALTER TABLE setting ADD COLUMN s3_access_key TEXT NOT NULL DEFAULT '';` },
		{ name: 's3_secret_key', sql: `ALTER TABLE setting ADD COLUMN s3_secret_key TEXT NOT NULL DEFAULT '';` },
		{ name: 'force_path_style', sql: `ALTER TABLE setting ADD COLUMN force_path_style INTEGER NOT NULL DEFAULT 1;` },
		{ name: 'custom_domain', sql: `ALTER TABLE setting ADD COLUMN custom_domain TEXT NOT NULL DEFAULT '';` },
		{ name: 'tg_msg_to', sql: `ALTER TABLE setting ADD COLUMN tg_msg_to TEXT NOT NULL DEFAULT 'show';` },
		{ name: 'tg_msg_from', sql: `ALTER TABLE setting ADD COLUMN tg_msg_from TEXT NOT NULL DEFAULT 'only-name';` },
		{ name: 'tg_msg_text', sql: `ALTER TABLE setting ADD COLUMN tg_msg_text TEXT NOT NULL DEFAULT 'hide';` },
		{ name: 'min_email_prefix', sql: `ALTER TABLE setting ADD COLUMN min_email_prefix INTEGER NOT NULL DEFAULT 0;` },
		{ name: 'email_prefix_filter', sql: `ALTER TABLE setting ADD COLUMN email_prefix_filter TEXT NOT NULL DEFAULT '';` },
		{ name: 'black_subject', sql: `ALTER TABLE setting ADD COLUMN black_subject TEXT NOT NULL DEFAULT '';` },
		{ name: 'black_content', sql: `ALTER TABLE setting ADD COLUMN black_content TEXT NOT NULL DEFAULT '';` },
		{ name: 'black_from', sql: `ALTER TABLE setting ADD COLUMN black_from TEXT NOT NULL DEFAULT '';` },
		{ name: 'ai_code', sql: `ALTER TABLE setting ADD COLUMN ai_code INTEGER NOT NULL DEFAULT 1;` },
		{ name: 'ai_code_filter', sql: `ALTER TABLE setting ADD COLUMN ai_code_filter TEXT NOT NULL DEFAULT '';` }
	]);
}

async function addMissingColumns(c, tableName, columns) {
	if (!/^[a-z_]+$/.test(tableName)) {
		throw new Error('Invalid table name');
	}

	const tableRow = await c.env.db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`).bind(tableName).first();
	if (!tableRow) {
		return;
	}

	const { results = [] } = await c.env.db.prepare(`SELECT name FROM pragma_table_info('${tableName}')`).all();
	const columnNames = new Set(results.map(row => row.name));

	for (const column of columns) {
		if (columnNames.has(column.name)) {
			continue;
		}

		try {
			await c.env.db.prepare(column.sql).run();
			columnNames.add(column.name);

			if (column.afterAddSql) {
				await c.env.db.prepare(column.afterAddSql).run();
			}
		} catch (e) {
			console.warn(`跳过 ${tableName}.${column.name} 字段添加，原因：${e.message}`);
		}
	}
}
