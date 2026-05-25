import assert from "node:assert/strict";
import net from "node:net";
import test from "node:test";
import { createHttpServer, createTn3270Server, createTn5250Server, createVtServer } from "./server.js";

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

test("host profile endpoint returns web and terminal profiles", async () => {
  const server = createHttpServer();
  await listen(server, 0);
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/host-profiles.json`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.webProfiles[0].name, "Newland EB Web Demo");
  assert.equal(body.teProfiles.map((p) => p.protocol).join(","), "VT100,TN5250,TN3270");
  assert.equal(body.teProfiles.find((p) => p.protocol === "TN5250").deviceType, "IBM-3477-FC");
  await close(server);
});

test("web demo navigation is not fixed over form fields", async () => {
  const server = createHttpServer();
  await listen(server, 0);
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/assets/style.css`);
  assert.equal(res.status, 200);
  const css = await res.text();
  assert.match(css, /nav\{display:flex/);
  assert.doesNotMatch(css, /nav\{position:fixed/);
  await close(server);
});

test("web demo login includes separate user and password fields", async () => {
  const server = createHttpServer();
  await listen(server, 0);
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/assets/app.js`);
  assert.equal(res.status, 200);
  const js = await res.text();
  assert.match(js, /field\('user','User'\)\+field\('pass','Password','password'\)/);
  assert.match(js, /window\.zoom=\(\)=>page\('Small Server Screen'/);
  await close(server);
});

test("web demo includes JS Bridge print test page", async () => {
  const server = createHttpServer();
  await listen(server, 0);
  try {
    const { port } = server.address();
    const htmlRes = await fetch(`http://127.0.0.1:${port}/`);
    const jsRes = await fetch(`http://127.0.0.1:${port}/assets/app.js`);
    assert.equal(htmlRes.status, 200);
    assert.equal(jsRes.status, 200);
    const html = await htmlRes.text();
    const js = await jsRes.text();
    assert.match(html, /data-action="printTest"/);
    assert.match(js, /window\.printTest/);
    assert.match(js, /Android\.printRaw\(/);
    assert.match(js, /Android\.printRawTo\(/);
    assert.match(js, /CPCL label/);
    assert.match(js, /ESC\/POS receipt/);
    assert.match(js, /Bluetooth SPP/);
  } finally {
    await close(server);
  }
});

test("small screen zoom button has visible text enlargement styles", async () => {
  const server = createHttpServer();
  await listen(server, 0);
  try {
    const { port } = server.address();
    const cssRes = await fetch(`http://127.0.0.1:${port}/assets/style.css`);
    const jsRes = await fetch(`http://127.0.0.1:${port}/assets/app.js`);
    assert.equal(cssRes.status, 200);
    assert.equal(jsRes.status, 200);
    const css = await cssRes.text();
    const js = await jsRes.text();
    assert.match(css, /\.zoomed \.tiny\{font-size:22px/);
    assert.match(css, /\.zoomed \.mono\{font-size:20px/);
    assert.match(js, /classList\.toggle/);
    assert.match(js, /zoomed/);
  } finally {
    await close(server);
  }
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

test("tn5250 demo emits write-to-display records and advances", async () => {
  const server = createTn5250Server();
  await listen(server, 0);
  let client;
  try {
    const { port } = server.address();
    client = net.createConnection({ host: "127.0.0.1", port });

    let data = Buffer.alloc(0);
    client.on("data", (chunk) => {
      data = Buffer.concat([data, Buffer.from(chunk)]);
    });

    await waitFor(() => data.includes(Buffer.from([0x04, 0xF1])));
    assert.ok(data.includes(Buffer.from([0x1D, 0x00, 0x00, 0x20])));
    client.write(Buffer.from([0x7D]));
    await waitFor(() => data.includes(Buffer.from([0xC1, 0xE2, 0x61, 0xF4, 0xF0, 0xF0])));
  } finally {
    client?.destroy();
    await close(server);
  }
});

test("tn3270 demo emits erase-write records and advances", async () => {
  const server = createTn3270Server();
  await listen(server, 0);
  let client;
  try {
    const { port } = server.address();
    client = net.createConnection({ host: "127.0.0.1", port });

    let data = Buffer.alloc(0);
    client.on("data", (chunk) => {
      data = Buffer.concat([data, Buffer.from(chunk)]);
    });

    await waitFor(() => data.includes(Buffer.from([0xF5, 0x04])));
    assert.ok(data.includes(Buffer.from([0x1D, 0x40])));
    client.write(Buffer.from([0x7D]));
    await waitFor(() => data.includes(Buffer.from([0xD4, 0xC1, 0xC9, 0xD5, 0xC6, 0xD9, 0xC1, 0xD4, 0xC5])));
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
