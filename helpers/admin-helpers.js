var db = require('../config/connection');
var collectiion = require('../config/collections');
const { response } = require('express');
var objectId = require('mongodb').ObjectID;

module.exports = {

    getallorders: () => {
        return new Promise(async (resolve, reject) => {

            let orders = db.get().collection(collectiion.ORDER_COLLECTION).aggregate(
                [
                    {
                        $lookup: {
                            from: collectiion.USER_COLLECTION,
                            localField: 'userid',
                            foreignField: '_id',
                            as: 'odd'
                        }
                    },
                    {
                        $unwind: '$odd'
                    },
                    {
                        $project: {
                            _id: 1,
                            odd: { name: 1 },
                            date: 1,
                            totalamount: 1,
                            status: 1
                        }
                    },
                ]
            ).sort({ date: -1 }).toArray()
            resolve(orders)

        })
    },
    singleorder: (orderid) => {
        return new Promise(async (resolve, reject) => {
            let details = db.get().collection(collectiion.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderid) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity',
                        totalamount: 1,
                        status:1
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
                        status:1,totalamount: 1, item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            resolve(details)
        })
    },
    getallusers: () => {
        return new Promise((resolve, reject) => {
            let users = db.get().collection(collectiion.USER_COLLECTION).find(
                {},
                {
                    projection:{
                        name: 1,
                        email: 1
                    }
                }
            ).toArray()
            resolve(users)
        })
    },
    deleteuser: (userid) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collectiion.USER_COLLECTION).deleteOne({ _id: objectId(userid) }).then((response) => {
                resolve(response);
            })
        })
    },
    changestatus:(userid,userstatus)=>{
        console.debug("user id :" + JSON.stringify(userid))
        console.debug("status :" + JSON.stringify(userstatus))
        return new Promise((resolve,reject)=>{
            db.get().collection(collectiion.ORDER_COLLECTION).updateOne(
            {
                _id:objectId(userid)
            },
            {
                $set:{
                    status:userstatus
                }
            }
            ).then(()=>{
                resolve()
            })
        })
    },
    deleteorder: (orderid) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collectiion.ORDER_COLLECTION).deleteOne({ _id: objectId(orderid) }).then((response) => {
                resolve(response);
            })
        })
    },


}