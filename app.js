/* eslint-disable no-unused-vars */
const { request, response } = require("express");
const { Op } = require("sequelize");
const express = require("express");
// var csrf = require("tiny-csrf");
var csrf = require("csurf");
const app = express();
const { Session, Sport, User, UserSession } = require("./models");
const bodyParser = require("body-parser");
const path = require("path");
var cookieParser = require("cookie-parser");
// const session = require("./models/session");

const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const flash = require("connect-flash");
const localStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const saltRounds = 10;

app.use(bodyParser.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(flash());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("sshh! some secret string"));
app.use(csrf({ cookie: true }));
// app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));

app.use(
  session({
    secret: "my-super-secret-key-21728172615261562",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});

passport.use(
  new localStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({ where: { email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid password" });
          }
        })
        .catch((error) => {
          return done(null, false, { message: "Invalid Email or password" });
        });
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializing user in session : ", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  console.log("deserializing user from session: ", id);
  User.findByPk(id)
    .then((users) => {
      done(null, users);
    })
    .catch((error) => {
      done(error, null);
    });
});

app.get("/", async (request, response) => {
  response.render("index", {
    title: "Sports Application",
    csrfToken: request.csrfToken(),
  });
});

app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "Signup",
    csrfToken: request.csrfToken(),
  });
});

app.post("/users", async (request, response) => {
  if (
    request.body.firstName.length != 0 &&
    request.body.email.length != 0 &&
    request.body.password.length == 0
  ) {
    request.flash("error", "Password can not be Empty");
    return response.redirect("/signup");
  }
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  console.log(hashedPwd);
  try {
    const user = await User.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPwd,
      isAdmin: false,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
      }

      response.redirect("/sport");
    });
  } catch (error) {
    console.log(error);
    // return response.status(422).json(error);
    if (error.name == "SequelizeValidationError") {
      const errMsg = error.errors.map((error) => error.message);
      console.log("flash errors", errMsg);
      errMsg.forEach((message) => {
        if (message == "Validation notEmpty on firstName failed") {
          request.flash("error", "First Name cannot be empty");
        }
        if (message == "Validation notEmpty on email failed") {
          request.flash("error", "Email cannot be empty");
        }
      });
      response.redirect("/signup");
    } else if (error.name == "SequelizeUniqueConstraintError") {
      const errMsg = error.errors.map((error) => error.message);
      console.log(errMsg);
      errMsg.forEach((message) => {
        if (message == "email must be unique") {
          request.flash("error", "Email already used");
        }
      });
      response.redirect("/signup");
    } else {
      console.log(error);
      return response.status(422).json(error);
    }
  }
});

// app.post("/users", async (request, response) => {
//   const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
//   console.log(hashedPwd);
//   try {
//     const user = await User.create({
//       firstName: request.body.firstName,
//       lastName: request.body.lastName,
//       email: request.body.email,
//       password: hashedPwd,
//     });

//     // Check if the registered user has admin credentials
//     if (
//       user.email === config.adminCredentials.email &&
//       request.body.password === config.adminCredentials.password
//     ) {
//       user.isAdmin = true;
//       await user.save();
//     }

//     request.login(user, (err) => {
//       if (err) {
//         console.log(err);
//       }

//       response.redirect("/sport");
//     });
//   } catch (error) {
//     console.log(error);
//     return response.status(422).json(error);
//   }
// });

app.get("/login", (request, response) => {
  response.render("login", { title: "Login", csrfToken: request.csrfToken() });
});

app.post(
  "/signin",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  async (request, response) => {
    console.log(request.user);
    response.redirect("/sport");
  }
);

app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});

