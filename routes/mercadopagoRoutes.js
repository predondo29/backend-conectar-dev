import express from 'express';
import { createPreference } from '../controllers/payment.controller.js';

const router = express.Router();

router.post('/create_preference', createPreference);

export default router;
