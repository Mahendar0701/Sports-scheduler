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

function requireAdmin(req, res, next) {
  if (req.user && req.user.isAdmin === true) {
    return next();
  } else {
    res.status(401).json({ message: "Unauthorized user" });
  }
}

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
      isAdmin: true,
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

      const allAdminSports = await Sport.getSportsByAdmin(request.user.id);

      const isAdmin = user.isAdmin;
      const userId = request.user.id;

      const userUpcomingSessionsIds = await UserSession.getSessionsByUser(
        userId
      );
      let userUpcomingSessions = [];
      let allUserUpcomingSessions = null;
      for (let i = 0; i < userUpcomingSessionsIds.length; i++) {
        allUserUpcomingSessions = await Session.getUserUpcomingSession(
          userUpcomingSessionsIds[i].sessionId
        );
        if (allUserUpcomingSessions) {
          userUpcomingSessions.push(allUserUpcomingSessions);
        }
      }

      const createdUpcomingSessions = await Session.getCreatedUpcomingSessions(
        user.id
      );

      if (request.accepts("html")) {
        response.render("sport", {
          loggedInUser: request.user,
          allSports,
          userUpcomingSessions,
          createdUpcomingSessions,
          isAdmin,
          userName,
          allAdminSports,
          csrfToken: request.csrfToken(),
        });
      } else {
        response.json({
          allSports,
          userUpcomingSessions,
          createdUpcomingSessions,
          allAdminSports,
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
      const userName = user.firstName + " " + user.lastName;
      const allSports = await Sport.getAllSports();
      const isAdmin = user.isAdmin;

      const userSessionsIds = await UserSession.getSessionsByUser(user.id);
      let allUserSessions = null;
      //active upcoming sessions
      let upComingSessions = [];
      for (let i = 0; i < userSessionsIds.length; i++) {
        allUserSessions = await Session.getActiveUpcomingSession(
          userSessionsIds[i].sessionId
        );
        if (allUserSessions) {
          upComingSessions.push(allUserSessions);
        }
      }
      //previous sessions
      let previousSessions = [];
      for (let i = 0; i < userSessionsIds.length; i++) {
        allUserSessions = await Session.getPreviousSession(
          userSessionsIds[i].sessionId
        );
        if (allUserSessions) {
          previousSessions.push(allUserSessions);
        }
      }
      //cancelled sessions
      let canceledSessions = [];
      for (let i = 0; i < userSessionsIds.length; i++) {
        allUserSessions = await Session.getCancelSession(
          userSessionsIds[i].sessionId
        );
        if (allUserSessions) {
          canceledSessions.push(allUserSessions);
        }
      }
      //created sessions
      const createdSessions = await Session.getAllCreatedSessions(user.id);

      if (request.accepts("html")) {
        response.render("mySessions", {
          allSports,
          upComingSessions,
          previousSessions,
          canceledSessions,
          isAdmin,
          userName,
          createdSessions,
        });
      } else {
        response.json({
          allSports,
          upComingSessions,
          previousSessions,
          canceledSessions,
          isAdmin,
          userName,
          createdSessions,
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
  requireAdmin,
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const startDate = request.query.startDate;
      const endDate = request.query.endDate;
      const allSports = await Sport.getAllSports();
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
          sortedSessionCount,
          sortedSportTitles,
          sortedSportIds,
          startDate,
          endDate,
          csrfToken: request.csrfToken(),
        });
      } else {
        response.json({
          loggedInUser: request.user,
          isAdmin: request.user.isAdmin,
          userName: request.user.firstName + " " + request.user.lastName,
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
          isAdmin: request.user.isAdmin,
          userName: request.user.firstName + " " + request.user.lastName,
          sortedSessionCount,
          sortedSportTitles,
          sortedSportIds,
          startDate,
          endDate,
          csrfToken: request.csrfToken(),
        });
      } else {
        response.json({
          isAdmin: request.user.isAdmin,
          userName: request.user.firstName + " " + request.user.lastName,
          sortedSessionCount,
          sortedSportTitles,
          sortedSportIds,
          startDate,
          endDate,
        });
      }
    } catch (error) {
      console.log(error);
      request.flash("error", "Start Date and End Date cannot be empty!");
      response.redirect("/reports");
    }
  }
);

