const express = require('express');
const ExpressError = require('../expressError');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config');

const router = express.Router();

/** POST /login - login: {username, password} => {token}
 *
 * Make sure to update their last-login!
 *
 **/
router.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!await User.authenticate(username, password))
            return next(new ExpressError('Invalid credentials', 400));
    
        const token = jwt.sign({ username: username }, SECRET_KEY);
        User.updateLoginTimestamp(username);
        return res.json({ token, message: 'Successfully registered' });
    } catch (e) {
        return next(new ExpressError('Username and password required', 400));
    }
});



/** POST /register - register user: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 *
 *  Make sure to update their last-login!
 */
router.post('/register', async (req, res, next) => {
    try {
        const user = req.body;
        await User.register(user);

        const token = jwt.sign({ username: user.username }, SECRET_KEY);
        return res.json({ token, message: 'Successfully registered' });
    } catch (e) {
        if (e.code === '23505')
            return next(new ExpressError('Username taken', 400));
        return next(new ExpressError('All fields required', 400));
    }
});

module.exports = router;