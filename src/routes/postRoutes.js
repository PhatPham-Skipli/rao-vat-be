const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');

router.post('/scrape', postController.scrapeAndSaveOnePost);
router.get('/', postController.getAll);
router.get('/:categoryId', postController.getPostsByCategory);

module.exports = router;