app.get(
  "/sport/:id/report-session/:startDate/:endDate",
  requireAdmin,
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const startDate = request.params.startDate;
      const endDate = request.params.endDate;
      const sportId = request.params.id;
      const sportTitle = await Sport.getSportTitle(sportId);

      const allSessions = await Session.getAllSessionsInPeriod(
        sportId,
        startDate,
        endDate
      );
      const allCanceledSessions = await Session.getCancelledInPeriod(
        sportId,
        startDate,
        endDate
      );

      if (request.accepts("html")) {
        response.render("reportInsights", {
          loggedInUser: request.user,
          isAdmin: request.user.isAdmin,
          userName: request.user.firstName + " " + request.user.lastName,
          allSessions,
          allCanceledSessions,
          sportTitle,
          startDate,
          endDate,
          sportId,
        });
      } else {
        response.json({
          isAdmin: request.user.isAdmin,
          userName: request.user.firstName + " " + request.user.lastName,
          allSessions,
          allCanceledSessions,
          sportTitle,
          startDate,
          endDate,
          sportId,
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
  requireAdmin,
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const sportId = request.params.id;
      const sportTitle = await Sport.getSportTitle(sportId);

      const allSessions = await Session.getAllUnCancelled(sportId);
      const allCanceledSessions = await Session.canceledSessions(sportId);

      if (request.accepts("html")) {
        response.render("report-sessions2", {
          isAdmin: request.user.isAdmin,
          userName: request.user.firstName + " " + request.user.lastName,
          allSessions,
          allCanceledSessions,
          sportTitle,
          sportId,
        });
      } else {
        response.json({
          isAdmin: request.user.isAdmin,
          userName: request.user.firstName + " " + request.user.lastName,
          allSessions,
          allCanceledSessions,
          sportTitle,
          sportId,
        });
      }
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.get(
  "/createSport",
  connectEnsureLogin.ensureLoggedIn(),
  requireAdmin,
  (request, response, next) => {
    const userId = request.user.id;
    response.render("createSport", {
      isAdmin: request.user.isAdmin,
      userId,
      userName: request.user.firstName + " " + request.user.lastName,
      csrfToken: request.csrfToken(),
    });
  }
);

app.post(
  "/sports",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const sport = await Sport.addSport({
        title: request.body.title,
        userId: request.user.id,
      });

      await Sport.updateUserID(request.user.id, sport.id);

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
  "/sport/:id/new_session",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const sportId = request.params.id;
    let allowToJoin = true;
    const userName = request.user.firstName + " " + request.user.lastName;
    const userId = request.user.id;
    console.log("iddd", sportId);
    response.render("createSession", {
      isAdmin: request.user.isAdmin,
      sportId,
      allowToJoin,
      userName,
      userId,
      csrfToken: request.csrfToken(),
    });
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

app.post(
  "/sessions",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      //allowToJoin
      const user = request.user;
      let allowToJoin = true;
      let userJoinedSession = null;
      const userAllJoinedSessionsIds =
        await UserSession.getUpcomingSessionsByUser(user.id);
      //user Already joined session at scheduled date
      for (let i = 0; i < userAllJoinedSessionsIds.length; i++) {
        userJoinedSession = await Session.getSessionWithDtId(
          userAllJoinedSessionsIds[i].sessionId,
          request.body.playDate
        );
        if (userJoinedSession === null) {
          allowToJoin = true;
        } else {
          allowToJoin = false;
          break;
        }
      }

      if (allowToJoin === true) {
        // const inputDate = request.body.playDate;
        // const ISTDateTime = new Date(inputDate);
        // const UTCDateTime = new Date(
        //   ISTDateTime.getTime() - ISTDateTime.getTimezoneOffset() * 6000
        // );
        // const playDate = UTCDateTime.toISOString();
        const istDateTime = new Date(request.body.playDate);
        const utcDateTime = new Date(
          istDateTime.getTime() - istDateTime.getTimezoneOffset() * 60000
        );

        const utcTime = utcDateTime.toISOString();

        const session = await Session.addSession({
          // playDate: utcTime,
          playDate: request.body.playDate,
          venue: request.body.venue,
          playernames: request.body.playernames.split(","),
          playersneeded: request.body.playersneeded,
          sportId: request.body.sportId,
          CreatorId: request.user.id,
        });
        const userId = request.user.id;
        const sessionId = session.id;
        console.log("creator Id ", request.body.creatorId);

        await UserSession.addCreator(userId, sessionId);
        await Session.updateCreatorId(userId, sessionId);

        return response.redirect(`/sessions/${session.id}`);
      } else {
        response.render("createSession", {
          isAdmin: request.user.isAdmin,
          allowToJoin,
          userJoinedSession,
          userName: request.user.firstName + " " + request.user.lastName,
          sportId: request.body.sportId,
          userId: request.user.id,
          csrfToken: request.csrfToken(),
        });
      }
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
            request.flash("error", "Number of players needed cannot be empty");
          }
        });
        response.redirect(`/sport/${id}/new_session`);
      } else {
        console.log(error);
        request.flash("error", "Fill all details");
        response.redirect(`/sport/${id}/new_session`);
        // return response.status(422).json(error);
      }
    }
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
    console.log("play date....", session.playDate);
    console.log("new date....", new Date().toLocaleString());
    //players
    let sessionPlayers = [];
    const sessionPlayerlist = await UserSession.getSessionPlayers(sessionId);
    for (let i = 0; i < sessionPlayerlist.length; i++) {
      sessionPlayers.push(await User.findByPk(sessionPlayerlist[i].userId));
    }
    //members
    const sessionMembers = session.playernames;
    //isPrevious
    const currentDateTime = new Date();
    currentDateTime.setHours(currentDateTime.getHours() + 5);
    currentDateTime.setMinutes(currentDateTime.getMinutes() + 30);
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
      creatorId,
      sessionPlayers,
      sessionMembers,
      sessionPlayerlist,
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
      await UserSession.addPlayer(user.id, sessionId);
      await Session.updatePlayers(
        session.playernames,
        session.playersneeded - 1,
        sessionId
      );
      await session.save();
      // response.redirect(`/sessions/${sessionId}`);
      return response.json({ success: true });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.delete(
  "/sessions/:id/leave",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const sessionId = request.params.id;
      const session = await Session.getSession(sessionId);
      const user = request.user;

      await UserSession.removePlayer(user.id, sessionId);
      await Session.updatePlayers(
        session.playernames,
        session.playersneeded + 1,
        sessionId
      );
      await session.save();
      // response.redirect(`/sessions/${sessionId}`);
      return response.json({ success: true });
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
      const reason = request.body.reason;
      await Session.updateCancellation(reason, sessionId);

      response.redirect(`/sessions/${sessionId}`);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.delete(
  "/sessions/:id/removeSessionMember/:memberName",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const sessionId = request.params.id;
      const session = await Session.getSession(sessionId);
      let playernames = session.playernames;
      const memberNameToRemove = request.params.memberName;
      playernames = playernames.filter((name) => name !== memberNameToRemove);
      session.playernames = playernames;
      await Session.updatePlayers(
        session.playernames,
        session.playersneeded + 1,
        sessionId
      );
      await session.save();
      return response.json({ success: true });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.delete(
  "/sessions/:id/removeSessionPlayer/:playerId",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const sessionId = request.params.id;
      const session = await Session.getSession(sessionId);
      let playerIdToRemove = request.params.playerId;

      await UserSession.removePlayer(playerIdToRemove, sessionId);
      await Session.updatePlayers(
        session.playernames,
        session.playersneeded + 1,
        sessionId
      );
      await session.save();
      return response.json({ success: true });
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
  "/sessions/:id/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const sessionId = request.params.id;
      await Session.updateSessionDetails(
        request.body.playDate,
        request.body.playernames.split(","),
        request.body.playersneeded,
        request.body.venue,
        sessionId
      );
      return response.redirect(`/sessions/${sessionId}`);
    } catch (error) {
      const sessionId = request.params.id;
      console.log(error);
      // return response.status(422).json(error);
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
            request.flash("error", "Number of players needed cannot be empty");
          }
        });
        response.redirect(`/sessions/${sessionId}/edit`);
      } else {
        console.log(error);
        request.flash("error", "Fill all details");
        response.redirect(`/sessions/${sessionId}/edit`);
        // return response.status(422).json(error);
      }
    }
  }
);

