import mongoose from 'mongoose';

   
          
const CustomerSchema = new mongoose.Schema(

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

export default mongoose.model("Customer", CustomerSchema);

          
