import mongoose from 'mongoose';

          
const AdminSchema = new mongoose.Schema(

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

export default mongoose.model("Admin", AdminSchema);

          
