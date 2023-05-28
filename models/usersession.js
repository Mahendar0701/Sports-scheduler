"use strict";
const { Model, Op } = require("sequelize");
const {
  Session,
} = require("/home/mahendar07/sports-scheduler/models/session.js");
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
        // include: Session, // Include the Session model as an association
        // where: {
        //   '$Session.playDate$': {
        //     [Op.gt]: new Date(),
        //   },
        // },
      });

      return sessions;
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
