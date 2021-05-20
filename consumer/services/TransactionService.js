const database = require('../models');

class TransactionService {
    static async getAllTransactions() {
        try {
            return await database.Transaction.findAll();
        } catch (error) {
            throw error;
        }
    }

    static async addTransaction(newTransaction) {
        try {
            // return Transfer.processTransfer(userId, element.UserId, element.amount);
            return await database.Transaction.create(newTransaction);
        } catch (error) {
            throw error;
        }
    }

    static async updateTransaction(id, updateTransaction) {
        try {
            const TransactionToUpdate = await database.Transaction.findOne({
                where: {
                    id: Number(id)
                }
            });

            if (TransactionToUpdate) {
                await database.Transaction.update(updateTransaction, {
                    where: {
                        id: Number(id)
                    }
                });

                return updateTransaction;
            }
            return null;
        } catch (error) {
            throw error;
        }
    }

    static async getATransaction(id) {
        try {
            const theTransaction = await database.Transaction.findOne({
                where: {
                    id: Number(id)
                }
            });

            return theTransaction;
        } catch (error) {
            throw error;
        }
    }

    static async deleteTransaction(id) {
        try {
            const TransactionToDelete = await database.Transaction.findOne({
                where: {
                    id: Number(id)
                }
            });

            if (TransactionToDelete) {
                const deletedTransaction = await database.Transaction.destroy({
                    where: {
                        id: Number(id)
                    }
                });
                return deletedTransaction;
            }
            return null;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = TransactionService;