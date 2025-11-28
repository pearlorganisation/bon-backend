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
