import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusIdDto, UpdateReviewIdDto } from './dto/update-order.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './entities/order.entity';
import { CreateReorderDto } from './dto/create-reorder.dto';
import { OrderStatusService } from 'src/order-status/order-status.service';
import { MealService } from 'src/meal/meal.service';
import { TelegramBotService } from 'src/telegram-bot/telegram-bot.service';

@Injectable()
export class OrderService {

  constructor(
    @InjectModel(Order.name) private OrderModel: Model<OrderDocument>,
    private readonly orderStatusService: OrderStatusService,
    private readonly mealService: MealService,
    private readonly telegramService: TelegramBotService
  ) { }

  async create(createOrderDto: CreateOrderDto) {
    const createOrder = new this.OrderModel(createOrderDto);
    return await createOrder.save();
    this.telegramService.sendMessageToUser('532222678', 'new order')
  }

  async reCreateBaskets(baskets) {
    let results: any[] = []
    for (let i = 0; i < baskets.length; i++) {
      let obj: { mealId?, numberOfItems?, totalPrice?, details?} = {}
      const meal = await this.mealService.findPrice(baskets[i].mealId)
      obj.mealId = baskets[i].mealId
      obj.numberOfItems = baskets[i].numberOfItems
      obj.totalPrice = (+baskets[i].numberOfItems * +meal.price).toString()
      obj.details = baskets[i].details
      results.push(obj)
    }
    return results
  }

  async reCreatePrice(baskets) {
    let results: string = '0'
    for (let i = 0; i < baskets.length; i++) {
      results = (+baskets[i].totalPrice + +results).toString()
    }
    return results
  }

  async reorder(CreateReorderDto: CreateReorderDto) {
    const oldOrder = await this.OrderModel.findOne({ _id: CreateReorderDto.orderID }) as any
    const pendingDocs = await this.orderStatusService.findPendingFromUserId();
    const uniqueId = await this.genUniqueId()
    const baskets = await this.reCreateBaskets(oldOrder.baskets)
    const price = await this.reCreatePrice(baskets)
    let createOrderDto: CreateOrderDto = {
      userId: '',
      orderStatusId: '',
      kitchenId: '',
      deliveredDate: undefined,
      location: undefined,
      details: '',
      uniqueId: '',
      price: '',
      baskets: [],
      locationDetails: '',
      regionId: ''
    }
    createOrderDto.userId = oldOrder.userId
    createOrderDto.kitchenId = oldOrder.kitchenId
    createOrderDto.orderStatusId = pendingDocs._id
    createOrderDto.uniqueId = uniqueId
    createOrderDto.regionId = CreateReorderDto.regionId
    createOrderDto.locationDetails = CreateReorderDto.locationDetails
    createOrderDto.deliveredDate = CreateReorderDto.deliveredDate
    createOrderDto.location = oldOrder.location
    createOrderDto.details = oldOrder.details
    createOrderDto.price = price
    createOrderDto.baskets = baskets

    const createOrder = new this.OrderModel(createOrderDto);
    await createOrder.save();

    return createOrder
  }

  async updateReorderStatus(_id: string, bool: boolean) {
    if (bool) {
      await this.acceptNewPrice(_id)
    }
    else {
      await this.rejectNewPrice(_id)
    }
  }

  async acceptNewPrice(_id: string) {
    let statDocs = await this.orderStatusService.findPendingFromChefId()
    this.OrderModel.updateOne({ _id }, { orderStatusId: statDocs._id })
      .then((res) => console.log(res))
      .catch((err) => console.log(err))
  }

  async rejectNewPrice(_id: string) {
    let statDocs = await this.orderStatusService.findRejectedFromUserId()
    this.OrderModel.updateOne({ _id }, { orderStatusId: statDocs._id })
      .then((res) => console.log(res))
      .catch((err) => console.log(err))
  }

  async cancel(_id: string): Promise<Boolean> {
    const pendingDocs = await this.orderStatusService.findPendingFromChefId()
    const cancelDocs = await this.orderStatusService.findCancelId()
    const orderDocs = await this.OrderModel.findOne({ _id }, { orderStatusId: 1 }) as any
    if ((pendingDocs._id).toString() == orderDocs.orderStatusId) {
      this.OrderModel.updateOne({ _id }, { orderStatusId: cancelDocs._id })
        .then((res) => console.log(res))
        .catch((err) => console.log(err))
      return true
    }
    else {
      return false
    }
  }

