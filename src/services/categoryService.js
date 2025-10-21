const puppeteer = require('puppeteer');
const { db } = require('../config/firebase');

const scrapeCategories = async () => {
    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: false
    });

    try {
        const page = await browser.newPage();
        await page.goto(process.env.BASE_URL, { waitUntil: 'networkidle2' });

        const categories = await page.evaluate(() => {
            const items = [];
            const colA = document.querySelector('.NVcolA');
            const colB = document.querySelector('.NVcolB');
            const linksA = colA ? colA.querySelectorAll('a') : [];
            const linksB = colB ? colB.querySelectorAll('a') : [];
            const links = [...linksA, ...linksB];

            links.forEach((link) => {
                const href = link.getAttribute('href');
                const bTag = link.querySelector('b');
                let vnName = '';
                let count = '0';
                if (bTag) {
                    const bText = bTag.textContent.trim();
                    const match = bText.match(/^(.+?)\s*\((\d+)\)/);
                    if (match) {
                        vnName = match[1].replace(/\u00a0/g, ' ').trim();
                        count = match[2];
                    } else {
                        vnName = bText;
                    }
                }
                let enName = '';
                const br = link.querySelector('br');
                if (br && br.nextSibling) {
                    enName = br.nextSibling.textContent.trim();
                }

                items.push({
                    vnName,
                    enName,
                    count,
                    url: href
                });
            });
            return items;
        });

        return categories;
    } finally {
        await browser.close();
    }
};

const saveToDB = async (categories) => {
    const batch = db.batch();
    const categoriesRef = db.collection('categories');

    categories.forEach((category, index) => {
        const docRef = categoriesRef.doc(`category_${index + 1}`);
        batch.set(docRef, {
            ...category,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    });

    await batch.commit();
    return { success: true, count: categories.length };
};

const getAllCategories = async () => {
    const snapshot = await db.collection('categories').get();
    const categories = [];
    snapshot.forEach((doc) => {
        const { createdAt, updatedAt, ...rest } = doc.data();
        categories.push({
            id: doc.id,
            ...rest
        });
    });
    return categories;
};

module.exports = {
    scrapeCategories,
    saveToDB,
    getAllCategories
};
