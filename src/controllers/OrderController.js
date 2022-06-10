const {
  Response
} = require("../libs");
const moment = require('moment')
const {
  HttpStatusCode,
  generateOrderRef,
  generateQrcodeURL,
  compareHash
} = require("../utils");


const { VendorService, WalletService,UserService, OrderService } = require('../services');
class OrderController {
  static  async getOrderByReference(req, res){
    try {
      const reference = req.params.reference;
      const order = await VendorService.getOrder({reference});
      if(order) {
        Response.setSuccess(HttpStatusCode.STATUS_OK, 'Order details', order);
        return Response.send(res);
      }

      Response.setError(HttpStatusCode.STATUS_RESOURCE_NOT_FOUND, 'Order not found.');
      return Response.send(res)
    } catch (error) {
      console.log(error)
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Server error: Please retry.');
      return Response.send(res);
    }
  }
    static async comfirmsmsTOKEN(req, res){
    const pin = req.body.pin
    const id = req.body.beneficiaryId
    const {reference} = req.params
    try{
      const data = await VendorService.getOrder({reference});
      const user = await UserService.findSingleUser({id})
      if(!user){
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Invalid beneficiary');
      return Response.send(res);
      }
      if (!compareHash(pin, user.pin)) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Invalid or wrong old PIN.');
        return Response.send(res)
      }
      
      if(!data) {
        Response.setError(HttpStatusCode.STATUS_RESOURCE_NOT_FOUND, 'Order not found.');
        return Response.send(res)
      }

      if(data.order.status !== 'pending') {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, `Order ${data.order.status}`);
        return Response.send(res)
      }

      const campaignWallet = await WalletService.findSingleWallet({CampaignId: data.order.CampaignId, UserId: null})
      const vendorWallet = await WalletService.findSingleWallet({UserId: data.order.Vendor.id})
      const beneficiaryWallet = await WalletService.findUserCampaignWallet(id, data.order.CampaignId)

