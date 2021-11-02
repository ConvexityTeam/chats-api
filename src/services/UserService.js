const {
    User,
    Campaign,
    BankAccount
} = require('../models');
const {
    Op,
    Sequelize
} = require('sequelize');
const {
    AclRoles
} = require('../utils');
const {
    userConst
} = require('../constants');

class UserService {
    static async getAllUsers() {
        try {
            return await User.findAll();
        } catch (error) {
            throw error;
        }
    }

    static async addUser(newUser) {
        return User.create(newUser);
    }

    static async updateUser(id, updateUser) {
        try {
            const UserToUpdate = await User.findOne({
                where: {
                    id: id
                }
            });

            if (UserToUpdate) {
                await User.update(updateUser, {
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
            const theUser = await User.findOne({
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
            const UserToDelete = await User.findOne({
                where: {
                    id: id
                }
            });

            if (UserToDelete) {
                const deletedUser = await User.destroy({
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


    // Refactored ==============

    static findByEmail(email, extraClause = null) {
        return User.findOne({
            where: {
                email,
                ...extraClause
            }
        })
    }

    static findByPhone(phone, extraClause = null) {
        return User.findOne({
            where: {
                phone,
                ...extraClause
            }
        })
    }

    static findSingleUser(where) {
        return User.findOne({
            where
        });
    }

    static findBeneficiary(id, OrganisationId = null) {
        return User.findOne({
            where: {
                id,
                RoleId: AclRoles.Beneficiary

                // ...(OrganisationId && {
                //     OrganisationId: Sequelize.where(Sequelize.col('Campaigns.OrganisationId'), OrganisationId)
                // }
                // )
            },
            attributes: userConst.publicAttr
        });
    }

    static update(id, data) {
        return User.update(data, {
            where: {
                id
            }
        });
    }

    static addUserAccount(UserId, data) {
        return BankAccount.create({
            ...data,
            UserId
        }, {
            include: ['AccountHolder']
        });
    }

    static findUserAccounts(UserId) {
        return BankAccount.findAll({
            where: {UserId},
            include: {
                model: User,
                as: "AccountHolder",
                attributes: ['first_name', 'last_name', 'phone', 'dob']
            }
        })
    }
}

module.exports = UserService;