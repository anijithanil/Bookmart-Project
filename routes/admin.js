const { response } = require('express');
var express = require('express');
var router = express.Router();
var producthelper = require('../helpers/product-helpers');
var adminhelper = require('../helpers/admin-helpers');

/* GET users listing. */
// router.get('/', function (req, res, next) {
//     res.render('admin/login', { admin: true });
// });

router.get('/', function (req, res, next) {
  producthelper.getallproducts().then((product) => {
    res.render('admin/view-products', { admin: true, product });
  })
});

router.get('/add-products', (req, res) => {
  res.render('admin/add-products', { admin: true });
});

router.post('/add-products', (req, res) => {

  producthelper.addProduct(req.body).then((id) => {
    let image = req.files.image
    console.log(image.name);
    image.mv('./public/images/product-images/' + id + '.jpg', (err) => {
      if (!err) {
        res.render("admin/add-products")
      } else {
        console.log(err);
      }
    })

  })

});
router.get('/delete-product/:id', (req, res) => {
  let proid = req.params.id;
  producthelper.deleteproduct(proid).then((response) => {
    res.redirect('/admin/');
  })
})
router.get('/edit-product/:id', async (req, res) => {
  let product = await producthelper.getproductdeatils(req.params.id)
  res.render('admin/edit-product', { admin: true, product })
})
router.post('/edit-product/:id', (req, res) => {
  let id = req.params.id
  producthelper.updateproduct(id, req.body).then(() => {
    res.redirect('/admin/');
    if (req.files != null) {
      let image = req.files.image
      image.mv('./public/images/product-images/' + id + '.jpg')
    }
  })
})
router.get('/orders', async (req, res) => {
  let orders = await adminhelper.getallorders();
  res.render('admin/orders', { admin: true, orders })
})

router.get('/orderdetails/:id', async (req, res) => {
  let details = await adminhelper.singleorder(req.params.id)
  console.debug("single orders :" + JSON.stringify(details))
  res.render('admin/orderdetails', { admin: true, details })
})

router.get('/users',async(req,res)=>{
  let users =await adminhelper.getallusers()
  res.render('admin/users',{ admin:true,users })
})

router.get('/delete-user/:id', (req, res) => {
  let proid = req.params.id;
  adminhelper.deleteuser(proid).then((response) => {
    res.redirect('/admin/users');
  })
})

router.post('/change-status',async(req,res)=>{
  let status = await adminhelper.changestatus(req.body.userid,req.body.status).then(()=>{
    res.json({ status: true })
  })
})

router.get('/order-delete/:id', (req, res) => {
  let orderid = req.params.id;
  adminhelper.deleteorder(orderid).then((response) => {
    res.redirect('/admin/orders');
  })
})

module.exports = router;
