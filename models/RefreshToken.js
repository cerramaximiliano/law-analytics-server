// models/RefreshToken.js
const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  revokedAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);