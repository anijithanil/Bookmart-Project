var db = require('../config/connection')
var collectiion = require('../config/collections')

const bcrypt = require('bcrypt');
const async = require('hbs/lib/async');
const { response } = require('express');
// const { reject, promise } = require('bcrypt/promises');
var objectId = require('mongodb').ObjectID;

const Razorpay = require('razorpay');
const { resolve } = require('node:path');

// var instance = new Razorpay({
//   key_id: 'rzp_test_7urkfWFKh0yteW',
//   key_secret: 'fjqstStKVIcnsywOU7BsPEN7',
// });
var instance = new Razorpay({
    key_id: 'rzp_test_ZYmc7jEEIxRsLW',
    key_secret: 'xZqmSVke315VwJs5FIdXQdXR',
  });

module.exports = {
    dosignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.password = await bcrypt.hash(userData.password, 10)
            db.get().collection(collectiion.USER_COLLECTION).insertOne(userData).then((data) => {
                resolve(data.insertedId)
            })
        })
    },
    dologin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginstatus = false
            let response = {}
            let user = await db.get().collection(collectiion.USER_COLLECTION).findOne({ email: userData.email })
            if (user) {
                bcrypt.compare(userData.password, user.password).then((status) => {
                    if (status) {
                        console.log("login success");
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        console.log("login failed");
                        resolve({ status: false })
                    }
                })
            } else {
                console.log("login failed");
                resolve({ status: false })
            }
        })
    },
    addtocart: (proid, userid) => {
        let proobj = {
            item: objectId(proid),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let usercart = await db.get().collection(collectiion.CART_COLLECTION).findOne({ user: objectId(userid) });
            if (usercart) {
                let proexist = usercart.products.findIndex(product => product.item == proid)
                if (proexist != -1) {
                    db.get().collection(collectiion.CART_COLLECTION).updateOne({ user: objectId(userid), 'products.item': objectId(proid) },
                        {
                            $inc: { 'products.$.quantity': 1 }
                        }).then(() => {
                            resolve()
                        })
                } else {
                    db.get().collection(collectiion.CART_COLLECTION).updateOne({ user: objectId(userid) }, {
                        $push: {
                            products: proobj
                        }
                    }).then((response) => {
                        resolve()
                    })
                }

            } else {
                let cartobj = {
                    user: objectId(userid),
                    products: [proobj]
                }
                db.get().collection(collectiion.CART_COLLECTION).insertOne(cartobj).then((response) => {
                    resolve()
                })
            }
        })
    },
    getcartproducts: (userid) => {
        return new Promise(async (resolve, reject) => {
            let cartitems = await db.get().collection(collectiion.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userid) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collectiion.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            resolve(cartitems)
        })
    },
    getcartcount: (userid) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collectiion.CART_COLLECTION).findOne({ user: objectId(userid) })
            if (cart) {
                count = cart.products.length
            }
            //     console.log(cart)
            resolve(count)
        })
    },
    changeproductquantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)
        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collectiion.CART_COLLECTION)
                    .updateOne({ _id: objectId(details.cart) },
                        {
                            $pull: { products: { item: objectId(details.product) } }
                        }
                    ).then((response) => {
                        resolve({ removeproduct: true })
                    })
            } else {
                db.get().collection(collectiion.CART_COLLECTION).updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
                    {
                        $inc: { 'products.$.quantity': details.count }
                    }).then((response) => {
                        resolve({ status: true })
                    })
            }
        })
    },
    gettotalamount: (userid) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collectiion.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userid) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collectiion.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: [{ $toInt: '$quantity' }, { $toDouble: '$product.price' }] } }
                    }
                }
            ]).toArray()
            if (total.length != 0) {
                resolve(total[0].total)
            } else {
                resolve(total)
            }
        })
    },
    placeorder: (order, products, total) => {
        return new Promise((resolve, reject) => {
            let status = order['payment-method'] === 'COD' ? 'placed' : 'pending'
            let orderobj = {
                deliverydetails: {
                    mobile: order.mobile,
                    address: order.address,
                    pincode: order.pincode
                },
                userid: objectId(order.userid),
                paymentmethod: order['payment-method'],
                products: products,
                totalamount: total,
                date: new Date(),
                status: status
            }
            let itemsProcessed = 0;
            products.forEach(element => {
            db.get().collection(collectiion.PRODUCT_COLLECTION).updateOne({ _id: objectId(element.item) },
                    {
                        $inc: { 'stock': parseInt('-' + element.quantity) }
                    }).then((response) => {
                        // resolve({ status: true })
                        // orders();
                    })
                    itemsProcessed++;
                    if(itemsProcessed === products.length) {
                        orders();
                    }
            })
            function orders(){
                db.get().collection(collectiion.ORDER_COLLECTION).insertOne(orderobj).then((response,err) => {
                    db.get().collection(collectiion.CART_COLLECTION).deleteOne({ user: objectId(order.userid) })
                    resolve(response)
                    
                })
            }
        })
    },
    getcartproductllist: (userid) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collectiion.CART_COLLECTION).findOne({ user: objectId(userid) })
            resolve(cart.products)
        })
    },
    getuserorders: (userid) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collectiion.ORDER_COLLECTION).find({ userid: objectId(userid) }).sort({date:-1}).toArray()
            resolve(orders)
        })
    },
    getorderproducts: (orderid) => {
        return new Promise(async (resolve, reject) => {
            let orderitems = await db.get().collection(collectiion.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderid) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collectiion.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            resolve(orderitems)
        })
    },
    getsearchproducts: (str) => {
        return new Promise(async (resolve, reject) => {
            let sproducts = await db.get().collection(collectiion.PRODUCT_COLLECTION).find(
                {
                    $or: [{
                        name: {
                            $regex: str
                        }
                    }, {
                        category: {
                            $regex: str
                        }
                    }
                    ]
                }
            ).toArray()
            resolve(sproducts)
        })
    },
    stockchek: (cartdeatils) => {
        return new Promise(async (resolve, reject) => {

            let check = await db.get().collection(collectiion.PRODUCT_COLLECTION).find(
                {
                    $and: [
                        {
                            _id: objectId(cartdeatils.item)
                        },
                        {
                            $expr: { $lt: [{ $toDouble: "$stock" }, cartdeatils.quantity] }
                        }
                    ]
                }
            ).toArray()

            resolve(check)
        })
    },
    generateRazropay:(orderId,total)=>{
        return new Promise((resolve,reject)=>{
            let options={
                amount:total*100,
                currency:"INR",
                receipt: ""+orderId
            };

            instance.orders.create(options,function(err,order){
                if(err){
                    console.log(err);
                }else{
                    resolve(order)
                }

            });
        })
    },
    verifyPayment:(details)=>{

        return new Promise(async(resolve,reject)=>{
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'xZqmSVke315VwJs5FIdXQdXR');

            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
            hmac = hmac.digest('hex')
            if( hmac == details['payment[razorpay_signature]'] ){
                resolve({staus:true})
            }else{
                reject({staus:false})
            }
        })
    },
    changepaymentstatus:(orderid)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collectiion.ORDER_COLLECTION).updateOne(
            {
                _id:objectId(orderid)
            },
            {
                $set:{
                    status:'placed'
                }
            }
            ).then(()=>{
                resolve()
            })
        })
    }



}
