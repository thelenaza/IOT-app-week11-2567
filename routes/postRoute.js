import express from 'express'
import { protectedRoute } from '../middleware/authMiddleware.js'
import multer from 'multer'
import path from 'path'
import User from '../models/userModel.js'
import Post from '../models/postModel.js'
import { unlink } from 'fs'

const router = express.Router()

//set up storage engine using multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
})

//initialize upload variable with the storage engine
const upload = multer({ storage: storage })

//route for home page
router.get('/', async (req, res) => {

    const page = parseInt(req.query.page) || 1;
    const limit = 4;

    const startIndex = (page - 1) * limit
    const endIndex = page * limit

    const totalPosts = await Post.countDocuments().exec()

    const posts = await Post.find()
        .populate({ path: 'user', select: '-password' }) //Path:field user in post model and Select:not password
        .sort({ _id: -1 }) //descending order
        .limit(limit)
        .skip(startIndex)
        .exec()

    const pagination = {
        currentPage: page,
        totalPage: Math.ceil(totalPosts / limit),
        hasNextPage: endIndex < totalPosts,
        hasPrevPage: startIndex > 0,
        nextPage: page + 1,
        prevPage: page - 1
    }

    res.render('index', { title: 'Home Page', active: 'home', posts, pagination })
})

//route for posts page
router.get('/posts', protectedRoute, async (req, res) => {
    try {
        const userId = req.session.user._id
        const user = await User.findById(userId).populate('posts')

        if (!user) {
            req.flash('error', 'User not found, try again!')
            return req.redirect('/')
        }

        return res.render('posts/index', {
            title: 'Post Page',
            active: 'posts',
            posts: user.posts
        })

    } catch (error) {
        console.error(error)
        req.flash('error', 'An error occourred while fetching your posts, try again!')
        return req.redirect('/posts')
    }

})

//route for create new posts page
router.get('/create-post', protectedRoute, (req, res) => {
    return res.render('posts/create-post', { title: "Create post", active: 'create_post' })
})

//route for edit posts page
router.get('/edit-post/:id', protectedRoute, async (req, res) => {
    try {
        const postId = req.params.id
        const post = await Post.findById(postId)
        if (!post) {
            req.flash('error', 'Post not found,try again!')
            return req.redirect('/posts')
        }
        return res.render('posts/edit-post', { title: 'Edit Post', active: 'edit_post', post })

    } catch (error) {
        console.error(error)
        req.flash('error', 'Something went wrong, try again!')
        return req.redirect('/posts')
    }

})

//route for view posts page
router.get('/post/:slug', async (req, res) => {
    try {
        const slug = req.params.slug
        const post = await Post.findOne({ slug }).populate('user')

        if (!post) {
            req.flash('error', 'Post not found, try again!')
            return res.redirect('/my-posts')
        }

        return res.render('posts/view-post', { title: 'View Post', active: 'view_post', post })

    } catch (error) {
        console.error(error)
        req.flash('error', 'Post not found, try again!')
        return res.redirect('/posts')
    }

})

//handle create new post request
router.post('/create-post', protectedRoute, upload.single('image'), async function (req, res) {
    try {
        const { title, content } = req.body
        const image = req.file.filename
        const slug = title.replace(/\s+/g, '_').toLowerCase()

        const user = await User.findById(req.session.user._id)

        //create new post
        const post = new Post({ title, content, slug, image, user })

        //Save post in user posts object
        await User.updateOne({ _id: req.session.user._id }, { $push: { posts: post.id } })

        await post.save()
        req.flash('success', 'Post created successfully!')
        return res.redirect('/posts')

    } catch (error) {
        console.error(error)
        req.flash('error', 'Something went wrong, try again!')
        return req.redirect('/create-post')
    }
})

//handle update a post request
router.post('/update-post/:id', protectedRoute, upload.single('image'), async (req, res) => {
    try {
        const postId = req.params.id
        const post = await Post.findById(postId)

        if (!post) {
            req.flash('error', 'Post not found,try again!')
            return res.redirect('/posts')
        }

        post.title = req.body.title
        post.content = req.body.content
        post.slug = req.body.title.replace(/\s+/g, '_').toLowerCase()

        if (req.file) {
            unlink(path.join(process.cwd(), 'uploads') + '/' + post.image, (err) => {
                if (err) {
                    console.error(err)
                }
            })
            post.image = req.file.filename
        }
        await post.save()
        req.flash('success', 'Post updated successfully!')
        return res.redirect('/posts')

    } catch (error) {
        console.error(error)
        req.flash('error', 'Something went wrong, try again!')
        return res.redirect('/posts')
    }
})

//handle update a post request
router.post('/delete-post/:id', protectedRoute, async (req, res) => {
    try {
        const postId = req.params.id
        const post = await Post.findById(postId)

        if (!post) {
            req.flash('error', 'Post not found, try again!')
            return res.redirect('/posts')
        }

        await User.updateOne({ _id: req.session.user._id }, { $pull: { posts: postId } })
        await Post.deleteOne({ _id: postId })

        unlink(path.join(process.cwd(), 'uploads') + '/' + post.image, (err) => {
            if (err) {
                console.error(err)
            }
        })

        req.flash('success', 'Post deleted successfully!')
        return res.redirect('/posts')

    } catch (error) {
        console.error(error)
        req.flash('error', 'Something went wrong, try again!')
        return res.redirect('/posts')
    }
})

export default router