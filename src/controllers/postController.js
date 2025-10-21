const postService = require('../services/postService');

const scrapeAndSaveOnePost = async (req, res) => {
    try {
        const { postUrl } = req.body;

        if (!postUrl) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp postUrl trong body request'
            });
        }

        console.log(`Đang scrape post: ${postUrl}`);
        
        const result = await postService.scrapeAndSaveOnePost(postUrl);

        if (result.saveResult.success) {
            res.status(200).json({
                success: true,
                message: 'Đã scrape và lưu post thành công',
            });
        } else {
            res.status(200).json({
                success: false,
                message: 'Post đã tồn tại trong database',
                data: {
                    postId: result.saveResult.postId,
                    post: result.post,
                    category: result.category
                }
            });
        }
    } catch (error) {
        console.error('Lỗi:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi scrape post',
            error: error.message
        });
    }
};

const getAll = async (req, res) => {
    try {
        const { categoryId } = req.query;
        
        let posts;
        if (categoryId) {
            posts = await postService.getAllPostsByCategory(categoryId);
        } else {
            posts = await postService.getAllPosts();
        }

        res.status(200).json({
            success: true,
            count: posts.length,
            data: posts
        });
    } catch (error) {
        console.error('Lỗi:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi lấy posts',
            error: error.message
        });
    }
};

const getPostsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu categoryId trong request'
            });
        }
        const posts = await postService.getAllPostsByCategory(categoryId);
        res.status(200).json({
            success: true,
            count: posts.length,
            data: posts
        });
    } catch (error) {
        console.error('Lỗi:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra khi lấy posts theo category',
            error: error.message
        });
    }
};


module.exports = {
    scrapeAndSaveOnePost,
    getAll,
    getPostsByCategory
};