/* eslint-disable no-unused-vars */
const { request, response } = require("express");
const express = require("express");
const app = express();
const { Session, Sport } = require("./models");
const bodyParser = require("body-parser");
const path = require("path");

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
    const allSessions = await Session.getSessions();
    if (request.accepts("html")) {
      response.render("index", {
        title: "Sports Application",
        allSports,
        allSessions,
      });
    } else {
      response.json({
        allSports,
        allSessions,
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
  try {
    const sport = await Session.addSession({
      playDate: request.body.playDate,
      venue: request.body.venue,
      playernames: request.body.playernames.split(","),
      playerneeded: request.body.playerneeded,
    });
    return response.redirect("/sport/:id");
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.get("/sport/:id", async function (request, response) {
  // const todo = await Session.findByPk(request.params.id);
  const allSessions = await Session.getSessions();
  // const sportid = request.Sport.id;
  // console.log(sportid)
  response.render("session", {
    title: "Sports Application",
    allSessions,
  });
});

// app.get("/", async function (request, response) {
//     // const todo = await Session.findByPk(request.params.id);
//     const allSessions = await Session.getSessions()
//     response.render("index", {
//         title: "Sports Application",
//         allSessions
//     })
// });

app.get("/createSession", (request, response, next) => {
  response.render("createSession");
});

module.exports = app;
