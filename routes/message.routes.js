import express from 'express';
import { sendMessage, updateMessage, deleteMessage, getMessages, getSingleMessage, getUserMessages } from '../controllers/message.controller.js';
import { verifyToken } from '../middlewares/authMiddleware.js';


const router = express.Router();

router.post('/send-message', verifyToken, sendMessage);
router.get('/messages', verifyToken, getMessages);
router.get('/messages/:id', verifyToken, getSingleMessage);
router.get('/user-messages', verifyToken, getUserMessages);
router.put('/messages/:id', verifyToken, updateMessage);
router.delete('/messages/:id', verifyToken, deleteMessage);

export default router;