import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password']
  },
  role: {
    type: String,
    enum: ['Voter', 'Admin'],
    default: 'Voter'
  },
  isVerified: {
    type: Boolean,
    default: false // Can be used later for email OTP verification
  },
  hasVoted: {
    type: Boolean,
    default: false // Critical flag to prevent double voting
  }
}, {
  timestamps: true // Automatically creates createdAt and updatedAt fields
});

const User = mongoose.model('User', userSchema);
export default User;