app.get(
  "/sport",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const loggedInUser = request.user.id;
      const userName = request.user.firstName + " " + request.user.lastName;
      console.group(loggedInUser);
      const allSports = await Sport.getSports();

      const user = request.user;
      // let isAdmin = false;
      // if (
      //   user.email === config.adminCredentials.email
      //   // &&
      //   // request.body.password === config.adminCredentials.password
      // ) {
      //   isAdmin = true;
      // }
      const isAdmin = user.isAdmin;
      const allSessions = await user.getSessions({
        where: {
          playDate: {
            [Op.gt]: new Date(),
          },
          isCanceled: false,
        },
      });
      if (request.accepts("html")) {
        response.render("sport", {
          loggedInUser: request.user,
          title: "Sports Application",
          allSports,
          allSessions,
          isAdmin,
          userName,
          csrfToken: request.csrfToken(),
        });
      } else {
        response.json({
          allSports,
          allSessions,
          isAdmin,
        });
      }
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.get(
  "/my_sessions",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const loggedInUser = request.user.id;
      const userName = request.user.firstName + " " + request.user.lastName;
      console.group(loggedInUser);
      const allSports = await Sport.getSports();

      const user = request.user;
      // let isAdmin = false;
      // if (
      //   user.email === config.adminCredentials.email
      //   // &&
      //   // request.body.password === config.adminCredentials.password
      // ) {
      //   isAdmin = true;
      // }
      const isAdmin = user.isAdmin;
      const allSessions = await user.getSessions({
        where: {
          playDate: {
            [Op.gt]: new Date(),
          },
        },
      });
      const previousSessions = await user.getSessions({
        where: {
          playDate: {
            [Op.lt]: new Date(),
          },
          isCanceled: false,
        },
      });

      // console.log("Previous Sessions: ", previousSessions.length);

      const canceledSessions = await user.getSessions({
        where: {
          isCanceled: true,
        },
      });

      // console.log("canceled Sessions: ", canceledSessions.length);

      if (request.accepts("html")) {
        response.render("mySessions", {
          loggedInUser: request.user,
          title: "Sports Application",
          allSports,
          allSessions,
          previousSessions,
          canceledSessions,
          isAdmin,
          userName,
        });
      } else {
        response.json({
          allSports,
          allSessions,
          isAdmin,
        });
      }
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.get(
  "/reports",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const startDate = request.query.startDate;
      const endDate = request.query.endDate;
      const allSports = await Sport.getSports();
      // const sportTitles = await Sport.getSportTitle();
      console.log("sport id", allSports.length);
      let sessionCounts = [];
      let sportTitles = [];
      for (let i = 0; i < allSports.length; i++) {
        const count = await Session.count({
          where: {
            sportId: allSports[i].id,
            playDate: {
              [Op.between]: [startDate, endDate],
            },
          },
        });
        sessionCounts.push(count);
        sportTitles.push(allSports[i].title);
      }
      console.log(sessionCounts);
      console.log("sport titles", sportTitles);

      if (request.accepts("html")) {
        response.render("reports", {
          loggedInUser: request.user,
          title: "Sports Application",
          allSports,
          sessionCounts,
          sportTitles,
          startDate,
          endDate,
          csrfToken: request.csrfToken(),
        });
      } else {
        response.json({
          allSports,
          sessionCounts,
          sportTitles,
          startDate,
          endDate,
        });
      }
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.get(
  "/sport/:id/report-session/:startDate/:endDate",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const startDate = request.params.startDate;
      const endDate = request.params.endDate;
      const sportId = request.params.id;
      const sportTitle = await Sport.getSportTitle(sportId);
      console.log("sport Title :", sportTitle);
      const allSessions = await Session.findAll({
        where: {
          sportId: sportId,
          playDate: {
            [Op.between]: [startDate, endDate],
          },
          isCanceled: false,
        },
      });

      const allCanceledSessions = await Session.findAll({
        where: {
          sportId: sportId,
          playDate: {
            [Op.between]: [startDate, endDate],
          },
          isCanceled: true,
        },
      });

      if (request.accepts("html")) {
        response.render("report-sessions", {
          loggedInUser: request.user,
          title: "Sports Application",
          allSessions,
          allCanceledSessions,
          sportTitle,
          startDate,
          endDate,
          sportId,
        });
      } else {
        response.json({
          allSessions,
          allCanceledSessions,
          startDate,
          endDate,
          sportId,
          sportTitle,
        });
      }
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.post(
  "/reports",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const startDate = request.body.startDate;
      const endDate = request.body.endDate;
      const allSports = await Sport.getSports();
      let sessionCounts = [];
      let sportTitles = [];

      for (let i = 0; i < allSports.length; i++) {
        const count = await Session.count({
          where: {
            sportId: allSports[i].id,
            playDate: {
              [Op.between]: [startDate, endDate],
            },
          },
        });
        sessionCounts.push(count);
        sportTitles.push(allSports[i].title);
      }

      if (request.accepts("html")) {
        response.render("reports", {
          loggedInUser: request.user,
          title: "Sports Application",
          allSports,
          sessionCounts,
          sportTitles,
          startDate,
          endDate,
          csrfToken: request.csrfToken(),
        });
      } else {
        response.json({
          allSports,
          sessionCounts,
          sportTitles,
          startDate,
          endDate,
        });
      }
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.post(
  "/sports",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log("Creating a sport", request.body);
    try {
      const sport = await Sport.addSport({
        title: request.body.title,
      });
      return response.redirect("/sport");
    } catch (error) {
      console.log(error);
      // return response.status(422).json(error);
      if (error.name == "SequelizeValidationError") {
        const errMsg = error.errors.map((error) => error.message);
        console.log("flash errors", errMsg);
        errMsg.forEach((message) => {
          if (message == "Validation notEmpty on title failed") {
            request.flash("error", "Sport name cannot be empty");
          }
        });
        response.redirect("/createSport");
      } else if (error.name == "SequelizeUniqueConstraintError") {
        const errMsg = error.errors.map((error) => error.message);
        console.log(errMsg);
        errMsg.forEach((message) => {
          if (message == "title must be unique") {
            request.flash("error", "Sport already created");
          }
        });
        response.redirect("/createSport");
      } else {
        console.log(error);
        return response.status(422).json(error);
      }
    }
  }
);

app.get("/createSport", (request, response, next) => {
  response.render("createSport", { csrfToken: request.csrfToken() });
});

app.post(
  "/sessions",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log("Creating a session", request.body);
    console.log("id...", request.params.id);
    try {
      const session = await Session.addSession({
        playDate: request.body.playDate,
        venue: request.body.venue,
        playernames: request.body.playernames.split(","),
        playersneeded: request.body.playersneeded,
        sportId: request.body.sportId,
        creatorName: request.body.creatorName,
      });
      const id = request.body.sportId;
      const user = request.user;
      console.log("creator name ", request.body.creatorName);

      await session.addUser(user);
      session.playernames.push(request.body.creatorName);
      session.creatorName = request.body.creatorName;
      await Session.update(
        {
          playernames: session.playernames,
          creatorName: session.creatorName,
        },
        { where: { id: session.id } }
      );
      await session.save();
      return response.redirect(`/sport/${id}`);
    } catch (error) {
      const id = request.body.sportId;
      console.log(error);
      // return response.status(422).json(error);
      if (error.name == "SequelizeValidationError") {
        const errMsg = error.errors.map((error) => error.message);
        console.log("flash errors", errMsg);
        errMsg.forEach((message) => {
          if (message == "Validation notEmpty on playDate failed") {
            request.flash("error", "Play Date cannot be empty");
          }
          if (message == "Validation notEmpty on venue failed") {
            request.flash("error", "Venue cannot be empty");
          }
          if (message == "Validation notEmpty on playersneeded failed") {
            request.flash("error", "Number of players nedded cannot be empty");
          }
        });
        response.redirect(`/sport/${id}/new_session`);
      } else {
        console.log(error);
        return response.status(422).json(error);
      }
    }
  }
);

app.get(
  "/sport/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log("paramsid...", request.params);
    const sportId = request.params.id;
    const title = await Sport.getSportTitle(sportId);
    console.log();

    const user = request.user;
    const isAdmin = user.isAdmin;

    const allSessions = await Session.upcomingSessions(sportId);
    response.render("session", {
      // title: "Sports Application",
      allSessions,
      sportId,
      title,
      isAdmin,
      csrfToken: request.csrfToken(),
    });
  }
);

app.get(
  "/sport/:id/prev_sessions",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log("paramsid...", request.params);
    const sportId = request.params.id;
    const title = await Sport.getSportTitle(sportId);
    console.log();

    const user = request.user;
    const isAdmin = user.isAdmin;

    const allSessions = await Session.prevSessions(sportId);
    response.render("previousSessions", {
      // title: "Sports Application",
      allSessions,
      sportId,
      title,
      isAdmin,
    });
  }
);

app.get(
  "/sport/:id/canceled_sessions",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log("paramsid...", request.params);
    const sportId = request.params.id;
    const title = await Sport.getSportTitle(sportId);
    console.log();

    const user = request.user;
    const isAdmin = user.isAdmin;

    const allSessions = await Session.canceledSessions(sportId);
    response.render("canceledSessions", {
      // title: "Sports Application",
      allSessions,
      sportId,
      title,
      isAdmin,
    });
  }
);

