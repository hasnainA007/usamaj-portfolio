const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    role: { type: String },
    image: { type: String },
    link: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
