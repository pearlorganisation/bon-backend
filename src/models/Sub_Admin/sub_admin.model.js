import mongoose from 'mongoose';

          
const Sub_AdminSchema = new mongoose.Schema(

  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      unique:true
    },
    

  },
  { timestamps: true }
);

export default mongoose.model("Sub_Admin", Sub_AdminSchema);

          
