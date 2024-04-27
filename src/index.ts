import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { Hono } from 'hono';
import { products } from './db/schema';
import { cors } from 'hono/cors';
import { createInsertSchema } from 'drizzle-zod';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { logger } from 'hono/logger';

export type Env = {
	DATABASE_URL: string;
};

const app = new Hono<{ Bindings: Env }>();

const productSchema = createInsertSchema(products);
app.use(logger());
app.use(
	'/*',
	cors({
		origin: ['http://localhost:5173'],
		allowHeaders: [
			'X-Custom-Header',
			'Upgrade-Insecure-Requests',
			'Content-Type',
		],
		allowMethods: ['POST', 'GET', 'DELETE', 'OPTIONS'],
		exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
		maxAge: 600,
		credentials: true,
	})
);

app.get('/', async (c) => {
	const sql = neon(c.env.DATABASE_URL);
	const db = drizzle(sql);
	const allProducts = await db.select().from(products);

	return c.json(allProducts);
});

app.post('/post', zValidator('json', productSchema), async (c) => {
	try {
		const sql = neon(c.env.DATABASE_URL);
		const db = drizzle(sql);
		const { name, description, price } = c.req.valid('json');
		console.log('name', name);
		console.log('description', description);
		console.log('price', price);
		const ok = await db
			.insert(products)
			.values([{ name: name, description: description, price: price }]);
		return c.json(ok);
	} catch (error) {
		console.error(error);
		return c.json({ error: error });
	}
});

app.delete('/', async (c) => {
	const sql = neon(c.env.DATABASE_URL);
	const db = drizzle(sql);
	const body = await c.req.json();
	console.log('id', body.id);
	const result = await db.delete(products).where(eq(products.id, body.id));

	return c.json(result);
});

export default app;
