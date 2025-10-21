const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

router.post('/scrape', categoryController.scrapeAndSave);
router.get('/', categoryController.getAll);

module.exports = router;