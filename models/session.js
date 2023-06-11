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
      return this.findAll({
        where: {
          sportId,
          playDate: {
            [Op.lt]: new Date(),
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
      var playDate = new Date().getTime() + 5 * 60 * 60 * 1000 + 30 * 60 * 1000;
      playDate = new Date(playDate).toISOString().slice(0, 16);
      return this.findAll({
        where: {
          sportId,
          playDate: {
            [Op.lt]: playDate,
          },
        },
      });
    }

    static upcomingSessions(sportId) {
      return this.findAll({
        where: {
          sportId,
          playDate: {
            [Op.gt]: new Date(),
          },
          isCanceled: false,
        },
      });
    }

    static getCreatedUpcomingSessions(creatorId) {
      return this.findAll({
        where: {
          playDate: {
            [Op.gt]: new Date(),
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
      return this.findOne({
        where: {
          id,
          playDate: {
            [Op.gt]: new Date(),
          },
        },
      });
    }

    static async getActiveUpcomingSession(id) {
      return this.findOne({
        where: {
          id,
          playDate: {
            [Op.gt]: new Date(),
          },
          isCanceled: false,
        },
      });
    }

    static async getPreviousSession(id) {
      return this.findOne({
        where: {
          id,
          playDate: {
            [Op.lt]: new Date(),
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