      if(!beneficiaryWallet) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Account not eligible to pay for order');
        return Response.send(res)
      }
      if(!vendorWallet) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Vendor Wallet Not Found..');
        return Response.send(res)
      }
      if(!campaignWallet) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Campaign Wallet Not Found..');
        return Response.send(res)
      }

      if(campaignWallet.balance < data.total_cost) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Insufficient wallet balance.');
        return Response.send(res)
      }
      const transaction = await OrderService.processOrder(beneficiaryWallet,vendorWallet,campaignWallet, data.order, data.order.Vendor, data.total_cost);

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Order details', transaction);
      return Response.send(res)
    }catch(error){
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Internal server error. Please try again later.', error);
      return Response.send(res);
    }
  }
  static async completeOrder(req, res) {
    try {
      const {reference} = req.params
      const data = await VendorService.getOrder({reference});
      if(!data) {
        Response.setError(HttpStatusCode.STATUS_RESOURCE_NOT_FOUND, 'Order not found.');
        return Response.send(res)
      }

      if(data.order.status !== 'pending') {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, `Order ${data.order.status}`);
        return Response.send(res)
      }


      const campaignWallet = await WalletService.findSingleWallet({CampaignId: data.order.CampaignId, UserId: null})
      const vendorWallet = await WalletService.findSingleWallet({UserId: data.order.Vendor.id})
      const beneficiaryWallet = await WalletService.findUserCampaignWallet(req.user.id, data.order.CampaignId)

      if(!beneficiaryWallet) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Account not eligible to pay for order');
        return Response.send(res)
      }
      if(!vendorWallet) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Vendor Wallet Not Found..');
        return Response.send(res)
      }
      if(!campaignWallet) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Campaign Wallet Not Found..');
        return Response.send(res)
      }

      if(campaignWallet.balance < data.total_cost) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Insufficient wallet balance.');
        return Response.send(res)
      }
      const transaction = await OrderService.processOrder(beneficiaryWallet,vendorWallet,campaignWallet, data.order, data.order.Vendor, data.total_cost);

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Order details', transaction);
      return Response.send(res);
    } catch (error) {
      console.log(error)
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Server error: Please retry.');
      return Response.send(res);
    }
  }


  static async productPurchasedByGender(req, res) {
    let productsByMale = []
    let productsByFemale = []

    let val;

    try{

      const product = await OrderService.productPurchased()

      if(product.length <= 0){
        Response.setSuccess(HttpStatusCode.STATUS_OK, 'No Product Purchased By Gender Recieved', {productsByMale, productsByFemale});
      return Response.send(res);
      }
      let maleRepeat = 1
      let femaleRepeat = 1
       
      const vendor = Array.isArray(product) ? product.map((vendor) => vendor) : []
      const collection = Array.isArray(vendor) ? vendor.map((coll) => coll.Cart) : []
      const cart = Array.isArray(collection) ? collection.map((cart) => cart.Product) : []
      var newCollection = [].concat.apply([], collection);
      
      let val

      for(let i = 0; i<vendor.length; i++){
        console.log(vendor[i].Vendor, 'vendor[i].Vendor.gender')
        if(vendor[i].Vendor.gender !== null && vendor[i].Vendor.gender === ('male' || 'Male')){
          for(let j = 0; j<newCollection.length; j++){

            
            val = newCollection[j].Product
              console.log(val.tag)
              if(productsByMale.length >= 0 && !productsByMale.some(coun => coun.tag === val.tag)) {
                productsByMale.push({tag: val.tag, maleRepeat})
              }else if(productsByMale.length > 0 && productsByMale.some(coun => coun.tag === val.tag)){
                productsByMale.find((obj => obj.tag === val.tag)).maleRepeat += 1 
              }
          }
    
        }

        if(vendor[i].Vendor.gender !== null && vendor[i].Vendor.gender === ('female' || 'Female')){
          for(let j = 0; j<newCollection.length; j++){

            val = newCollection[j].Product
              console.log(val.tag)
              if(productsByFemale.length >= 0 && !productsByFemale.some(coun => coun.tag === val.tag)) {
                productsByFemale.push({tag: val.tag, femaleRepeat})
              }else if(productsByFemale.length > 0 && productsByFemale.some(coun => coun.tag === val.tag)){
                productsByFemale.find((obj => obj.tag === val.tag)).femaleRepeat += 1 
              }
          }
    
        }
      }
      

      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Product Purchased By Gender Recieved', {productsByMale, productsByFemale});
      return Response.send(res);
    

    }catch(error){
      console.log(error)
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Server error: Please retry.');
      return Response.send(res);
    }
  }


  static async productPurchasedByAgeGroup(req, res){
   
    try{

      let eighteenTo29 = 0
      let thirtyTo41 = 0
      let forty2To53 = 0
      let fifty4To65 = 0
      let sixty6Up = 0

      
      const product = await OrderService.productPurchased()
    
      if(product.length > 0){
        for (let i = 0; i < product.length;  i++){
         
          if(parseInt(moment().format('YYYY') -  moment(product[i].Vendor.dob).format('YYYY')) >= 18 &&  
          parseInt(moment().format('YYYY') -  moment(product[i].Vendor.dob).format('YYYY')) <= 29 ){
            eighteenTo29++
          }
          else if(parseInt(moment().format('YYYY') -  moment(product[i].Vendor.dob).format('YYYY')) >= 30 &&  
          parseInt(moment().format('YYYY') -  moment(product[i].Vendor.dob).format('YYYY')) <= 41 ){
            thirtyTo41++
          }
          else if(parseInt(moment().format('YYYY') -  moment(product[i].Vendor.dob).format('YYYY')) >= 42 &&  
          parseInt(moment().format('YYYY') -  moment(product[i].Vendor.dob).format('YYYY')) <= 53 ){
            forty2To53++
          }
         else if(parseInt(moment().format('YYYY') -  moment(product[i].Vendor.dob).format('YYYY')) >= 54 &&  
          parseInt(moment().format('YYYY') -  moment(product[i].Vendor.dob).format('YYYY')) <= 65 ){
            fifty4To65++
          }else if(parseInt(moment().format('YYYY') -  moment(product[i].Vendor.dob).format('YYYY')) >= 66){
            sixty6Up++
          }
        }

        Response.setSuccess(HttpStatusCode.STATUS_OK, 'Product Purchased By Age Group Retrieved.',{eighteenTo29, thirtyTo41, forty2To53, fifty4To65, sixty6Up});
        return Response.send(res);
      }
      
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'No Product Purchased By Age Group Retrieved.', {eighteenTo29, thirtyTo41, forty2To53, fifty4To65, sixty6Up});
      return Response.send(res);

    

    }catch(error){
      console.log(error);
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Internal server error. Please try again later.');
      return Response.send(res);
    }
  }


  static async productPurchased(req, res) {
    
    try{
      const query = req.query.name
     
  
      const products = await OrderService.productPurchasedBy(query)

      if(products.length <= 0){
        Response.setSuccess(HttpStatusCode.STATUS_OK, 'No Product Purchased Recieved', products);
      return Response.send(res);
      }
      
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Product Purchased Recieved', products);
      return Response.send(res);


    }catch(error){
      console.log(error)
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Server error: Please retry.');
      return Response.send(res);
    }
  }
}

module.exports = OrderController;