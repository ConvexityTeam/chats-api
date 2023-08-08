class Pagination {
  static getPagination = (page, size) => {
    const limit = size ? +size : 3;
    const offset = page ? page * limit : 0;

    return {limit, offset};
  };
  static getPagingData = (details, page, limit) => {
    const {count: totalItems, rows: data} = details;
    const currentPage = page ? +page : 0;
    const totalPages = Math.ceil(totalItems / limit);

    return {totalItems, data, totalPages, currentPage};
  };
}
module.exports = Pagination;
