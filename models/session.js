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
      Session.belongsTo(models.Sport, {
        foreignKey: "sportId",
      });
      Session.belongsToMany(models.User, {
        through: "UserSessions",
        foreignKey: "sessionId",
        otherKey: "userId",
      });
      // define association here
    }

    static addSession({
      playDate,
      venue,
      playernames,
      playersneeded,
      sportId,
    }) {
      return this.create({
        playDate: playDate,
        venue: venue,
        playernames: playernames,
        playersneeded: playersneeded,
        sportId,
      });
    }

    static getSessions(sportId) {
      return this.findAll({
        where: { sportId },
      });
    }

    static getSportId() {
      return sportId;
    }

    static async remove(id) {
      return this.destroy({
        where: {
          id,
        },
      });
    }

    static async getSession(id) {
      return this.findOne({
        where: { id },
      });
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
