/* eslint-disable no-unused-vars */
const { request, response } = require("express");
const express = require("express");
const app = express();
const { Session, Sport, User } = require("./models");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("./models/session");

app.use(bodyParser.json());
app.set("view engine", "ejs");
// app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));

app.get("/signup", (request, response) => {
  // if (request.isAuthenticated()) {
  //   return response.redirect("/todos");
  // }
  response.render("signup", {
    title: "Signup",
    // csrfToken: request.csrfToken(),
  });
});

app.post("/users", async (request, response) => {
  // if (
  //   request.body.firstName.length != 0 &&
  //   request.body.email.length != 0 &&
  //   request.body.password.length == 0
  // ) {
  //   request.flash("error", "Password can not be Empty");
  //   return response.redirect("/signup");
  // }
  // const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  // console.log(hashedPwd);
  try {
    const user = await User.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: request.body.password,
    });
    // request.login(user, (err) => {
    //   if (err) {
    //     console.log(err);
    //   }

    response.redirect("/sport");
    // });
  } catch (error) {
    console.log(error);

    return response.status(422).json(error);
  }
});

app.get("/login", (request, response) => {
  // if (request.isAuthenticated()) {
  //   return response.redirect("/sport");
  // }
  response.render("login", { title: "Login" });
});

app.post(
  "/login"
  // ,
  // passport.authenticate("local", {
  //   failureRedirect: "/login",
  //   failureFlash: true,
  // }
),
  async (request, response) => {
    console.log(request.user);
    response.redirect("/sport");
  };
// );

app.get("/", async (request, response) => {
  try {
    const allSports = await Sport.getSports();
    if (request.accepts("html")) {
      response.render("index", {
        title: "Sports Application",
        allSports,
      });
    } else {
      response.json({
        allSports,
      });
    }
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.get("/sport", async (request, response) => {
  try {
    const allSports = await Sport.getSports();
    if (request.accepts("html")) {
      response.render("sport", {
        title: "Sports Application",
        allSports,
      });
    } else {
      response.json({
        allSports,
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
    return response.redirect("/sport");
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
  console.log();

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

app.get("/sessions/:id", async (request, response, next) => {
  console.log("paramsid...", request.params);
  const sessionId = request.params.id;
  const session = await Session.getSession(sessionId);
  const sportId = session.sportId;
  console.log("paramsid...", sportId);
  const title = await Sport.getSportTitle(sportId);
  response.render("dispSession", {
    sessionId,
    session,
    title,
    sportId,
  });
});

app.delete("/sessions/:id", async function (request, response) {
  try {
    const sessionId = request.params.id;
    console.log("Deleting session with ID", sessionId);
    const session = await Session.getSession(sessionId);
    const sportId = session.sportId;
    await Session.remove(sessionId);
    console.log("Session deleted successfully");
    return response.redirect(`/sport/${sportId}`);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.delete("/sport/:id", async function (request, response) {
  try {
    const sportId = request.params.id;
    console.log("Deleting sport with ID", sportId);
    await Sport.remove(sportId);
    console.log("sport deleted successfully");
    return response.redirect("/sport");
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.delete("/sessions/:id/removePlayer", async function (request, response) {
  try {
    const sessionId = request.params.id;
    console.log("Deleting session with ID", sessionId);
    const session = await Session.getSession(sessionId);
    const sportId = session.sportId;
    await Session.remove(sessionId);
    console.log("Session deleted successfully");
    return response.redirect(`/sport/${sportId}`);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

module.exports = app;
