import { Router } from 'express';
import * as articleController from '../controllers/article.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// GET /api/v1/articles?page=1&limit=20&topics=AI,Crypto
router.get('/', (req, res, next) => {
  void articleController.getArticlesFeed(req, res, next);
});

// GET /api/v1/articles/search?q=quantum+computing&topics=Science
router.get('/search', (req, res, next) => {
  void articleController.searchArticles(req, res, next);
});

// GET /api/v1/articles/:id
router.get('/:id', (req, res, next) => {
  void articleController.getArticle(req, res, next);
});

export default router;
