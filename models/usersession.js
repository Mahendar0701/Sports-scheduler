"use strict";
const { Model, Op } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class UserSession extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      UserSession.belongsTo(models.User, {
        foreignKey: "userId",
      });
      UserSession.belongsTo(models.Session, {
        foreignKey: "sessionId",
      });
      // define association here
    }

    static async isUserJoined(userId, sessionId) {
      const userSession = await this.findOne({
        where: {
          userId: userId,
          sessionId: sessionId,
        },
      });
      return userSession !== null;
    }

    static async getUpcomingSessionsByUser(userId) {
      const sessions = await UserSession.findAll({
        where: {
          userId,
        },
      });
      return sessions;
    }

    static async getSessionsByUser(userId) {
      const sessions = await UserSession.findAll({
        where: {
          userId,
        },
      });
      return sessions;
    }

    static async getSessionPlayers(sessionId) {
      const sessions = await UserSession.findAll({
        where: {
          sessionId,
        },
      });
      return sessions;
    }

    static async addCreator(userId, sessionId) {
      return this.create({
        userId,
        sessionId,
      });
    }

    static async addPlayer(userId, sessionId) {
      return this.create({
        userId,
        sessionId,
      });
    }

    static async removePlayer(userId, sessionId) {
      return this.destroy({
        where: {
          userId,
          sessionId,
        },
      });
    }
  }
  UserSession.init(
    {
      userId: DataTypes.INTEGER,
      sessionId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "UserSession",
    }
  );
  return UserSession;
};
