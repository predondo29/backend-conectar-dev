import express from 'express';
import { createPreference, receiveWebhook } from '../controllers/payment.controller.js';

const router = express.Router();

// Route for creating preference
router.post('/create_preference', createPreference);

// Route for receiving webhooks
router.post('/webhook', receiveWebhook);

export default router;
