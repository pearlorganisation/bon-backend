import asyncHandler from "../../middleware/asyncHandler";
import CustomError from "../../utils/error/customError";
import Property  from "../../models/Listing/property.model";
import Partner  from  "../../models/Partner/partner.model";


//verify property controller 


const  verifyProperyManually = asyncHandler(async(req,res,next)=>{
           
});


const verifyProperyKYB = asyncHandler(async (req, res, next) => {

       partnerId  = req.user._id;

       const {} = req.body;


});


export const getAllPartners = async (req, res) => {
       try {
         const partners = await Partner.find();
     
         return successResponse(
           res,
           200,
           "Partners fetched successfully",
           partners
         );
     
       } catch (error) {
         return res.status(500).json({
           success: false,
           statusCode: 500,
           message: error.message,
         });
       }
     };
