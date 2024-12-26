import express from 'express'
import User from '../models/userModel.js'
import bcrypt from 'bcryptjs'
import nodemailer from 'nodemailer'

import { guestRoute, protectedRoute } from '../middleware/authMiddleware.js'

const router = express.Router()

// Looking to send emails in production? Check out our Email API/SMTP product!
const transport = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: "36e8f252bf8cae",
        pass: "9247ed22b8f177"
    }
});

//Route login page: GET=> http://localhost:3000/login
router.get('/login', guestRoute, (req, res) => {
    return res.render('login', { title: 'Login page', active: 'login' })
})

//Route Register page: GET=> http://localhost:3000/register
router.get('/register', guestRoute, function (req, res) {
    return res.render('register', { title: 'Register page',active:'register' })
})

//Route Forgot password page: GET=> http://localhost:3000/forgot-password
router.get('/forgot-password', guestRoute, function (req, res) {
    return res.render('forgot-password', { title: 'Forgot-password', active: 'forgot' })
})

//Route Reset page: GET=> http://localhost:3000/reset-password/crjx0kn4zqc
router.get('/reset-password/:token', guestRoute, async (req, res) => {
    const { token } = req.params
    const user = await User.findOne({ token })
    if (!user) {
        req.flash('error', 'Link expired or invalid, try again!')
        return res.redirect('/forgot-password')
    }

    return res.render('reset-password', { title: 'Reset password', active: 'reset', token })
})

//Route Register page: GET=> http://localhost:3000/profile
router.get('/profile', protectedRoute, (req, res) => {
    return res.render('profile', { title: 'Profile page', active: 'profile' })
})

//Route Register page: POST=> http://localhost:3000/register
router.post('/register', guestRoute, async (req, res) => {
    // console.log(req.body)
    const { name, email, password } = req.body
    try {
        const userExists = await User.findOne({ email })
        if (userExists) {
            req.flash('error', 'User already exists with this email')
            return res.redirect('/register')
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        const user = new User({
            name,
            email,
            password: hashedPassword,
        })
        user.save()
        req.flash('success', 'User registered successfully, You can login now!')
        return res.redirect('/login')
    } catch (error) {
        console.log(error)
        req.flash('error', 'Somethin went wrong, Try again!')
        return res.redirect('/login')
    }
})

//Route Login page: POST=> http://localhost:3000/login
router.post('/login', guestRoute, async (req, res) => {
    // console.log(req.body)
    const { email, password } = req.body
    try {
        const user = await User.findOne({ email: email })
        if (user && (bcrypt.compare(password, user.password))) {
            req.session.user = user
            return res.redirect('/profile')
        }
        else {
            req.flash('error', 'Invalid email or password')
            return res.redirect('/login')
        }
    } catch (error) {
        console.log(error)
        req.flash('error', 'Something went wrong, try again!')
        return req.redirect('/login')
    }
})

//Handle user logout
router.post('/logout', (req, res) => {
    req.session.destroy()
    return res.redirect('/login')
})

//Route handle Forgot password request: POST=> http://localhost:3000/forgot-password
router.post('/forgot-password', async function (req, res) {
    const { email } = req.body
    try {
        const user = await User.findOne({ email })
        if (!user) {
            req.flash('error', 'User not found with this email')
            return res.redirect('/forgot-password')
        }
        const token = Math.random().toString(36).slice(2)
        // console.log(token)
        user.token = token
        await user.save()

        // send mail with defined transport object
        const info = await transport.sendMail({
            from: '"Devchuchart 👻" <info@gmail.com>', // sender address
            to: email, // list of receivers
            subject: "Password reset", // Subject line
            text: "Reset your password!", // plain text body
            html: `<p>Click this link to reset your password:<a href='http://localhost:3000/reset-password/${token}'>Reset password</a><br>Thank you!.</p>`, // html body
        });

        if (info.messageId) {
            req.flash('success', 'Password reset link has been sent to your email,try again!')
            return res.redirect('/forgot-password')
        } else {
            req.flash('error', 'Error sending email,try again!')
            return res.redirect('/forgot-password')
        }

    } catch (error) {
        console.error(error)
        req.flash('error', 'Something went wrong,try again!')
        return res.redirect('/forgot-password')
    }

})

//Route handle reset password post request POST=> http://localhost:3000/reset-password
router.post('/reset-password', async (req, res) => {
    // console.log(req.body)
    const { token, new_password, confirm_new_password } = req.body
    try {
        const user = await User.findOne({ token })
        if (new_password !== confirm_new_password) {
            req.flash('error', 'Password do not match!')
            return res.redirect(`/reset-password/${token}`)
        }

        if (!user) {
            req.flash('error', 'Invalid token!')
            return res.redirect(`/forgot-password`)
        }

        user.password = await bcrypt.hash(new_password, 10)
        user.token = null
        await user.save()

        req.flash('success', 'Password reset successfully!')
        return res.redirect('/login')

    } catch (error) {
        console.error(error)
        req.flash('error', 'Something went wrong,try again!')
        return res.redirect('/reset-password')
    }
})

export default router