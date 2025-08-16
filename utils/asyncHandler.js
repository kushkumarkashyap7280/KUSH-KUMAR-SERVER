// day_007 ---------------------------------------------------------
const asyncHandler = (reqHandler) => {
    return (req, res, next) => {
      Promise.resolve(reqHandler(req, res, next))
        .catch((err) => next(err));
    };
  };
  
export default asyncHandler;
  




// export default aysncHandler = (fn)=>async(req, res , next)=>{
//     try {
//       await   fn(req, res, next);      
//     } catch (error) {
//         console.log(error.message);
//         res.status(error.code || 500).json({
//             message :  "error occured",
//             success : false
//         })
//     }
// };

//  ---------------------------------------------------------