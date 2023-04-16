/* eslint-disable no-unused-vars */
const { request, response } = require('express');
const express = require('express');
const app = express();
const { Session, Sport } = require("./models")
const bodyParser = require("body-parser");
const path = require("path")

app.use(bodyParser.json());
app.set("view engine", "ejs");
// app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));


app.get('/', function (request, response) {
    response.render('index')
})

module.exports = app;