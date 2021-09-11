const {
    Sequelize,
    Op
} = require('sequelize');
const {
    User,
    Market
} = require('../models');
const { AclRoles } = require('../utils');

class VendorServices {
    static searchVendorStore(store_name, extraClause = null) {
        const where = Sequelize.where(Sequelize.fn('lower', Sequelize.col('store_name')), {
            [Op.like]: `${store_name}`,
        });

        return Market.findOne({
            where
        });
    }

    static async getAllVendors() {
        return User.findAll({
            where: {
                RoleId: 4
            }
        });
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

    static async getAVendor(id) {
        const RoleId = AclRoles.Vendor;
        return User.findOne({
            where: { id, RoleId },
            include: ['Store', 'Wallets', 'AssociatedOrganisations', 'Accounts']
        });
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


}

module.exports = VendorServices;