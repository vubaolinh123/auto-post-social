import mongoose from 'mongoose';

const codeVerifierSchema = new mongoose.Schema({
  state: { type: String, required: true },
  codeVerifier: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: '10m' } 
});

export default mongoose.model('CodeVerifier', codeVerifierSchema);
