require('dotenv').config();
const express = require('express');
const axios = require('axios');
const connectDB = require('./db');
const Blog = require('./models/Blog');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// MongoDB কানেক্ট করা
connectDB();

// Google Gemini API কলের ফাংশন
const generateBlog = async (title, content, author) => {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        contents: [
          { role: 'user', parts: [{ text: `Write a detailed blog on: ${title}.\nDetails: ${content}.\nAuthor: ${author}` }] }
        ]
      }
    );

    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('❌ Error generating blog:', error.response?.data || error.message);
    return null;
  }
};

// Random Author ফেচ করার ফাংশন
const fetchAuthor = async () => {
  try {
    const response = await axios.get('https://randomuser.me/api/');
    const user = response.data.results[0];
    return `${user.name.first} ${user.name.last}`;
  } catch (error) {
    console.error("❌ Error fetching author:", error.message);
    return "Unknown Author";
  }
};

// ✅ নতুন ব্লগ তৈরি করার API
app.post('/posts/create', async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: 'Title এবং content আবশ্যক' });
  }

  const author = await fetchAuthor();
  const generatedContent = await generateBlog(title, content, author);

  if (!generatedContent) {
    return res.status(500).json({ message: 'Blog generation failed' });
  }

  try {
    const newPost = new Blog({
      title,
      content: generatedContent,
      author
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ message: 'Database error', error });
  }
});

// ✅ সব ব্লগ পোস্ট রিট্রিভ করার API
app.get('/posts', async (req, res) => {
  try {
    const posts = await Blog.find();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Database error', error });
  }
});

// ✅ নির্দিষ্ট ব্লগ পোস্ট রিট্রিভ করার API
app.get('/posts/:id', async (req, res) => {
  try {
    const post = await Blog.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'পোস্ট পাওয়া যায়নি' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Database error', error });
  }
});

// ✅ ব্লগ পোস্ট ডিলিট করার API
app.delete('/posts/:id', async (req, res) => {
  try {
    const post = await Blog.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: 'পোস্ট পাওয়া যায়নি' });
    res.json({ message: 'পোস্ট সফলভাবে ডিলিট করা হয়েছে' });
  } catch (error) {
    res.status(500).json({ message: 'Database error', error });
  }
});

// ✅ সার্ভার চালু করা
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
