const database = require('../models');

class UserService {
    static async getAllUsers() {
        try {
            return await database.User.findAll();
        } catch (error) {
            throw error;
        }
    }

    static async addUser(newUser) {
        try {
            return await database.User.create(newUser);
        } catch (error) {
            throw error;
        }
    }

    static async updateUser(id, updateUser) {
        try {
            const UserToUpdate = await database.User.findOne({
                where: {
                    id: id
                }
            });

            if (UserToUpdate) {
                await database.User.update(updateUser, {
                    where: {
                        id: id
                    }
                });

                return updateUser;
            }
            return null;
        } catch (error) {
            throw error;
        }
    }

    static async getAUser(id) {
        try {
            const theUser = await database.User.findOne({
                where: {
                    id: id
                }
            });

            return theUser;
        } catch (error) {
            throw error;
        }
    }

    static async deleteUser(id) {
        try {
            const UserToDelete = await database.User.findOne({
                where: {
                    id: id
                }
            });

            if (UserToDelete) {
                const deletedUser = await database.User.destroy({
                    where: {
                        id: id
                    }
                });
                return deletedUser;
            }
            return null;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = UserService;