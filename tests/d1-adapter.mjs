export function d1Adapter(sqlite) {
  return {
    prepare(sql) {
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        async first() { return sqlite.prepare(sql).get(...args) || null; },
        async all() { return {results: sqlite.prepare(sql).all(...args)}; },
        async run() { return {success: true, meta: {changes: Number(sqlite.prepare(sql).run(...args).changes)}}; }
      };
    }
  };
}
