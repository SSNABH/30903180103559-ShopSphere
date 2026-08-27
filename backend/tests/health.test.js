import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://deci:test@localhost:5432/deci_test?schema=public";
process.env.MONGODB_URI = "mongodb://localhost:27017/deci_test";
process.env.CORS_ORIGIN = "http://localhost:3000";
process.env.JWT_ACCESS_SECRET = "test_access_secret_that_is_long_enough_123";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_that_is_long_enough_456";
process.env.DATABASE_CONNECTION_REQUIRED = "false";

const { app } = await import("../src/app.js");

test("GET /api/health/live reports that the API is alive", async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/health/live`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.service, "deci-project-api");
  assert.equal(body.status, "up");
});
