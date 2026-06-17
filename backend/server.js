const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolio')
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Models
const Project = require('./models/Project');
const Contact = require('./models/Contact');

// Routes
// 1. Get all projects
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await Project.find();
        res.json(projects);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. Post a new contact message
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;
    try {
        const newContact = new Contact({ name, email, message });
        await newContact.save();
        res.status(201).json({ message: 'Message sent successfully' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Initial Setup/Seed
app.post('/api/seed', async (req, res) => {
    try {
        await Project.deleteMany({});
        const sampleProjects = [
            { title: 'Sceneproduction', description: 'Manager, dealing and producing content, and handling start-up business operations.', role: 'CEO', image: 'CEO Project' },
            { title: 'ICNA Institute Dallas', description: 'Freelance editor and account manager.', role: 'Editor', image: 'Editing Project' },
            { title: 'WDD', description: 'Content Creator and Editor.', role: 'Media Head', image: 'Media Project' },
            { title: 'B2 Production House', description: 'Shot and edited music videos and short films.', role: 'Cinematographer/Editor', image: 'Cinematography Project' }
        ];
        await Project.insertMany(sampleProjects);
        res.json({ message: 'Database seeded for Usama Javed CV!' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