app.get(
  "/sport/:id/new_session",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response, next) => {
    const sportId = request.params.id;
    const userName = request.user.firstName + " " + request.user.lastName;
    console.log("iddd", sportId);
    response.render("createSession", {
      sportId,
      userName,
      csrfToken: request.csrfToken(),
    });
  }
);

app.get(
  "/sessions/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response, next) => {
    console.log("paramsid...", request.params);
    console.log("userId: ", request.user.id);
    const userName = request.user.firstName + " " + request.user.lastName;
    const userId = request.user.id;
    const sessionId = request.params.id;
    const session = await Session.getSession(sessionId);

    console.log(session.playersneeded);
    const sportId = session.sportId;
    const user = await User.findByPk(userId);

    const reason = session.reason;

    console.log("paramsid...", sportId);
    const title = await Sport.getSportTitle(sportId);
    //isPrevious
    const currentDateTime = new Date();
    const isPrevious = session.playDate < currentDateTime;
    //isCreator
    let isCreator = false;
    if (userName === session.creatorName) {
      isCreator = true;
    }
    const creatorName = session.creatorName;
    //isAdmin
    const users = request.user;
    const isAdmin = users.isAdmin;
    //isjoined
    const isJoined = await UserSession.isUserJoined(userId, sessionId);

    response.render("dispSession", {
      userName,
      userId,
      sessionId,
      session,
      title,
      sportId,
      isPrevious,
      isJoined,
      isAdmin,
      isCreator,
      reason,
      creatorName,
      csrfToken: request.csrfToken(),
    });
  }
);

