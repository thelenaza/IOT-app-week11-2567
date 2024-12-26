//Protect routes middleware function
export const protectedRoute = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login')
    }
    next()
}

//Guest routes middleware function
export const guestRoute = (req, res, next) => {
    if (req.session.user) {
        return res.redirect('/profile')
    }
    next()
}
