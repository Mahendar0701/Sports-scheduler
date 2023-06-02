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

//user signup
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
  "/changePassword",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    response.render("changePassword", {
      isAdmin: request.user.isAdmin,
      userName: request.user.firstName + " " + request.user.lastName,
      title: "Change Password",
      csrfToken: request.csrfToken(),
    });
  }
);

app.post(
  "/changePassword",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const oldPassword = request.body.oldPassword;
    const newPassword = request.body.newPassword;
    try {
      const user = request.user;
      const oldHashedPassword = user.password;
      const isPasswordMatch = await bcrypt.compare(
        oldPassword,
        oldHashedPassword
      );
      if (!isPasswordMatch) {
        request.flash("error", "Invalid old password");
        return response.redirect("/changePassword");
      }
      const saltRounds = 10;
      const newHashedPassword = await bcrypt.hash(newPassword, saltRounds);
      user.password = newHashedPassword;
      await User.update(
        { password: user.password },
        { where: { id: user.id } }
      );
      await user.save();

      request.flash("success", "Password changed successfully");
      response.redirect("/changePassword");
    } catch (error) {
      console.log(error);
      request.flash("error", "An error occurred while changing the password");
      response.redirect("/changePassword");
    }
  }
);

app.get(
  "/sport",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const user = request.user;
      const userName = user.firstName + " " + user.lastName;
      const allSports = await Sport.getAllSports();
      const isAdmin = user.isAdmin;
      const userUpcomingSessions = await user.getSessions({
        where: {
          playDate: {
            [Op.gt]: new Date(),
          },
        },
      });
      const createdUpcomingSessions = await user.getSessions({
        where: {
          playDate: {
            [Op.gt]: new Date(),
          },
          CreatorId: user.id,
        },
      });

      if (request.accepts("html")) {
        response.render("sport", {
          loggedInUser: request.user,
          title: "Sports Application",
          allSports,
          userUpcomingSessions,
          createdUpcomingSessions,
          isAdmin,
          userName,
          csrfToken: request.csrfToken(),
        });
      } else {
        response.json({
          allSports,
          userUpcomingSessions,
          createdUpcomingSessions,
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
      const user = request.user;
      const loggedInUser = request.user.id;
      const userName = user.firstName + " " + user.lastName;
      const allSports = await Sport.getAllSports();
      const isAdmin = user.isAdmin;

      const upComingSessions = await user.getSessions({
        where: {
          playDate: {
            [Op.gt]: new Date(),
          },
          isCanceled: false,
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

      const canceledSessions = await user.getSessions({
        where: {
          isCanceled: true,
        },
      });
      const createdUpcomingSessions = await user.getSessions({
        where: {
          playDate: {
            [Op.gt]: new Date(),
          },
          CreatorId: user.id,
        },
      });

      if (request.accepts("html")) {
        response.render("mySessions", {
          loggedInUser: request.user,
          title: "Sports Application",
          allSports,
          upComingSessions,
          previousSessions,
          canceledSessions,
          isAdmin,
          userName,
          createdUpcomingSessions,
        });
      } else {
        response.json({
          allSports,
          upComingSessions,
          isAdmin,
          createdUpcomingSessions,
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
      const allSports = await Sport.getAllSports();
      console.log("sport id", allSports.length);
      let sessionCounts = [];
      let sortedSessionCount = [];
      let sportTitles = [];
      let sortedSportTitles = [];
      let sportIds = [];
      let sortedSportIds = [];
      for (let i = 0; i < allSports.length; i++) {
        const count = await Session.count({
          where: {
            sportId: allSports[i].id,
          },
        });
        sessionCounts.push(count);
        sportTitles.push(allSports[i].title);
        sportIds.push(allSports[i].id);
      }
      console.log(sessionCounts);
      console.log("sport titles before sort", sportTitles);

      var sessionsPerSport = {};
      var idsPerSport = {};

      for (let i = 0; i < allSports.length; i++) {
        sessionsPerSport[sportTitles[i]] = sessionCounts[i];
      }
      for (let i = 0; i < allSports.length; i++) {
        idsPerSport[sportIds[i]] = sessionCounts[i];
      }

      var sortedSportList = Object.entries(sessionsPerSport);
      var sortedIdsList = Object.entries(idsPerSport);

      sortedSportList.sort((first, second) => {
        return second[1] - first[1];
      });
      sortedIdsList.sort((first, second) => {
        return second[1] - first[1];
      });
      sortedSportTitles = sortedSportList.map((item) => item[0]);
      sortedSportIds = sortedIdsList.map((item) => item[0]);
      sortedSessionCount = sortedSportList.map((item) => item[1]);

      if (request.accepts("html")) {
        response.render("reports", {
          loggedInUser: request.user,
          isAdmin: request.user.isAdmin,
          userName: request.user.firstName + " " + request.user.lastName,
          title: "Sports Application",
          sortedSessionCount,
          sortedSportTitles,
          sortedSportIds,
          startDate,
          endDate,
          csrfToken: request.csrfToken(),
        });
      } else {
        response.json({
          sortedSessionCount,
          sortedSportTitles,
          sortedSportIds,
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
  "/reports",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const startDate = request.body.startDate;
      const endDate = request.body.endDate;
      const allSports = await Sport.getAllSports();
      console.log("sport id", allSports.length);
      let sessionCounts = [];
      let sortedSessionCount = [];
      let sportTitles = [];
      let sortedSportTitles = [];
      let sportIds = [];
      let sortedSportIds = [];
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
        sportIds.push(allSports[i].id);
      }
      console.log(sessionCounts);
      console.log("sport titles before sort", sportTitles);

      var sessionsPerSport = {};
      var idsPerSport = {};

      for (let i = 0; i < allSports.length; i++) {
        sessionsPerSport[sportTitles[i]] = sessionCounts[i];
      }
      for (let i = 0; i < allSports.length; i++) {
        idsPerSport[sportIds[i]] = sessionCounts[i];
      }

      var sortedSportList = Object.entries(sessionsPerSport);
      var sortedIdsList = Object.entries(idsPerSport);

      sortedSportList.sort((first, second) => {
        return second[1] - first[1];
      });
      sortedIdsList.sort((first, second) => {
        return second[1] - first[1];
      });
      sortedSportTitles = sortedSportList.map((item) => item[0]);
      sortedSportIds = sortedIdsList.map((item) => item[0]);
      sortedSessionCount = sortedSportList.map((item) => item[1]);

      if (request.accepts("html")) {
        response.render("reports", {
          loggedInUser: request.user,
          isAdmin: request.user.isAdmin,
          userName: request.user.firstName + " " + request.user.lastName,
          title: "Sports Application",
          sortedSessionCount,
          sortedSportTitles,
          sortedSportIds,
          startDate,
          endDate,
          csrfToken: request.csrfToken(),
        });
      } else {
        response.json({
          sortedSessionCount,
          sortedSportTitles,
          sortedSportIds,
          startDate,
          endDate,
        });
      }
    } catch (error) {
      console.log(error);
      request.flash("error", "Please Fill start Date and end Date!");
      response.redirect("/reports");
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
          isAdmin: request.user.isAdmin,
          userName: request.user.firstName + " " + request.user.lastName,
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

app.get(
  "/sport/:id/report-session//",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const sportId = request.params.id;
      const sportTitle = await Sport.getSportTitle(sportId);
      console.log("sport Title :", sportTitle);
      const allSessions = await Session.findAll({
        where: {
          sportId: sportId,
          isCanceled: false,
        },
      });

      const allCanceledSessions = await Session.findAll({
        where: {
          sportId: sportId,
          isCanceled: true,
        },
      });

      if (request.accepts("html")) {
        response.render("report-sessions2", {
          loggedInUser: request.user,
          isAdmin: request.user.isAdmin,
          userName: request.user.firstName + " " + request.user.lastName,
          title: "Sports Application",
          allSessions,
          allCanceledSessions,
          sportTitle,
          sportId,
        });
      } else {
        response.json({
          allSessions,
          allCanceledSessions,
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
  "/sports",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
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

app.get(
  "/createSport",
  connectEnsureLogin.ensureLoggedIn(),
  (request, response, next) => {
    response.render("createSport", {
      isAdmin: request.user.isAdmin,
      userName: request.user.firstName + " " + request.user.lastName,
      csrfToken: request.csrfToken(),
    });
  }
);

app.get(
  "/sport/:id/new_session",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const sportId = request.params.id;
    const userName = request.user.firstName + " " + request.user.lastName;
    const userId = request.user.id;
    console.log("iddd", sportId);
    response.render("createSession", {
      isAdmin: request.user.isAdmin,
      sportId,
      userName,
      userId,
      csrfToken: request.csrfToken(),
    });
  }
);

app.post(
  "/sessions",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const session = await Session.addSession({
        playDate: request.body.playDate,
        venue: request.body.venue,
        playernames: request.body.playernames.split(","),
        playersneeded: request.body.playersneeded,
        sportId: request.body.sportId,
        CreatorId: request.body.creatorId,
      });
      const id = request.body.sportId;
      const user = request.user;
      console.log("creator Id ", request.body.creatorId);

      const creator = await User.findByPk(request.body.creatorId);
      const creatorName = creator.firstName + " " + creator.lastName;

      await session.addUser(user);
      session.playernames.push(creatorName);
      session.CreatorId = request.body.creatorId;
      await Session.update(
        {
          playernames: session.playernames,
          CreatorId: session.creatorId,
        },
        { where: { id: session.id } }
      );
      await session.save();
      return response.redirect(`/sport/${id}`);
    } catch (error) {
      const id = request.body.sportId;
      console.log(error);
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
    const sportId = request.params.id;
    const title = await Sport.getSportTitle(sportId);
    const user = request.user;
    const isAdmin = user.isAdmin;
    const upcomingSessions = await Session.upcomingSessions(sportId);
    response.render("session", {
      userName: request.user.firstName + " " + request.user.lastName,
      upcomingSessions,
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
    const sportId = request.params.id;
    const title = await Sport.getSportTitle(sportId);

    const user = request.user;
    const isAdmin = user.isAdmin;
    const previousSessions = await Session.prevAndCanceledSessions(sportId);
    response.render("previousSessions", {
      previousSessions,
      userName: request.user.firstName + " " + request.user.lastName,
      sportId,
      title,
      isAdmin,
    });
  }
);

app.get(
  "/sessions/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const userName = request.user.firstName + " " + request.user.lastName;
    const userId = request.user.id;
    const sessionId = request.params.id;
    const session = await Session.getSession(sessionId);

    const sportId = session.sportId;
    const reason = session.reason;
    const title = await Sport.getSportTitle(sportId);
    //isPrevious
    const currentDateTime = new Date();
    const isPrevious = session.playDate < currentDateTime;
    //isCreator
    const creatorId = session.CreatorId;
    let isCreator = false;
    if (userId === creatorId) {
      isCreator = true;
    }
    const creator = await User.findByPk(creatorId);
    const creatorName = creator.firstName + " " + creator.lastName;
    //isAdmin
    const users = request.user;
    const isAdmin = users.isAdmin;
    //isjoined
    const isJoined = await UserSession.isUserJoined(userId, sessionId);
    //allowToJoin
    let allowToJoin = true;
    let userJoinedSession = null;
    const userAllJoinedSessionsIds =
      await UserSession.getUpcomingSessionsByUser(userId);

    for (let i = 0; i < userAllJoinedSessionsIds.length; i++) {
      userJoinedSession = await Session.getSessionWithDtId(
        userAllJoinedSessionsIds[i].sessionId,
        session.playDate
      );
      if (userJoinedSession === null) {
        allowToJoin = true;
      } else {
        allowToJoin = false;
        break;
      }
    }
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
      allowToJoin,
      userJoinedSession,
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
      const session = await Session.getSession(sessionId);
      const sportId = session.sportId;
      await Session.remove(sessionId);
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
      await Session.destroy({
        where: {
          sportId: sportId,
        },
      });
      await Sport.remove(sportId);
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
      const session = await Session.getSession(sessionId);
      const sportId = session.sportId;
      let playernames = session.playernames;
      const playerNameToRemove = request.params.playerName;
      const [firstName, lastName] = playerNameToRemove.split(" ");
      playernames = playernames.filter((name) => name !== playerNameToRemove);

      session.playernames = playernames;
      if (lastName) {
        const user = await User.findOne({
          where: {
            firstName: firstName,
            lastName: lastName,
          },
        });

        if (user != null) {
          await session.removeUser(user);
        }
      }

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
      isAdmin: request.user.isAdmin,
      userName: request.user.firstName + " " + request.user.lastName,
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
      isAdmin: request.user.isAdmin,
      userName: request.user.firstName + " " + request.user.lastName,
      sportId,
      sport,
      csrfToken: request.csrfToken(),
    });
  }
);

module.exports = app;
