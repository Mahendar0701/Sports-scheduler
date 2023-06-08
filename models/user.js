/* eslint-disable no-unused-vars */
"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      User.belongsToMany(models.Session, {
        through: "UserSessions",
        foreignKey: "userId",
        otherKey: "sessionId",
      });
      // define association here
    }

    async hasJoinedSession(sessionId) {
      const userSessions = await this.getSessions({
        where: { id: sessionId },
      });
      return userSessions.length > 0;
    }
  }
  User.init(
    {
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      lastName: {
        type: DataTypes.STRING,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
        // unique: true,
      },
      isAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false, // Default value is false for non-admin users
      },
    },
    {
      sequelize,
      modelName: "User",
    }
  );
  return User;
};
