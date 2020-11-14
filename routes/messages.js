const express = require('express');
const ExpressError = require('../expressError');
const Message = require('../models/message');
const { ensureLoggedIn, ensureCorrectUser } = require('../middleware/auth');

const router = express.Router();

/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Make sure that the currently-logged-in users is either the to or from user.
 *
 **/
router.get('/:id', ensureLoggedIn, async (req, res, next) => {
    try {
        const { id: messageId } = req.params;
        const message = await Message.get(messageId);
        const { username } = req.user;
        const { from_user: { username: from }, to_user: { username: to } } = message;
        if (username === from || username === to)
            return res.json({ message });
        throw new ExpressError(`Message not from or to ${username}`, 401);
    } catch (e) {
        return next(e);
    }
});

/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/
router.post('/', ensureLoggedIn, async (req, res, next) => {
    try {
        const { username } = req.user;
        const { to_username, body } = req.body;
        if (!to_username) {
            throw new ExpressError('Must include recipient', 400);
        }
        if (!body) {
            throw new ExpressError('Must include message body', 400);
        }
        const message = await Message.create({
            from_username: username,
            to_username,
            body
        });
        return res.status(201).json({ message });
    } catch (e) {
        if (e.code === '23503')
            return next(new ExpressError('Recipient does not exist', 400));
        return next(e);
    }
});

/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Make sure that the only the intended recipient can mark as read.
 *
 **/
router.post('/:id/read', ensureLoggedIn, async (req, res, next) => {
    try {
        const { id: messageId } = req.params;
        const { to_user: { username: to }} = await Message.get(messageId);
        const { username } = req.user;
        if (username === to) {
            const message = await Message.markRead(messageId);
            return res.json({ message });
        }
        throw new ExpressError(`Message not to ${username}`, 401);
    } catch (e) {
        return next(e);
    }
});

module.exports = router;