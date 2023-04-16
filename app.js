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
  const allSports = await Sport.getSports();
  response.render("index", {
    title: "Sports Application",
    allSports,
  });
  // try {
  //     const allSports = Sport.getSports()
  //     if (request.accepts("html")) {
  //         response.render("index", {
  //             title: "Sports Application",
  //             allSports
  //         });
  //     } else {
  //         response.json({
  //             allSports
  //         });
  //     }
  // } catch (error) {
  //     console.log(error);
  //     return response.status(422).json(error);
  // }
});

app.post("/sports", async function (request, response) {
  console.log("Creating a sport", request.body);
  try {
    const sport = await Sport.addSport({
      title: request.body.title,
    });
    // return response.json(sport)
    return response.redirect("/");
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

module.exports = app;
