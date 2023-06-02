/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const request = require("supertest");
var cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");

describe("First test suite ", () => {
  test("First case", () => {
    expect(true).toBe(true);
  });
});

let server, agent;
function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name = _csrf]").val();
}

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/signin").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("Sports Application", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Sign up", async () => {
    let res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      firstName: "Test",
      lastName: "User A",
      email: "user.a@test.com",
      password: "12345678",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("should sign in a user", async () => {
    // Sign up a user
    let res1 = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res1);
    res1 = await agent.post("/users").send({
      firstName: "Test",
      lastName: "User A",
      email: "user.a@test.com",
      password: "12345678",
      _csrf: csrfToken,
    });
    expect(res1.statusCode).toBe(302);

    // Sign in the user
    let res2 = await agent.get("/login");
    let csrfToken2 = extractCsrfToken(res2);
    res2 = await agent.post("/signin").send({
      email: "user.a@test.com",
      password: "12345678",
      _csrf: csrfToken2,
    });
    expect(res2.statusCode).toBe(302);
  });

  test("Sign out", async () => {
    let res = await agent.get("/sport");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/sport");
    expect(res.statusCode).toBe(302);
  });

  test(" Creating a sport", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678");
    const res = await agent.get("/sport");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/sports").send({
      title: "Cricket",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(403);
  });
});
