const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const lawyerCollegeSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  abbreviation: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  province: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  website: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create index for faster queries
lawyerCollegeSchema.index({ abbreviation: 1 });
lawyerCollegeSchema.index({ province: 1 });
lawyerCollegeSchema.index({ name: 'text' });

module.exports = mongoose.model('LawyerCollege', lawyerCollegeSchema);