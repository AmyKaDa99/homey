import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateOrderStatusDto } from './dto/create-order-status.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatus, OrderStatusDocument } from './entities/order-status.entity';

@Injectable()
export class OrderStatusService {
  constructor(
    @InjectModel(OrderStatus.name) private OrderStatusModel: Model<OrderStatusDocument>
  ) { }

  async create(createOrderStatusDto: CreateOrderStatusDto) {
    const createOrderStatus = new this.OrderStatusModel(createOrderStatusDto);
    await createOrderStatus.save();
  }

  async findAll() {
    return await this.OrderStatusModel.find();
  }

  async findPendingFromChefId() {
    return this.OrderStatusModel.findOne({ name: "معلقة" }, { _id: 1 })
  }

  async findPendingFromUserId() {
    return this.OrderStatusModel.findOne({ name: "user Pending" }, { _id: 1 })
  }

  async findRejectedFromUserId() {
    return this.OrderStatusModel.findOne({ name: "user Rejected" }, { _id: 1 })
  }

  async findCancelId() {
    return this.OrderStatusModel.findOne({ name: "Cancel" }, { _id: 1 })
  }

  findOne(id: number) {
    return `This action returns a #${id} orderStatus`;
  }

  update(id: number, updateOrderStatusDto: UpdateOrderStatusDto) {
    return `This action updates a #${id} orderStatus`;
  }

  remove(id: number) {
    return `This action removes a #${id} orderStatus`;
  }
}
