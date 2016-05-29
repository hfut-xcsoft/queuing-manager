'use strict';
const Order = require('../models').Order;
const Item = require('../models').Item;
const HttpError = require('../common/http-error');
const utils = require('../common/utils.js');

const orderController = {};

//////////////////////////////
/* @Router: /orders         */
//////////////////////////////

/**
 * @api {get} /orders 获取符合条件的订单,可排序
 * @apiName 查询订单列表
 * @apiGroup 订单
 *
 * @apiParam sort {String} 排序字段,逗号分隔,-号代表降序排列
 */
orderController.getOrders = (req, res, next) => {
    const opt = {};
    Order.findOrdersByQuery({}, opt).then(order => {
      res.success(order);
    }).catch(next);
};

/**
 * @api {post} /orders 新增订单
 * @apiName 新增订单
 * @apiGroup 订单
 *
 * @apiParam [{String}] items 商品ID数组
 */
orderController.newOrder = (req, res, next) => {
  const itemIds = req.body.items;

  Promise.all([
    Item.findItemsByQuery({_id: {$in: itemIds}}),
    Order.findOrdersByQuery({}, {sort: {_id: -1}, limit: 1})
  ]).then(results => {
    let totalPrice = 0;
    results[0].forEach(item => {
      item.status = 0;
      totalPrice += item.price;
    });
    const lastOrder = results[1][0];
    const lastNumber = lastOrder ? lastOrder.number : 0;
    const _order = new Order({
      number: lastNumber == 100 ? 1 : lastNumber + 1,
      items: results[0],
      total_price: totalPrice
    });
    return Order.createNewOrder(_order);
  }).then(order => {
      res.success(order, 201);
  }).catch(next);
};

//////////////////////////////
/* @Router: /orders/:orderId*/
//////////////////////////////

/**
 * 断言中间件
 */
orderController.assertOrderExist = (req, res, next) => {
  const orderId = req.params.orderId;
  if(!utils.isObjectId(orderId)) {
    throw new HttpError.BadRequestError('The order is wrong');
  }
  Order.findOrderById(orderId).then(order => {
    if(!order) {
      throw new HttpError.NotFoundError('The order is not exist');
    }
    next();
  }).catch(next);
};

/**
 * @api {get} /orders/:orderId 通过orderId获取订单信息
 * @apiName 获取订单信息
 * @apiGroup 订单
 *
 * @apiParam {String} orderId
 */
orderController.getOrder = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findOrderById(orderId).then(order => {
    res.success(order);
  }).catch(next);
};


/**
 * @api {put} /items/:itemId 更新商品信息
 * @apiName 更新商品信息
 * @apiGroup 商品
 *
 * @apiParam {String} itemId
 * @apiParam {Number} status
 * @apiSuccess (201)
 */
orderController.updateOrder = (req, res, next) => {
  const orderId = req.params.orderId;
  let _order;

  Order.findOrderById(orderId, true).then(order => {
    const itemIds = req.body.items || order.items.map(item => item._id);
    const status = req.body.status || order.status;
    if (itemIds.length == 0) {
      throw new HttpError.BadRequestError();
    }
    if (status < order.status || status > order.status + 1) {
      throw new HttpError.ForbiddenError('状态转移错误');
    }
    order.status = status;
    _order = order;
    return Item.findItemsByQuery({_id: {$in: itemIds}})
  }).then(items => {
    let totalPrice = 0;
    items.forEach(item => {
      item.status = 0;
      totalPrice += item.price;
    });
    _order.items = items;
    _order.total_price = totalPrice;
    return Order.updateOrder(_order);
  }).then(order => {
      res.success(order, 201);
  }).catch(next);
};

/**
 * @api {delete} /orders/:orderId 通过orderId删除订单信息
 * @apiName 删除订单
 * @apiGroup 订单
 *
 * @apiParam {String} orderId
 * @apiSuccess (204)
 */
orderController.removeOrder = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.removeOrderById(orderId).then(() => {
    res.success(null, 204);
  }).catch(next);
};

////////////////////////////////////////////
/* @Router: /orders/orderId/items/:itemId */
////////////////////////////////////////////

/**
 * @api {put} /orders/orderId/items/:itemId 通过orderId与itemId修改订单商品信息
 * @apiName 修改订单商品信息
 * @apiGroup 订单
 *
 * @apiParam {String} orderId
 * @apiParam {String} itemId
 *
 * @apiSuccess (201)
 */
orderController.updateItemStatus = (req, res, next) => {

  const orderId = req.params.orderId;
  const itemId = req.params.itemId;
  const status = req.body.status;
  if (typeof status === 'undefined') {
    throw new HttpError.BadRequestError('未传入status')
  }
  Order.findOrderById(orderId, true).then(order => {
    const items = Object.assign([], order.items);
    items.forEach(item => {
      if (item._id == itemId) {
        item.status = item.status || 0;
        if (status < item.status || status > item.status + 1) {
          throw new HttpError.ForbiddenError('状态转移错误');
        }
        item.status = status;
      }
    });
    return Order.updateOrderItems(order._id, items);
  }).then(() => {
    return Order.findOrderById(orderId)
  }) .then(order => {
    res.success(order, 201);
  }).catch(next);
};

module.exports = orderController;