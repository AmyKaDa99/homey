import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpException, HttpStatus } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusIdDto, UpdateReviewIdDto } from './dto/update-order.dto';
import { CreateReorderDto } from './dto/create-reorder.dto';
import { CreateUserOrderDto } from './dto/create-userOrder';
import { OrderStatusService } from 'src/order-status/order-status.service';
import { ReviewService } from 'src/review/review.service';
import { CreateReviewDto } from 'src/review/dto/create-review.dto';
import { UpdateReviewDto } from 'src/review/dto/update-review.dto';

@Controller('order')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly orderStatusService: OrderStatusService,
    private readonly reviewService: ReviewService) { }

  @Post()
  async create(@Body() createUserOrderDto: CreateUserOrderDto) {
    const pendingDocs = await this.orderStatusService.findPendingFromChefId();
    for (let i = 0; i < createUserOrderDto.orders.length; i++) {
      let createOrder: CreateOrderDto = {
        userId: '',
        kitchenId: '',
        orderStatusId: '',
        uniqueId: '',
        deliveredDate: undefined,
        location: undefined,
        details: '',
        locationDetails: '',
        regionId: '',
        price: '',
        baskets: []
      }
      const uniqueId = await this.orderService.genUniqueId()
      createOrder.uniqueId = uniqueId
      createOrder.orderStatusId = pendingDocs._id
      createOrder.userId = createUserOrderDto.userId
      createOrder.deliveredDate = createUserOrderDto.deliveredDate
      createOrder.regionId = createUserOrderDto.regionId
      createOrder.locationDetails = createUserOrderDto.locationDetails
      createOrder.location = createUserOrderDto.location
      createOrder.kitchenId = createUserOrderDto.orders[i].kitchenId
      createOrder.price = createUserOrderDto.orders[i].price
      createOrder.baskets = createUserOrderDto.orders[i].baskets
      await this.orderService.create(createOrder)

    }
    return 'done'
  }

  @Patch('cancel/:id')
  async cancel(@Param('id') id: string) {
    const result = await this.orderService.cancel(id)
    if (result) return 'done'
    throw new HttpException(
      {
        message: "call customer service please"
      }
      , HttpStatus.CONFLICT);

  }

  @Patch('receive/:id')
  async receive(@Param('id') id: string) {
    const pendingDocs = await this.orderStatusService.findCancelId()
    const rejectUserDocs = await this.orderStatusService.findRejectedFromUserId()
    const orderDocs = await this.orderService.findOne(id)
    if ((rejectUserDocs._id).toString() == orderDocs.orderStatusId)
      throw new HttpException('you can`t give review to order you rejected', HttpStatus.CONFLICT)
    if ((pendingDocs._id).toString() == orderDocs.orderStatusId)
      throw new HttpException('you can`t give review to order you have canceled', HttpStatus.CONFLICT)

    let createReviewDto: CreateReviewDto = {
      isDelivered: true
    }
    const reviewDocs = await this.reviewService.create(createReviewDto)
    let updateOrder: UpdateReviewIdDto = {
      reviewId: reviewDocs._id
    }
    await this.orderService.updateOrderReviewId(id, updateOrder)
    return 'done'
  }

  @Post('review/:id')
  async review(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto) {
    const orderDoc = await this.orderService.findOne(id)
    if (!orderDoc.reviewId) throw new HttpException('receive first', HttpStatus.CONFLICT)
    const reviewDoc = await this.reviewService.findOne(orderDoc.reviewId)
    if (reviewDoc.createdAt) throw new HttpException('you can`t post two review', HttpStatus.CONFLICT)
    await this.reviewService.update(orderDoc.reviewId, updateReviewDto)
    return 'done'
  }

  @Get('user/:id')
  async findUser(@Param('id') id: string) {
    return await this.orderService.findUserHistory(id)
  }

  @Get('dashboard/all')
  async findAllDashboard() {
    return await this.orderService.findAllDashboard();
  }

  @Get('dashboard/:id')
  async findOneDashboard(@Param('id') id: string) {
    return await this.orderService.findOneDashboard(id);
  }

  @Get('dashboard/uniqueId/:uniqueId')
  async findOneByUniqueIdDashboard(@Param('id') uniqueId: string) {
    return await this.orderService.findOneByUniqueDashboard(uniqueId);
  }

  @Patch('dashboard/orderStatus/:id')
  updateOrderStatus(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderStatusIdDto) {
    return this.orderService.updateOrderStatusId(id, updateOrderDto);
  }

}


@Controller('reorder')
export class ReorderController {
  constructor(
    private readonly orderService: OrderService) { }

  @Post()
  async reorder(@Body() createReOrderDto: CreateReorderDto) {
    const order = await this.orderService.reorder(createReOrderDto)
    return {
      id: order._id,
      price: order.price
    }
  }

  @Patch(':id/:status')
  async update(@Param('id') id: string, @Param('status') status: boolean) {
    await this.orderService.updateReorderStatus(id, status)
  }

}