app.get(
  "/sessions/:id/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response, next) => {
    const sessionId = request.params.id;
    const session = await Session.getSession(sessionId);
    const isCanceled = session.isCanceled;
    const currentDateTime = new Date();
    currentDateTime.setHours(currentDateTime.getHours() + 5);
    currentDateTime.setMinutes(currentDateTime.getMinutes() + 30);
    const isPrevious = session.playDate < currentDateTime;
    const creatorId = session.CreatorId;
    let isCreator = false;
    if (request.user.id === creatorId) {
      isCreator = true;
    }
    response.render("editSession", {
      isAdmin: request.user.isAdmin,
      userName: request.user.firstName + " " + request.user.lastName,
      sessionId,
      isCanceled,
      isCreator,
      session,
      isPrevious,
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
      const sportTitle = request.body.title;
      await Sport.updateSportTitle(sportTitle, sportId);
      return response.redirect(`/sport/${sportId}`);
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
        response.redirect("/editSport");
      } else if (error.name == "SequelizeUniqueConstraintError") {
        const errMsg = error.errors.map((error) => error.message);
        console.log(errMsg);
        errMsg.forEach((message) => {
          if (message == "title must be unique") {
            request.flash("error", "Sport already created");
          }
        });
        response.redirect("/editSport");
      } else {
        console.log(error);
        return response.status(422).json(error);
      }
    }
  }
);