  async findUserHistory(userId: string) {
    const populateQuery = [
      {
        path: "orderStatusId"
      },
      {
        path: "reviewId"
      },
      {
        path: "kitchenId",
        select: "name"
      },
      {
        path: "baskets.mealId"
      }
    ]
    const orders = await this.OrderModel.find({ userId }, { userId: 0 }).populate(populateQuery) as any;
    const results = orders.map(element => {
      let order: {
        _id?,
        KitchenId?,
        kitchenName?,
        price?,
        createAt?,
        deliveredDate?,
        location?,
        orderStatusId?,
        orderStatusName?,
        details?,
        regionId?,
        locationDetails?,
        baskets?,
        uniqueId?,
        review?
      } = {
      }

      order._id = element._id
      order.uniqueId = element.uniqueId
      order.KitchenId = element.kitchenId._id
      order.kitchenName = element.kitchenId.name
      order.price = element.price
      order.createAt = element.createAt
      order.deliveredDate = element.deliveredDate
      order.location = element.location
      order.orderStatusId = element.orderStatusId._id
      order.orderStatusName = element.orderStatusId.name
      order.details = element.details
      order.locationDetails = element.locationDetails
      order.regionId = element.regionId
      let arr = []
      for (let i = 0; i < element.baskets.length; i++) {
        let obj: { mealId?, name?, amount?, url?, numberOfItems?, totalPrice?} = {}
        obj.mealId = element.baskets[i].mealId._id
        obj.name = element.baskets[i].mealId.name
        obj.amount = element.baskets[i].mealId.amount
        obj.url = element.baskets[i].mealId.url
        obj.numberOfItems = element.baskets[i].numberOfItems
        arr.push(obj)
      }
      order.baskets = arr
      if (element.reviewId) {
        if (element.reviewId.updatedAt)
          order.review = true
      }
      else {
        order.review = false
      }
      return order
    })
    return results
  }

  async findAllDashboard() {
    const populateQuery = [
      { path: "userId" },
      { path: "kitchenId" },
      { path: "orderStatusId" }
    ]
    const orders = await this.OrderModel.find({}).populate(populateQuery)
    const results = orders.map(element => {
      let order: {
        uniqueId?,
        _id?,
        username?,
        kitchenName?,
        price?,
        location?,
        orderStatus?,
        deliveredDate?,
        createdAt?
      } = {}
      order._id = element._id,
        order.uniqueId = element.uniqueId,
        order.username = element.userId.name,
        order.kitchenName = element.kitchenId.name,
        order.price = element.price,
        order.location = element.location,
        order.orderStatus = element.orderStatusId,
        order.deliveredDate = element.deliveredDate,
        order.createdAt = element.createdAt
      return order
    })
    return results
  }

  async findOneDashboard(id: string) {
    const populateQuery = [
      { path: "userId" },
      { path: "kitchenId" },
      { path: "orderStatusId" },
      { path: "baskets.mealId" }
    ]
    const order = await this.OrderModel.findOne({ _id: id }).populate(populateQuery)
    /*let order: {
      uniqueId?,
      _id?,
      username?,
      kitchenName?,
      price?,
      location?,
      orderStatus?,
      deliveredDate?,
      createdAt?
    } = {}
    return orders.map(element => {
      order._id = element._id,
        order.uniqueId = element.uniqueId,
        order.username = element.userId.name,
        order.kitchenName = element.kitchenId.name,
        order.price = element.price,
        order.location = element.location,
        order.orderStatus = element.orderStatusId,
        order.deliveredDate = element.deliveredDate,
        order.createdAt = element.createdAt
      return order
    })*/
    console.log(order)
    return order
  }

  async findOneByUniqueDashboard(uniqueId: string) {
    const populateQuery = [
      { path: "userId" },
      { path: "kitchenId" },
      { path: "orderStatusId" },
      { path: "baskets.mealId" }
    ]
    const order = await this.OrderModel.findOne({ uniqueId }).populate(populateQuery)
    /*let order: {
      uniqueId?,
      _id?,
      username?,
      kitchenName?,
      price?,
      location?,
      orderStatus?,
      deliveredDate?,
      createdAt?
    } = {}
    return orders.map(element => {
      order._id = element._id,
        order.uniqueId = element.uniqueId,
        order.username = element.userId.name,
        order.kitchenName = element.kitchenId.name,
        order.price = element.price,
        order.location = element.location,
        order.orderStatus = element.orderStatusId,
        order.deliveredDate = element.deliveredDate,
        order.createdAt = element.createdAt
      return order
    })*/
    console.log(order)
    return order
  }

  async findOne(_id: string) {
    return await this.OrderModel.findOne({ _id });
  }

  async updateOrderStatusId(id: string, updateOrderDto: UpdateOrderStatusIdDto) {
    await this.OrderModel.updateOne({ _id: id }, updateOrderDto)
      .then(async (res) => console.log(res))
      .catch((err) => console.log(err));

    const populateQuery = [
      { path: "userId" },
      { path: "kitchenId" },
      { path: "orderStatusId" }
    ]
    const orderDoc = await this.OrderModel.findOne({ _id: id }).populate(populateQuery)
    let order: {
      uniqueId?,
      _id?,
      username?,
      kitchenName?,
      price?,
      location?,
      orderStatus?,
      deliveredDate?,
      createdAt?
    } = {}

    order._id = orderDoc._id,
      order.uniqueId = orderDoc.uniqueId,
      order.username = orderDoc.userId.name,
      order.kitchenName = orderDoc.kitchenId.name,
      order.price = orderDoc.price,
      order.location = orderDoc.location,
      order.orderStatus = orderDoc.orderStatusId,
      order.deliveredDate = orderDoc.deliveredDate,
      order.createdAt = orderDoc.createdAt
    return order

  }

  async updateOrderReviewId(id: string, updateOrderDto: UpdateReviewIdDto) {
    await this.OrderModel.updateOne({ _id: id }, updateOrderDto)
      .then(async (res) => console.log(res))
      .catch((err) => console.log(err));

  }


  async genUniqueId(): Promise<string> {
    return (new Date().getTime()).toString(36);
  }

}
