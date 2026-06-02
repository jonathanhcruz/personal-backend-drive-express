// TODO Phase 3: initialize pg.Pool with env.databaseUrl
export const query = (_text: string, _params?: unknown[]): never => {
  throw new Error('Database not initialized — implement in Phase 3');
};
