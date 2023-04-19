/* eslint-disable no-unused-vars */
const { request, response } = require("express");
const express = require("express");
const app = express();
const { Session, Sport } = require("./models");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("./models/session");

app.use(bodyParser.json());
app.set("view engine", "ejs");
// app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));

// app.get('/', function (request, response) {
//     response.render('index')
// })

app.get("/", async (request, response) => {
  try {
    const allSports = await Sport.getSports();
    // const allSessions = await Session.getSessions();
    if (request.accepts("html")) {
      response.render("index", {
        title: "Sports Application",
        allSports,
        // allSessions,
      });
    } else {
      response.json({
        allSports,
        // allSessions,
      });
    }
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.post("/sports", async function (request, response) {
  console.log("Creating a sport", request.body);
  try {
    const sport = await Sport.addSport({
      title: request.body.title,
    });
    return response.redirect("/");
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.get("/createSport", (request, response, next) => {
  response.render("createSport");
});

app.post("/sessions", async function (request, response) {
  console.log("Creating a session", request.body);
  console.log("id...", request.params.id);
  try {
    const sport = await Session.addSession({
      playDate: request.body.playDate,
      venue: request.body.venue,
      playernames: request.body.playernames.split(","),
      playersneeded: request.body.playersneeded,
      sportId: request.body.sportId,
    });
    const id = request.body.sportId;
    return response.redirect(`/sport/${id}`);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.get("/sport/:id", async function (request, response) {
  console.log("paramsid...", request.params);
  const sportId = request.params.id;
  const title = await Sport.getSportTitle(sportId);
  const allSessions = await Session.getSessions(request.params.id);
  response.render("session", {
    // title: "Sports Application",
    allSessions,
    sportId,
    title,
  });
});

app.get("/sport/:id/new_session", async (request, response, next) => {
  const sportId = request.params.id;

  console.log("iddd", sportId);
  response.render("createSession", {
    sportId,
  });
});

module.exports = app;