app.post(
  "/sessions/:id/join",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const sessionId = request.params.id;
      const session = await Session.getSession(sessionId);
      const user = request.user;

      await session.addUser(user);

      const userName = request.user.firstName + " " + request.user.lastName;
      session.playernames.push(userName);
      session.playersneeded = session.playersneeded - 1;
      await Session.update(
        { playernames: session.playernames },
        { where: { id: sessionId } }
      );
      await Session.update(
        { playersneeded: session.playersneeded },
        { where: { id: sessionId } }
      );
      await session.save();

      response.redirect(`/sessions/${sessionId}`);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.post(
  "/sessions/:id/leave",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const sessionId = request.params.id;
      const session = await Session.getSession(sessionId);
      const user = request.user;

      await session.removeUser(user);

      const userName = request.user.firstName + " " + request.user.lastName;

      session.playernames = session.playernames.filter(
        (name) => name !== userName
      );

      session.playersneeded = session.playersneeded + 1;

      await Session.update(
        { playernames: session.playernames },
        { where: { id: sessionId } }
      );

      await Session.update(
        { playersneeded: session.playersneeded },
        { where: { id: sessionId } }
      );
      await session.save();

      response.redirect(`/sessions/${sessionId}`);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.post(
  "/sessions/:id/cancel",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const sessionId = request.params.id;
      const session = await Session.getSession(sessionId);
      // const user = request.user;

      session.reason = request.body.reason;
      session.isCanceled = true;
      session.playersneeded = session.playersneeded + 1;

      await Session.update(
        {
          isCanceled: session.isCanceled,
          reason: session.reason,
        },
        { where: { id: sessionId } }
      );

      response.redirect(`/sessions/${sessionId}`);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.delete(
  "/sessions/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
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
  }
);

app.delete(
  "/sport/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
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
  }
);

app.post(
  "/sessions/:id/removePlayer/:playerName",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const sessionId = request.params.id;
      console.log("Deleting session with ID", sessionId);
      const session = await Session.getSession(sessionId);
      const sportId = session.sportId;
      let playernames = session.playernames;
      const playerNameToRemove = request.params.playerName;

      playernames = playernames.filter((name) => name !== playerNameToRemove);

      session.playernames = playernames;

      session.playersneeded = session.playersneeded + 1;

      await Session.update(
        {
          playernames: session.playernames,
          playersneeded: session.playersneeded,
        },
        { where: { id: sessionId } }
      );
      await session.save();

      return response.redirect(`/sessions/${sessionId}`);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.post(
  "/sessions/:id/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const sessionId = request.params.id;
      console.log("Updating session with ID", sessionId);
      const session = await Session.getSession(sessionId);
      session.venue = request.body.venue;
      session.playernames = request.body.playernames.split(",");
      session.playersneeded = request.body.playersneeded;

      await Session.update(
        {
          playernames: session.playernames,
          playersneeded: session.playersneeded,
          venue: session.venue,
        },
        {
          where: { id: sessionId },
        }
      );
      await session.save();

      console.log("Session Edited successfully");
      return response.redirect(`/sessions/${sessionId}`);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.get(
  "/sessions/:id/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response, next) => {
    const sessionId = request.params.id;
    const session = await Session.getSession(sessionId);
    response.render("editSession", {
      sessionId,
      session,
      csrfToken: request.csrfToken(),
    });
  }
);

app.post(
  "/sport/:id/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const sportId = request.params.id;
      console.log("Updating sport with ID", sportId);
      const sport = await Sport.getSport(sportId);
      sport.title = request.body.title;

      await Sport.update(
        {
          title: sport.title,
        },
        {
          where: { id: sportId },
        }
      );
      await sport.save();

      console.log("Session Edited successfully");
      return response.redirect(`/sport/${sportId}`);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.get(
  "/sport/:id/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response, next) => {
    const sportId = request.params.id;
    const sport = await Sport.getSport(sportId);
    console.log("Updating sport ", sport);
    response.render("editSport", {
      sportId,
      sport,
      csrfToken: request.csrfToken(),
    });
  }
);

module.exports = app;
