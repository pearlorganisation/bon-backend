import mongoose from 'mongoose';

          
const AdminSchema = new mongoose.Schema(

  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      unique:true
    },
   
    commission: {
      min: { type: Number, default: 10 },
      max: { type: Number, default: 50 },
    },
   
  },
  { timestamps: true }
);

const Admin =mongoose.model("Admin", AdminSchema);

export default Admin;

          
