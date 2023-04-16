/* eslint-disable no-unused-vars */
"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Session extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }

    static addSession({ playDate, venue, playernames, playersneeded }) {
      return this.create({
        playDate: playDate,
        venue: venue,
        playernames: playernames,
        playersneeded: playersneeded,
      });
    }

    static getSessions() {
      return this.findAll();
    }
  }
  Session.init(
    {
      playDate: DataTypes.DATE,
      venue: DataTypes.STRING,
      playernames: DataTypes.ARRAY(DataTypes.STRING),
      playersneeded: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Session",
    }
  );
  return Session;
};
