const puppeteer = require('puppeteer');
const { db } = require('../config/firebase');

const scrapePostDetails = async (postUrl) => {
    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: false
    });

    try {
        const page = await browser.newPage();
        const fullUrl = `${process.env.BASE_URL}${postUrl}`;
        await page.goto(fullUrl, { waitUntil: 'networkidle2' });

        const postDetails = await page.evaluate(() => {
            const idElement = document.querySelector('#ctl01_PageContent_Label_ListingID');
            const refOrderElement = document.querySelector('#ctl01_PageContent_Label_RefOrderID');
            
            const id = idElement ? idElement.textContent.replace('ID#', '').trim() : '';
            const refOrderId = refOrderElement ? refOrderElement.textContent.replace('Ref Order#', '').trim() : '';

            const titleElement = document.querySelector('#ctl01_PageContent_Label_Title');
            const title = titleElement ? titleElement.textContent.trim() : '';

            const descriptionElement = document.querySelector('#ctl01_PageContent_TabC_Tab_Description');
            let description = '';
            if (descriptionElement) {
                description = descriptionElement.textContent.trim();
            }

           const categoryElement = document.querySelector('#ctl01_PageContent_Category a');
            const categoryName = categoryElement ? categoryElement.textContent.trim() : '';
            let categoryUrl = '';
            if (categoryElement) {
                const href = categoryElement.getAttribute('href');
                categoryUrl = href.startsWith('/') ? href.substring(1) : href;
                if (!categoryUrl.startsWith('classified/')) {
                    categoryUrl = `classified/${categoryUrl}`;
                }
            }

            const phoneRegex = /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})|(\(\d{3}\)\s?\d{3}[-.\s]?\d{4})/g;
            const phoneMatches = description.match(phoneRegex);
            const phone = phoneMatches ? phoneMatches.join(', ') : '';

            return {
                id,
                refOrderId,
                title,
                description,
                phone,
                categoryName,
                categoryUrl
            };
        });

        return postDetails;
    } catch (error) {
        console.error(`Error scraping post details from ${postUrl}:`, error);
        return null;
    } finally {
        await browser.close();
    }
};

const findCategoryByUrl = async (categoryUrl) => {
    const categoriesSnapshot = await db.collection('categories').get();
    
    const normalizedSearchUrl = categoryUrl.replace(/^\/classified\//, '').replace(/^\//, '');
    
    for (const doc of categoriesSnapshot.docs) {
        const category = doc.data();
        const normalizedDbUrl = category.url.replace(/^\/classified\//, '').replace(/^\//, '');
        
        if (normalizedDbUrl === normalizedSearchUrl) {
            return {
                id: doc.id,
                ...category
            };
        }
    }
    
    return null;
};

const savePostToDB = async (post, categoryId) => {
    // Lưu vào collection posts chính, không phải subcollection
    const postsRef = db.collection('posts');
    
    const snapshot = await postsRef
        .where('id', '==', post.id)
        .limit(1)
        .get();

    if (!snapshot.empty) {
        return { 
            success: false, 
            message: 'Post already exists',
            postId: snapshot.docs[0].id
        };
    }

    const docRef = postsRef.doc();
    await docRef.set({
        id: post.id,
        refOrderId: post.refOrderId,
        title: post.title,
        description: post.description,
        phone: post.phone,
        categoryId: categoryId, // Lưu categoryId để reference
        createdAt: new Date(),
        updatedAt: new Date()
    });

    return { success: true, postId: docRef.id };
};

const scrapeAndSaveOnePost = async (postUrl) => {
    console.log(`Scraping post from: ${postUrl}`);
    
    const postDetails = await scrapePostDetails(postUrl);
    
    if (!postDetails || !postDetails.id) {
        throw new Error('Không thể scrape được thông tin post');
    }

    console.log(`Post ID: ${postDetails.id}`);
    console.log(`Category URL from page: ${postDetails.categoryUrl}`);

    const category = await findCategoryByUrl(postDetails.categoryUrl);
    
    if (!category) {
        console.error(`Available categories in database:`);
        const allCategories = await db.collection('categories').get();
        allCategories.forEach(doc => {
            console.log(`  - ${doc.id}: ${doc.data().url}`);
        });
        throw new Error(`Không tìm thấy category với URL: ${postDetails.categoryUrl}`);
    }

    console.log(`Found category: ${category.vnName} (${category.id})`);

    const saveResult = await savePostToDB(postDetails, category.id);
    
    return {
        post: postDetails,
        category: {
            id: category.id,
            name: category.vnName
        },
        saveResult
    };
};

const getAllPostsByCategory = async (categoryId) => {
    const postsRef = db.collection('posts');
    const snapshot = await postsRef
        .where('categoryId', '==', categoryId)
        .orderBy('createdAt', 'desc')
        .get();
    const posts = [];
    
    snapshot.forEach((doc) => {
        const { createdAt, updatedAt, ...rest } = doc.data();
        posts.push({
            postId: doc.id,
            ...rest
        });
    });
    
    return posts;
};

const getAllPosts = async () => {
    const postsRef = db.collection('posts');
    const snapshot = await postsRef.orderBy('createdAt', 'desc').get();
    const allPosts = [];

    snapshot.forEach((doc) => {
        const { createdAt, updatedAt, ...rest } = doc.data();
        allPosts.push({
            postId: doc.id,
            ...rest
        });
    });
    
    return allPosts;
};

module.exports = {
    scrapeAndSaveOnePost,
    getAllPostsByCategory,
    getAllPosts
};