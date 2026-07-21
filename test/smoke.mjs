// Basic smoke test — run after `npm run build`: node test/smoke.mjs
// No network: exercises plugin shape, tool/action surface, and the no-key guard.
import assert from "node:assert";
import plugin, { kolFeed, alphaWallets, lastRateLimit } from "../dist/index.js";

assert.equal(plugin.name, "robinhood-chain");
assert.equal(typeof plugin.initialize, "function");

// 14 tool methods
const methods = Object.keys(plugin.methods);
assert.equal(methods.length, 14, "expected 14 tool methods");
for (const [k, v] of Object.entries(plugin.methods)) {
  assert.ok(typeof v === "function", `method ${k} is a function`);
}

// 14 actions, unique names, with zod schemas + handlers
assert.equal(plugin.actions.length, 14, "expected 14 actions");
const names = plugin.actions.map((a) => a.name);
assert.equal(new Set(names).size, 14, "action names unique");
for (const a of plugin.actions) {
  assert.ok(a.name.startsWith("RHC_"), `${a.name} is RHC-prefixed`);
  assert.ok(typeof a.handler === "function", `${a.name} has handler`);
  assert.ok(a.schema && typeof a.schema.parse === "function", `${a.name} has a zod schema`);
  assert.ok(a.description && a.description.length > 0, `${a.name} has description`);
}

// Named exports present
assert.ok(typeof kolFeed === "function" && typeof alphaWallets === "function");
assert.ok(typeof lastRateLimit === "object");

// No-key guard: a tool throws a helpful error rather than hitting the network
let threw = false;
try {
  await kolFeed({ config: {} }, { limit: 1 });
} catch (err) {
  threw = true;
  assert.ok(String(err.message).includes("developer"), "error points to /developer");
}
assert.ok(threw, "no-key tool call throws");

console.log("solana-agent-kit-plugin-robinhood-chain smoke test: OK (14 methods, 14 actions, no-key guard)");
