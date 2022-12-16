var db = require('../config/connection');
var collectiion = require('../config/collections');
const { response } = require('express');
var objectId = require('mongodb').ObjectID;


module.exports = {

    // addProduct: (product, callback) => {

    //     db.get().collection('product').insertOne(product).then((data) => {
    //         callback(product._id)
    //     })
    // },
    addProduct: (product) => {
        let products = {
            name :product.name,
            category:product.category,
            price:product.price,
            stock:parseInt(product.stock),
            description:product.description
        }
        return new Promise(async (resolve, reject) => {
            let pro = await db.get().collection(collectiion.PRODUCT_COLLECTION).insertOne(products).then((response)=>{
                resolve(response.insertedId)
            });
        })
    },
    getallproducts: () => {
        return new Promise(async (resolve, reject) => {
            let product = await db.get().collection(collectiion.PRODUCT_COLLECTION).find().toArray();
            resolve(product)
        })
    },
    deleteproduct: (proid) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collectiion.PRODUCT_COLLECTION).deleteOne({ _id: objectId(proid) }).then((response) => {
                resolve(response);
            })
        })
    },
    getproductdeatils:(proid)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collectiion.PRODUCT_COLLECTION).findOne({_id:objectId(proid)}).then((product)=>{
                resolve(product);
            })
        })
    },
    updateproduct:(proid,prodetails)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collectiion.PRODUCT_COLLECTION).updateOne({_id:objectId(proid)},{
                $set:{
                    name:prodetails.name,
                    description:prodetails.description,
                    price:prodetails.price,
                    stock:parseInt(prodetails.stock),
                    category:prodetails.category
                }
            }).then((response)=>{
                resolve(response)
            })
        })
    },


}