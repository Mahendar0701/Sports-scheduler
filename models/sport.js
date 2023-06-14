/* eslint-disable no-unused-vars */
"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Sport extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Sport.hasMany(models.Session, {
        foreignKey: "sportId",
        onDelete: "SET NULL",
      });
      // define association here
    }

    static addSport({ title }) {
      return this.create({
        title: title,
      });
    }

    static getAllSports() {
      return this.findAll();
    }

    static getSportsByAdmin(id) {
      return this.findAll({
        where: {
          userId: id,
        },
      });
    }

    static async getSport(id) {
      const sport = await this.findOne({ where: { id } });
      return sport;
    }

    static async getSportTitle(id) {
      const sport = await this.findOne({ where: { id } });
      return sport.title;
    }

    static async updateSportTitle(title, sportId) {
      return this.update(
        {
          title,
        },
        { where: { id: sportId } }
      );
    }

    static updateUserID(userId, sportId) {
      return this.update(
        {
          userId,
        },
        { where: { id: sportId } }
      );
    }

    static async remove(id) {
      return this.destroy({
        where: {
          id,
        },
      });
    }
  }
  Sport.init(
    {
      // title: DataTypes.STRING,
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
        unique: true,
      },
      userId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Sport",
    }
  );
  return Sport;
};
