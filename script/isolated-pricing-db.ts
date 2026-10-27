import type { Pool, PoolClient, QueryConfig } from "pg";

/**
 * Neon can use transaction pooling. Session-level SET search_path is NOT safe:
 * a later statement can land on another backend. Scope every test operation to
 * a transaction with SET LOCAL, and leave the underlying backend on public.
 * This adapter is used by tests only, never by the application.
 */
export function isolatePricingPool(pool: Pool, schema: string) {
  if (!/^pricing_test_\d+$/.test(schema)) throw new Error("Invalid test schema");
  const originalConnect = pool.connect.bind(pool);
  const rawQueries = new WeakMap<PoolClient, PoolClient["query"]>();
  const checkout = async () => {
    const client = await originalConnect();
    const raw = rawQueries.get(client) ?? client.query.bind(client);
    rawQueries.set(client, raw);
    let transaction = false;
    const begin = () => raw(`BEGIN; SET search_path TO public; SET LOCAL search_path TO "${schema}"`);
    Object.defineProperty(client, "query", { configurable: true, value: async (query: string | QueryConfig, values?: unknown[]) => {
      const text = typeof query === "string" ? query : query.text;
      if (/^\s*begin\b/i.test(text)) {
        const result = await begin();
        transaction = true;
        return result;
      }
      if (/^\s*(commit|rollback)\s*;?\s*$/i.test(text)) {
        try { return await raw(query, values); } finally { transaction = false; }
      }
      if (transaction) return raw(query, values);
      await begin();
      try {
        const result = await raw(query, values);
        await raw("COMMIT");
        return result;
      } catch (error) {
        await raw("ROLLBACK");
        throw error;
      }
    } });
    return client;
  };
  Object.defineProperty(pool, "connect", { configurable: true, value: checkout });
  Object.defineProperty(pool, "query", { configurable: true, value: async (query: string | QueryConfig, values?: unknown[]) => {
    const client = await checkout();
    try { return await client.query(query, values); } finally { client.release(); }
  } });
}
