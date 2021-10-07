const {
    Sequelize,
    Op
} = require('sequelize');
const {
    userConst
} = require('../constants');
const {
    User,
    Store,
    Order,
    Market,
    Product,
    OrderProduct
} = require('../models');
const {
    AclRoles
} = require('../utils');

class VendorService {
    static searchVendorStore(store_name, extraClause = null) {
        const where = {
            ...extraClause,
            store_name: Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('store_name')), 'LIKE', `%${store_name.toLowerCase()}%`)
        };

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
            where: {
                id,
                RoleId
            },
            include: ['Store', 'Wallets', 'AssociatedOrganisations', 'Accounts']
        });
    }

    static async getVendor(id, extraClause = null) {
        return User.findOne({
            where: {
                ...extraClause,
                id,
                RoleId: AclRoles.Vendor
            }
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

    // Refactor

    static async vendorStoreProducts(vendorId) {
        return Product.findAll({
            include: [{
                model: Market,
                as: 'Store',
                attributes: [],
                where: {
                    UserId: vendorId
                }
            }]
        })
    }

    static async createOrder(order, Cart) {
        return Order.create({
            ...order,
            Cart
        }, {
            include: [{
                model: OrderProduct,
                as: 'Cart'
            }]
        });
    }

    static async getOrder(id, extraClause = null) {
        return Order.findOne({
            where: {
                ...extraClause,
                id
            },
            include: [{
                    model: User,
                    as: 'Vendor',
                    attributes: userConst.publicAttr,
                    include: ['Store']
                },
                {
                    model: OrderProduct,
                    as: 'Cart',
                    include: ['Product']
                }
            ],
        });
    }

    static async findVendorOrders(VendorId, extraClause = null) {
        return Order.findAll({
            where: {
                ...extraClause,
                VendorId
            },
            include: [{
                    model: User,
                    as: 'Vendor',
                    attributes: userConst.publicAttr,
                    include: ['Store']
                },
                {
                    model: OrderProduct,
                    as: 'Cart',
                    include: ['Product']
                }
            ],
            order: [
                ['id', 'DESC']
            ]
        });
    }

}

module.exports = VendorService;