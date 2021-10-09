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
    Wallet,
    Product,
    OrderProduct,
    Organisations,
    StoreTransaction,
    OrganisationMembers
} = require('../models');

const {
    OrgRoles,
    AclRoles,
    GenearteVendorId
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

    static async vendorPublicDetails(id, extraClause = null) {
        const {OrganisationId, ...filter } = extraClause;
        return User.findOne({
            where: {
                ...filter,
                id,
                RoleId: AclRoles.Vendor
            },
            attributes: userConst.publicAttr,
            include: [
                {
                    model: Organisations,
                    as: 'Organisations',
                    through: {
                        attributes: []
                    },
                    where: {
                        ...(OrganisationId && {id: OrganisationId})
                    }
                },
                {
                    model: Market,
                    as: 'Store',
                    include: ['Products']
                },
                // {
                //     model: Wallet,
                //     as: "Wallets",
                //     include: [
                //         "ReceivedTransactions",
                //         "SentTransactions"
                //     ]
                // },
                // 'StoreTransactions'
            ]
        })
    }

    static async dailyVendorStats(VendorId, date = new Date) {
        const START = date.setHours(0, 0, 0, 0);
        const END = date.setHours(23, 59, 59);

        return User.findOne({
            where: {
                id: VendorId,
                RoleId: AclRoles.Vendor
            },
            attributes: {
                exclude: Object.keys(User.rawAttributes),
                include: [
                    [Sequelize.fn('SUM', Sequelize.col('StoreTransactions.Order.Cart.total_amount')), 'transactions_value'],
                    [Sequelize.fn('COUNT', Sequelize.col("StoreTransactions.id")), "transactions_count"],
                    [Sequelize.fn('COUNT', Sequelize.col("StoreTransactions.Order.Products.id")), "products_count"],
                ]
            },
            include: [{
                attributes: [],
                model: StoreTransaction,
                as: 'StoreTransactions',
                where: {
                    createdAt: {
                        [Op.gt]: START,
                        [Op.lt]: END
                    }
                },
                include: [{
                    model: Order,
                    as: 'Order',
                    attributes: [],
                    where: {
                        status: {
                            [Op.in]: ['confirmed', 'delivered']
                        }
                    },
                    include: [{
                            attributes: [],
                            model: Product,
                            as: 'Products',
                            through: {
                                attributes: []
                            }
                        },
                        {
                            model: OrderProduct,
                            as: 'Cart',
                            attributes: []
                        }
                    ]
                }]
            }]
        });
    }

    static async organisationVendors({
        id: OrganisationId
    }) {
        const vendorIds = (await OrganisationMembers.findAll({
            where: {
                OrganisationId,
                role: OrgRoles.Vendor
            }
        })).map(m => m.UserId);
        return User.findAll({
            where: {
                id: {
                    [Op.in]: [...vendorIds]
                }
            },
            include: ['Wallet', 'Store']
        })
    }

    static async organisationDailyVendorStat(OrganisationId, date = new Date) {
        const START = date.setHours(0, 0, 0, 0);
        const END = date.setHours(23, 59, 59);
        return Organisations.findOne({
            where: {
                id: OrganisationId
            },
            attributes: {
                exclude: Object.keys(Organisations.rawAttributes),
                include: [
                    [Sequelize.fn('SUM', Sequelize.col('Vendors.StoreTransactions.Order.Cart.total_amount')), 'transactions_value'],
                    [Sequelize.fn('COUNT', Sequelize.col("Vendors.StoreTransactions.id")), "transactions_count"],
                    [Sequelize.fn('COUNT', Sequelize.col("Vendors.StoreTransactions.Order.Products.id")), "products_count"],
                    [Sequelize.fn('COUNT', Sequelize.col("Vendors.id")), "vendors_count"]
                ]
            },
            include: [{
                model: User,
                as: 'Vendors',
                attributes: [],
                include: [{
                    attributes: [],
                    model: StoreTransaction,
                    as: 'StoreTransactions',
                    where: {
                        createdAt: {
                            [Op.gt]: START,
                            [Op.lt]: END
                        }
                    },
                    include: [{
                        model: Order,
                        as: 'Order',
                        attributes: [],
                        where: {
                            status: {
                                [Op.in]: ['confirmed', 'delivered']
                            }
                        },
                        include: [{
                                attributes: [],
                                model: Product,
                                as: 'Products',
                                through: {
                                    attributes: []
                                }
                            },
                            {
                                model: OrderProduct,
                                as: 'Cart',
                                attributes: []
                            }
                        ]
                    }]
                }]
            }],
            group: [
                'Organisations.id',
                'Vendors.OrganisationMembers.UserId',
                'Vendors.OrganisationMembers.OrganisationId',
                'Vendors.OrganisationMembers.role',
                'Vendors.OrganisationMembers.createdAt',
                'Vendors.OrganisationMembers.updatedAt',
            ]
        })
    }

    static async organisationIdVendorsTransactions(OrganisationId, filter = null) {
        return StoreTransaction.findAll({
            where: {
                ...filter
            },
            include: [{
                model: User,
                as: 'Vendor',
                attributes: userConst.publicAttr,
                include: [
                    'Store',
                    {
                        model: Organisations,
                        as: 'Organisations',
                        attributes: [],
                        where: {
                            id: OrganisationId
                        },
                        through: {
                            attributes: []
                        }
                    }
                ]
            }]
        })
    }

}

module.exports = VendorService;