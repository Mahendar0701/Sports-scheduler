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
      });
      // define association here
    }

    static addSport({ title }) {
      return this.create({
        title: title,
      });
    }

    static getSports() {
      return this.findAll();
    }

    static async getSportTitle(id) {
      const sport = await this.findOne({ where: { id } });
      return sport.title;
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
      title: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Sport",
    }
  );
  return Sport;
};
