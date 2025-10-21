const categoryService = require('../services/categoryService');

const scrapeAndSave = async (req, res) => {
    try {
        console.log('Bắt đầu scrape categories...');
        const categories = await categoryService.scrapeCategories();

        const result = await categoryService.saveToDB(categories);

        res.status(200).json({
            success: true,
            message: `Đã lưu ${result.count} categories vào Firebase`
        });
    } catch (error) {
        console.error('Lỗi:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi scrape categories',
            error: error.message
        });
    }
};

const getAll = async (req, res) => {
    try {
        const categories = await categoryService.getAllCategories();

        res.status(200).json({
            success: true,
            count: categories.length,
            data: categories
        });
    } catch (error) {
        console.error('Lỗi:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi lấy categories',
            error: error.message
        });
    }
};

module.exports = {
    scrapeAndSave,
    getAll
};
