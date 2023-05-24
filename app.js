/* eslint-disable no-unused-vars */
const { request, response } = require("express");
const express = require("express");
const app = express();
const { Session, Sport, User, UserSession } = require("./models");
const bodyParser = require("body-parser");
const path = require("path");
// const session = require("./models/session");

app.use(bodyParser.json());
app.set("view engine", "ejs");
// app.set("views", path.join(__dirname, "views"));

const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
// const flash = require("connect-flash");
const localStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const config = require("./adminconfig");

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));

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
  });
});

app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "Signup",
  });
});

app.post("/users", async (request, response) => {
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  console.log(hashedPwd);
  try {
    const user = await User.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPwd,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
      }

      response.redirect("/sport");
    });
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
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
  response.render("login", { title: "Login" });
});

app.post(
  "/signin",
  passport.authenticate("local", {
    failureRedirect: "/login",
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
      console.group(loggedInUser);
      const allSports = await Sport.getSports();
      // Get the logged-in user
      const user = request.user;
      let isAdmin = false;
      if (
        user.email === config.adminCredentials.email
        // &&
        // request.body.password === config.adminCredentials.password
      ) {
        isAdmin = true;
      }
      const allSessions = await user.getSessions();

      if (request.accepts("html")) {
        response.render("sport", {
          loggedInUser: request.user,
          title: "Sports Application",
          allSports,
          allSessions,
          isAdmin,
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

// app.get(
//   "/sport",
//   connectEnsureLogin.ensureLoggedIn(),
//   async (request, response) => {
//     try {
//       const loggedInUser = request.user; // Get the logged-in user
//       const allSports = await Sport.getSports();
//       const allSessions = await loggedInUser.getSessions();

//       if (loggedInUser.isAdmin) {
//         // Check if the user is an admin
//         response.render("sport", {
//           loggedInUser,
//           title: "Sports Application",
//           allSports,
//           allSessions,
//           isAdmin: true, // Pass isAdmin flag to the template
//         });
//       } else {
//         response.render("sport", {
//           loggedInUser,
//           title: "Sports Application",
//           allSports,
//           allSessions,
//           isAdmin: false, // Pass isAdmin flag to the template
//         });
//       }
//     } catch (error) {
//       console.log(error);
//       return response.status(422).json(error);
//     }
//   }
// );

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
      return response.status(422).json(error);
    }
  }
);

app.get("/createSport", (request, response, next) => {
  response.render("createSport");
});

app.post(
  "/sessions",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
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
    let isAdmin = false;
    if (
      user.email === config.adminCredentials.email
      // &&
      // request.body.password === config.adminCredentials.password
    ) {
      isAdmin = true;
    }

    const allSessions = await Session.getSessions(request.params.id);
    response.render("session", {
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
    console.log("iddd", sportId);
    response.render("createSession", {
      sportId,
    });
  }
);

app.get(
  "/sessions/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response, next) => {
    console.log("paramsid...", request.params);
    console.log("userId: ", request.user.id);
    const userName = request.user.lastName;
    const userId = request.user.id;
    const sessionId = request.params.id;
    const session = await Session.getSession(sessionId);
    console.log(session.playersneeded);
    const sportId = session.sportId;
    const user = await User.findByPk(userId);
    // const hasSession = await user.hasSession(sessionId);
    // const joined = await user.hasSession(session);
    // const joined = await session.hasUser(userId);
    console.log("paramsid...", sportId);
    const title = await Sport.getSportTitle(sportId);

    //isAdmin
    const users = request.user;
    let isAdmin = false;
    if (
      users.email === config.adminCredentials.email
      // &&
      // request.body.password === config.adminCredentials.password
    ) {
      isAdmin = true;
    }
    response.render("dispSession", {
      userName,
      userId,
      sessionId,
      session,
      title,
      sportId,
      // joined,
      isAdmin,
    });
  }
);

/////do it
app.post(
  "/sessions/:id/join",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const sessionId = request.params.id;
      const session = await Session.getSession(sessionId);
      const user = request.user;

      await session.addUser(user);

      const userName = request.user.lastName;
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

      const userName = request.user.lastName;

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

app.post(
  "/sessions/:id/removePlayer/:playerName",
  async function (request, response) {
    try {
      const sessionId = request.params.id;
      console.log("Deleting session with ID", sessionId);
      const session = await Session.getSession(sessionId);
      const sportId = session.sportId;
      let playernames = session.playernames;

      // Retrieve the player name from the URL parameter
      const playerNameToRemove = request.params.playerName;

      // Remove the player's name
      playernames = playernames.filter((name) => name !== playerNameToRemove);

      // Update the session with the modified player names
      session.playernames = playernames;

      session.playersneeded = session.playersneeded + 1;

      await Session.update(
        { playernames: session.playernames },
        { where: { id: sessionId } }
      );

      await Session.update(
        { playernames: session.playernames },
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

module.exports = app;
