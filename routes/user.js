const { response } = require('express');
var express = require('express');
const async = require('hbs/lib/async');




var router = express.Router();
const producthelper = require('../helpers/product-helpers');
const userhelper = require('../helpers/user-helpers');
const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  } else {
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/', async function (req, res, next) {

  let user = req.session.user;
  let cartcount = null
  if (user) {
    cartcount = await userhelper.getcartcount(req.session.user._id)
  }
  producthelper.getallproducts().then((product) => {
    res.render('user/view-products', { product, user, cartcount });
  })
});
router.get('/login', (req, res) => {
  if (req.session.loggedIn) {
    res.redirect('/')
  } else {
    res.render('user/login', { "loginErr": req.session.loginErr });
    req.session.loginErr = false
  }
})
router.get('/signup', (req, res) => {
  if (req.session.loggedIn) {
    res.redirect('/')
  } else {
    res.render('user/signup', { "loginErr": req.session.loginErr });
    req.session.loginErr = false
  }
})
router.post('/signup', (req, res) => {
  userhelper.dosignup(req.body).then((response) => {
    req.session.loggedIn = false
    req.session.user = response
    res.redirect('/login')
  })
})
router.post('/login', (req, res) => {
  userhelper.dologin(req.body).then((response) => {
    if (response.status) {
      req.session.loggedIn = true
      req.session.user = response.user
      res.redirect('/')
    } else {
      req.session.loginErr = true
      res.redirect('/login')
    }
  })
})
router.get('/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/')
})
router.get('/cart', verifyLogin, async (req, res) => {
  let products = await userhelper.getcartproducts(req.session.user._id)
  let totalvalue = await userhelper.gettotalamount(req.session.user._id)
  let string = null
  res.render('user/cart', { products, user: req.session.user, totalvalue,string })
})
router.get('/cart/:id', verifyLogin, async (req, res) => {
  let string = (req.params.id).split(",")
  let products = await userhelper.getcartproducts(req.session.user._id)
  let totalvalue = await userhelper.gettotalamount(req.session.user._id)
  res.render('user/cart', { products, user: req.session.user, totalvalue,string })
})
router.get('/add-to-cart/:id', verifyLogin, (req, res) => {
  userhelper.addtocart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true })
  })
})
router.post('/change-product-quantity', (req, res, next) => {
  userhelper.changeproductquantity(req.body).then(async (response) => {
    response.total = await userhelper.gettotalamount(req.body.user)
    res.json(response)
  })
})
router.get('/place-order', verifyLogin, async (req, res) => {
  let products = await userhelper.getcartproducts(req.session.user._id)
  let total = await userhelper.gettotalamount(req.session.user._id)
  res.render('user/place-order', { total, user: req.session.user, products })
})
router.post('/place-order', async (req, res) => {
  let products = await userhelper.getcartproductllist(req.body.userid)
  let totalprice = await userhelper.gettotalamount(req.body.userid)
  
  let status = true
  let outstock = []
  let stockcheck //=  await userhelper.stockchek(products)
  let count = products.length
  let body = req.body
  console.log("count :"+count )

  for (const product of products) {
    stockcheck = await userhelper.stockchek(product)
    if (stockcheck != '') {
      status = false
      outstock.push(stockcheck[0].name,stockcheck[0].stock)
      // console.debug("stock check"+JSON.stringify(stockcheck))
    }
    count--
    if (count == 0) {
      if (!status) {
        res.json({ status: false, error: outstock })
      } else { 
        console.log("count :"+count )
        userhelper.placeorder(req.body, products, totalprice).then((orderId) => {

          if(req.body['payment-method']==='COD'){
          res.json({ status: true,codSuccess: true })
          }else{
            userhelper.generateRazropay(orderId.insertedId,totalprice).then((response)=>{
              console.debug("orders details"+JSON.stringify(response))  
              res.json(response)
            })
          }
        })
      }
    }
  }

  //console.debug("stock check"+JSON.stringify(stockcheck))

  // userhelper.placeorder(req.body,products,totalprice).then((response)=>{
  //   res.json({status:true})
  // })
})
router.get('/order-success', (req, res) => {
  res.render('user/order-success', { user: req.session.user })
})
router.get('/orders', verifyLogin, async (req, res) => {
  let user = req.session.user;
  let cartcount = null
  if (user) {
    cartcount = await userhelper.getcartcount(req.session.user._id)
  }
  let orders = await userhelper.getuserorders(req.session.user._id)
  res.render('user/orders', { user,cartcount, orders })
})
router.get('/view-order-products/:id', async (req, res) => {
  let products = await userhelper.getorderproducts(req.params.id)
  res.render('user/view-order-products', { user: req.session.user, products })
})
router.get('/privacypolicy', async(req, res) => {
  let user = req.session.user;
  let cartcount = null
  if (user) {
    cartcount = await userhelper.getcartcount(req.session.user._id)
  }
  res.render('user/privacypolicy',{user,cartcount})
})
router.get('/search', (req, res) => {
  res.redirect('/')
})
router.post('/search', async (req, res) => {
  let user = req.session.user;
  let cartcount = null
  if (user) {
    cartcount = await userhelper.getcartcount(req.session.user._id)
  }
  let search = req.body.search
  let products = await userhelper.getsearchproducts(search)
  res.render('user/search', { products,user,cartcount })
})
router.get('/my-account', verifyLogin, async(req, res) => {
  let user = req.session.user;
  let cartcount = null
  if (user) {
    cartcount = await userhelper.getcartcount(req.session.user._id)
  }
  res.render('user/myaccount',{ user,cartcount })
})
router.post('/verify-payment',(req,res)=>{
   userhelper.verifyPayment(req.body).then(()=>{
    userhelper.changepaymentstatus(req.body['order[receipt]']).then(()=>{
      res.json({status:true})
    })
  }).catch((err)=>{
    console.log(err)
    res.json({status:false,errmsg:'Payment failed'})
  })
})
module.exports = router;
