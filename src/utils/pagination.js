class Pagination {
  static async getPagination(page, size) {
    const limit = size;
    const offset = size * (page - 1);

    return { limit, offset };
  }

  static async getPagingData(details, page, limit) {
    const { count: totalItems, rows: data } = details;
    const currentPage = page ? +page : 0;
    const totalPages = Math.ceil(totalItems / limit);
    return {
      totalItems, data, totalPages: totalPages || 0, currentPage,
    };
  }
}
module.exports = Pagination;
