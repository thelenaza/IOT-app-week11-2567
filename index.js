import express from 'express' // import module
import connectMongoDB from './config/db.js'
import authRoute from './routes/authRoute.js'
import postRoute from './routes/postRoute.js'

import cookieParser from 'cookie-parser'
import session from 'express-session'
import flash from 'connect-flash'
import path from 'path'

const app = express() // create app
const port = process.env.PORT || 8080

//Connected to MongoDb database
connectMongoDB()

//Middleware
app.use(express.json()) //แปลงข้อมูลที่มีรูปแบบ JSON String ให้อยู่ในรูป JSON Objext    
app.use(express.urlencoded({ extended: false })) // แปลงข้อมูลจาก form ในรูปแบบ url encode เป็น Object

//make uploads directory as static files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

//Cookie middleware
app.use(cookieParser(process.env.COOKIE_SECRET))

//session middleware
app.use(session({
    secret: process.env.SESSION_SECERT,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 60000 * 60 * 24 * 7 //1 week
    }
}))

//Flash message middleware
app.use(flash())

//store flash message for views
app.use(function (req, res, next) {
    res.locals.message = req.flash()
    next()
})

//Store authenticated user's session data for view
app.use((req, res, next) => {
    res.locals.user = req.session.user || null
    next()
})

//Set view/template engine:views
app.set('view engine', 'ejs')

//Home page
// app.get('/', (req, res) => {
//     return res.render('index', { title: 'Home Page', active: 'home' })
// })

app.use('/', authRoute) //auth Router
app.use('/', postRoute) //post Router

app.listen(port, () => {
    console.log(`SERVER is running on http://localhost:${port}`)
})