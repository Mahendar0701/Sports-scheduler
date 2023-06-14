/* eslint-disable no-unused-vars */
"use strict";
const { Model, Op } = require("sequelize");
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

    static updatePlayers(playernames, playersneeded, sessionId) {
      return this.update(
        {
          playernames,
          playersneeded,
        },
        { where: { id: sessionId } }
      );
    }

    static updateCancellation(reason, sessionId) {
      return this.update(
        {
          reason,
          isCanceled: true,
        },
        { where: { id: sessionId } }
      );
    }

    static updateCreatorId(CreatorId, sessionId) {
      return this.update(
        {
          CreatorId,
        },
        { where: { id: sessionId } }
      );
    }

    static updateSessionDetails(
      playDate,
      playernames,
      playersneeded,
      venue,
      sessionId
    ) {
      return this.update(
        {
          playDate,
          playernames,
          playersneeded,
          venue,
        },
        { where: { id: sessionId } }
      );
    }

    static prevSessions(sportId) {
      const currentDateTime = new Date();
      currentDateTime.setHours(currentDateTime.getHours() + 5);
      currentDateTime.setMinutes(currentDateTime.getMinutes() + 30);
      return this.findAll({
        where: {
          sportId,
          playDate: {
            // [Op.lt]: new Date(),
            [Op.lt]: currentDateTime,
          },
          isCanceled: false,
        },
      });
    }

    static getAllUnCancelled(sportId) {
      return this.findAll({
        where: {
          sportId,
          isCanceled: false,
        },
      });
    }

    static prevAndCanceledSessions(sportId) {
      const currentDateTime = new Date();
      currentDateTime.setHours(currentDateTime.getHours() + 5);
      currentDateTime.setMinutes(currentDateTime.getMinutes() + 30);
      return this.findAll({
        where: {
          sportId,
          playDate: {
            [Op.lt]: currentDateTime,
            // [Op.lt]: new Date(),
          },
        },
      });
    }

    static upcomingSessions(sportId) {
      const currentDateTime = new Date();
      currentDateTime.setHours(currentDateTime.getHours() + 5);
      currentDateTime.setMinutes(currentDateTime.getMinutes() + 30);
      return this.findAll({
        where: {
          sportId,
          playDate: {
            [Op.gt]: new Date(),
            [Op.gt]: currentDateTime,
          },
          isCanceled: false,
        },
      });
    }

    static getCreatedUpcomingSessions(creatorId) {
      const currentDateTime = new Date();
      currentDateTime.setHours(currentDateTime.getHours() + 5);
      currentDateTime.setMinutes(currentDateTime.getMinutes() + 30);
      return this.findAll({
        where: {
          playDate: {
            [Op.gt]: currentDateTime,
            // [Op.gt]: new Date(),
          },
          CreatorId: creatorId,
        },
      });
    }

    static getAllCreatedSessions(creatorId) {
      return this.findAll({
        where: {
          CreatorId: creatorId,
        },
      });
    }

    static getAllSessionsInPeriod(sportId, startDate, endDate) {
      return this.findAll({
        where: {
          sportId: sportId,
          playDate: {
            [Op.between]: [startDate, endDate],
          },
          isCanceled: false,
        },
      });
    }

    static getCancelledInPeriod(sportId, startDate, endDate) {
      return this.findAll({
        where: {
          sportId: sportId,
          playDate: {
            [Op.between]: [startDate, endDate],
          },
          isCanceled: true,
        },
      });
    }

    static canceledSessions(sportId) {
      return this.findAll({
        where: {
          sportId,
          isCanceled: true,
        },
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

    static async getUserUpcomingSession(id) {
      const currentDateTime = new Date();
      currentDateTime.setHours(currentDateTime.getHours() + 5);
      currentDateTime.setMinutes(currentDateTime.getMinutes() + 30);
      return this.findOne({
        where: {
          playDate: {
            [Op.gt]: currentDateTime,
            // [Op.gt]: new Date(),
          },
          id,
        },
      });
    }

    static async getActiveUpcomingSession(id) {
      const currentDateTime = new Date();
      currentDateTime.setHours(currentDateTime.getHours() + 5);
      currentDateTime.setMinutes(currentDateTime.getMinutes() + 30);
      return this.findOne({
        where: {
          id,
          playDate: {
            // [Op.gt]: new Date(),
            [Op.gt]: currentDateTime,
          },
          isCanceled: false,
        },
      });
    }

    static async getPreviousSession(id) {
      const currentDateTime = new Date();
      currentDateTime.setHours(currentDateTime.getHours() + 5);
      currentDateTime.setMinutes(currentDateTime.getMinutes() + 30);
      return this.findOne({
        where: {
          id,
          playDate: {
            [Op.lt]: currentDateTime,
          },
        },
      });
    }

    static async getCancelSession(id) {
      return this.findOne({
        where: {
          id,
          isCanceled: true,
        },
      });
    }

    static async getSessionWithDtId(id, playDate) {
      return this.findOne({
        where: {
          id,
          playDate,
          isCanceled: false,
        },
      });
    }
  }
  Session.init(
    {
      playDate: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      venue: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      playernames: DataTypes.ARRAY(DataTypes.STRING),
      playersneeded: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      isCanceled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      CreatorId: DataTypes.INTEGER,
      reason: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Session",
    }
  );
  return Session;
};
