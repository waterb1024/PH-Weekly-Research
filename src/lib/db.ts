import { createClient, type Client } from "@libsql/client";

declare global {
  // eslint-disable-next-line no-var
  var __tursoClient: Client | undefined;
}

function getClient(): Client {
  if (global.__tursoClient) return global.__tursoClient;
  const url = process.env.TURSO_URL;
  const authToken = process.env.TURSO_TOKEN;
  if (!url) throw new Error("TURSO_URL is not set");
  if (!authToken) throw new Error("TURSO_TOKEN is not set");
  const client = createClient({ url, authToken });
  global.__tursoClient = client;
  return client;
}

export const db: Client = new Proxy({} as Client, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
