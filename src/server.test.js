import assert from "node:assert/strict";
import net from "node:net";
import test from "node:test";
import { createHttpServer, createVtServer } from "./server.js";

test("http health endpoint returns ok", async () => {
  const server = createHttpServer();
  await listen(server, 0);
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  await close(server);
});

test("vt login reaches main menu", async () => {
  const server = createVtServer();
  await listen(server, 0);
  let client;
  try {
    const { port } = server.address();
    client = net.createConnection({ host: "127.0.0.1", port });
    client.setEncoding("binary");

    let data = "";
    client.on("data", (chunk) => {
      data += chunk;
    });

    await waitFor(() => data.includes("User:"));
    client.write("demo\r");
    client.write("demo\r");
    await waitFor(() => data.includes("Outbound Picking"));
  } finally {
    client?.destroy();
    await close(server);
  }
});

function listen(server, port) {
  return new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

async function waitFor(predicate, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.fail("condition timed out");
}
