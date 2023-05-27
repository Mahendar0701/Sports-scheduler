"use strict";
const { Model } = require("sequelize");
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