app.get(
  "/sport/:id/edit",
  requireAdmin,
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

app.get(
  "/editProfile",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response, next) => {
    const user = request.user;
    const email = user.email;
    const firstName = user.firstName;
    const lastName = user.lastName;
    response.render("editProfile", {
      isAdmin: request.user.isAdmin,
      userName: firstName + " " + lastName,
      email,
      firstName,
      lastName,
      csrfToken: request.csrfToken(),
    });
  }
);

app.post(
  "/editProfile",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.body.firstName.length === 0 && request.body.email.length != 0) {
      request.flash("error", "First Name can not be Empty");
      return response.redirect("/editProfile");
    }
    if (request.body.email.length === 0 && request.body.firstName.length != 0) {
      request.flash("error", "Email can not be Empty");
      return response.redirect("/editProfile");
    }
    if (
      request.body.email.length === 0 &&
      request.body.firstName.length === 0
    ) {
      request.flash("error", "First Name can not be Empty");
      request.flash("error", "Email can not be Empty");
      return response.redirect("/editProfile");
    }
    try {
      const updatedUser = {
        firstName: request.body.firstName,
        lastName: request.body.lastName,
        email: request.body.email,
      };

      const userId = request.user.id;

      await User.update(updatedUser, { where: { id: userId } });
      request.flash("success", "Profile edited successfully");
      response.redirect("/editProfile");
    } catch (error) {
      console.log(error);
      if (error.name == "SequelizeUniqueConstraintError") {
        const errMsg = error.errors.map((error) => error.message);
        console.log(errMsg);
        errMsg.forEach((message) => {
          if (message == "email must be unique") {
            request.flash("error", "Email already used");
          }
        });
        response.redirect("/editProfile");
      } else {
        console.log(error);
        // return response.status(422).json(error);
        request.flash("error", "Enter valid details");
        return response.redirect("/editProfile");
      }
    }
  }
);

module.exports = app;
