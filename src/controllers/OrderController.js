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

const {ProductBeneficiary} = require('../models')

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
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, 'Invalid or wrong PIN.');
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

      const [campaignWallet, vendorWallet, beneficiaryWallet] = await Promise.all([
         WalletService.findSingleWallet({CampaignId: data.order.CampaignId, UserId: null}),
         WalletService.findSingleWallet({UserId: data.order.Vendor.id}),
         WalletService.findUserCampaignWallet(req.user.id, data.order.CampaignId)
      ])

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
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Server error: Please retry.');
      return Response.send(res);
    }
  }


  static async productPurchasedByGender(req, res) {


    try{
      let gender = {male: [], female: []}
      const products = await OrderService.productPurchased()

      if(products.length <= 0){
        Response.setSuccess(HttpStatusCode.STATUS_OK, 'No Product Purchased By Gender Recieved', {productsByMale, productsByFemale});
      return Response.send(res);
      }

      
      products.forEach((product)=> {
        product.Cart.forEach((cart)=> {
          cart.Product.ProductBeneficiaries.forEach((beneficiary)=> {
            if(beneficiary.gender === 'male' && !gender.male.includes(cart.Product.tag)){
              gender.male.push(cart.Product.tag)
            }
            if(beneficiary.gender === 'female' && !gender.female.includes(cart.Product.tag)){
              gender.female.push(cart.Product.tag)
            }
          })
        })
      })
     
      
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Product Purchased By Gender Recieved', gender);
      return Response.send(res);
    

    }catch(error){
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
      let age_group = {
        'eighteenTo29': {},
        'thirtyTo41': {},
        'forty2To53': {},
        'fifty4To65': {},
        'sixty6Up': {}
      }
      
      const products = await OrderService.productPurchased()
      if(products.length > 0){
        products.forEach((product)=> {
        product.Cart.forEach((cart)=> {
          cart.Product.ProductBeneficiaries.forEach((beneficiary)=> {
            if(parseInt(moment().format('YYYY') -  moment(beneficiary.dob).format('YYYY')) >= 18 &&  
          parseInt(moment().format('YYYY') -  moment(beneficiary.dob).format('YYYY')) <= 29 ){
            //if(age_group.eighteenTo29.includes(age_group.eighteenTo29.some((product)=> product)))
            age_group.eighteenTo29[cart.Product.tag] = (age_group.eighteenTo29[cart.Product.tag] || 0) + 1;
          }
          else if(parseInt(moment().format('YYYY') -  moment(beneficiary.dob).format('YYYY')) >= 30 &&  
          parseInt(moment().format('YYYY') -  moment(beneficiary.dob).format('YYYY')) <= 41 ){
            age_group.eighteenTo29[cart.Product.tag] = (age_group.eighteenTo29[cart.Product.tag] || 0) + 1;
          }
          else if(parseInt(moment().format('YYYY') -  moment(beneficiary.dob).format('YYYY')) >= 42 &&  
          parseInt(moment().format('YYYY') -  moment(beneficiary.dob).format('YYYY')) <= 53 ){
            age_group.eighteenTo29[cart.Product.tag] = (age_group.eighteenTo29[cart.Product.tag] || 0) + 1;
          }
         else if(parseInt(moment().format('YYYY') -  moment(beneficiary.dob).format('YYYY')) >= 54 &&  
          parseInt(moment().format('YYYY') -  moment(beneficiary.dob).format('YYYY')) <= 65 ){
            age_group.eighteenTo29[cart.Product.tag] = (age_group.eighteenTo29[cart.Product.tag] || 0) + 1;
          }else if(parseInt(moment().format('YYYY') -  moment(beneficiary.dob).format('YYYY')) >= 66){
            age_group.eighteenTo29[cart.Product.tag] = (age_group.eighteenTo29[cart.Product.tag] || 0) + 1;
          }
            // if(beneficiary.gender === 'male'){
            //   gender.male.push(cart.Product.tag)
            // }
            // if(beneficiary.gender === 'female'){
            //   gender.female.push(cart.Product.tag)
            // }
          })
        })
      })
    

        Response.setSuccess(HttpStatusCode.STATUS_OK, 'Product Purchased By Age Group Retrieved.',age_group);
        return Response.send(res);
      }
      
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'No Product Purchased By Age Group Retrieved.', age_group);
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
      let data = []
      let uniqueList = [];
      let dupList = [];
      const products = await OrderService.productPurchasedBy(query)

      if(products.length <= 0){
        Response.setSuccess(HttpStatusCode.STATUS_OK, 'No Product Purchased Recieved', products);
      return Response.send(res);
      }
      let total_product_sold = products.length
      let total_product_value = 0
      products.forEach(product => {
        product.Cart.forEach(cart => {
          
          total_product_value = total_product_value + cart.total_amount

          data.push({productId: cart.ProductId, product_name: cart.Product.tag, 
            vendorId: product.Vendor.id,
            vendor_name: product.Vendor.first_name + 
            " "+ product.Vendor.first_name,
            sales_volume: cart.total_amount,
            product_quantity: cart.quantity,
            product_cost: cart.Product.cost,
            total_revenue: cart.Product.cost * cart.quantity,
            date_of_purchased: cart.createdAt

          })
        })
      })
      data.push({
            "productId": 48,
            "product_name": "Relaxers",
            "vendorId": 4,
            "vendor_name": "Kennedy Kennedy",
            "product_quantity": 6,
            "sales_volume": 100,
            "product_cost": 10,
            "total_revenue": 10,
            "date_of_purchased": "2022-06-27T13:14:45.130Z"
        },)

        function getMonthDifference(startDate, endDate) {
          return (
            endDate.getMonth() -
            startDate.getMonth() +
            12 * (endDate.getFullYear() - startDate.getFullYear())
          );
        }
      const set = new Set()
      let found = []
      let exist = []
      const unique = data.filter((item)=> {
        const alreadyHas = set.has(item.productId, item.vendorId)
        set.add(item.productId, item.vendorId)
        if(alreadyHas) exist.push(item)
        return !alreadyHas
      })
    found.push(...unique)
    found.forEach((value)=> {
      exist.forEach((val)=>{
        if(value.productId == val.productId && value.vendorId == val.vendorId){
          value.sales_volume = (value.product_quantity + val.product_quantity) * 
           getMonthDifference(new Date(value.date_of_purchased), new Date(val.date_of_purchased)) 
          value.total_revenue = val.sales_volume + value.sales_volume
          console.log(getMonthDifference(new Date(value.date_of_purchased), new Date(val.date_of_purchased)) )
          delete value.date_of_purchased
        }
      })
    })
       
    
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Product Purchased Recieved', products);
      return Response.send(res);


    }catch(error){
      console.log(error)
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Server error: Please retry.');
      return Response.send(res);
    }
  }
  static async soldAndValue(req, res) {
    
    try{
      const query = req.query.name
      let data = []
      let uniqueList = [];
      let dupList = [];
      const products = await OrderService.productPurchasedBy(query)

      if(products.length <= 0){
        Response.setSuccess(HttpStatusCode.STATUS_OK, 'No Product Purchased Recieved', products);
      return Response.send(res);
      }
      let total_product_sold = products.length
      let total_product_value = 0
      products.forEach(product => {
        product.Cart.forEach(cart => {
          
          total_product_value = total_product_value + cart.total_amount

          data.push({productId: cart.ProductId, product_name: cart.Product.tag, 
            vendorId: product.Vendor.id,
            vendor_name: product.Vendor.first_name + 
            " "+ product.Vendor.first_name,
            sales_volume: cart.total_amount,
            product_quantity: cart.quantity,
            product_cost: cart.Product.cost,
            total_revenue: cart.Product.cost * cart.quantity,
            date_of_purchased: cart.createdAt

          })
        })
      })
      data.push({
            "productId": 48,
            "product_name": "Relaxers",
            "vendorId": 4,
            "vendor_name": "Kennedy Kennedy",
            "product_quantity": 6,
            "sales_volume": 100,
            "product_cost": 10,
            "total_revenue": 10,
            "date_of_purchased": "2022-06-27T13:14:45.130Z"
        },)

        function getMonthDifference(startDate, endDate) {
          return (
            endDate.getMonth() -
            startDate.getMonth() +
            12 * (endDate.getFullYear() - startDate.getFullYear())
          );
        }
      const set = new Set()
      let found = []
      let exist = []
      const unique = data.filter((item)=> {
        const alreadyHas = set.has(item.productId, item.vendorId)
        set.add(item.productId, item.vendorId)
        if(alreadyHas) exist.push(item)
        return !alreadyHas
      })
    found.push(...unique)
    found.forEach((value)=> {
      exist.forEach((val)=>{
        if(value.productId == val.productId && value.vendorId == val.vendorId){
          value.sales_volume = (value.product_quantity + val.product_quantity) * 
           getMonthDifference(new Date(value.date_of_purchased), new Date(val.date_of_purchased)) 
          value.total_revenue = val.sales_volume + value.sales_volume
          console.log(getMonthDifference(new Date(value.date_of_purchased), new Date(val.date_of_purchased)) )
          delete value.date_of_purchased
        }
      })
    })
       
    
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Product Purchased Recieved', {total_product_sold, total_product_value});
      return Response.send(res);


    }catch(error){
      console.log(error)
      Response.setError(HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR, 'Server error: Please retry.');
      return Response.send(res);
    }
  }
}

module.exports = OrderController;