import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateOrderDto, OrderFilterDto } from './dto/order.dto';
import type { Order } from './entities/order.entity';
import { OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';

@Injectable()
export class OrdersService {
  private orders: Order[] = [
    {
      id: 1,
      userId: 1,
      totalAmount: 5999,
      status: OrderStatus.PAID,
      items: [{ productId: 1, quantity: 1, price: 5999, name: 'iPhone 14' }],
      address: '北京市朝阳区XX街道',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      userId: 2,
      totalAmount: 12999,
      status: OrderStatus.SHIPPED,
      items: [{ productId: 2, quantity: 1, price: 12999, name: 'MacBook Pro' }],
      address: '上海市浦东新区XX路',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      userId: 1,
      totalAmount: 8798,
      status: OrderStatus.PENDING,
      items: [{ productId: 3, quantity: 2, price: 4399, name: 'iPad Air' }],
      address: '北京市朝阳区XX街道',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  findAll(filter: OrderFilterDto) {
    let filteredOrders = [...this.orders];

    if (filter.userId) {
      filteredOrders = filteredOrders.filter(
        (order) => order.userId === filter.userId,
      );
    }

    if (filter.status) {
      filteredOrders = filteredOrders.filter(
        (order) => order.status === filter.status,
      );
    }

    // 计算分页
    const total = filteredOrders.length;
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;

    const data = filteredOrders.slice(skip, skip + limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  findById(id: number): Order {
    const order = this.orders.find((order) => order.id === id);
    if (!order) {
      throw new NotFoundException(`订单ID ${id} 不存在`);
    }
    return order;
  }

  findByUserId(userId: number): Order[] {
    return this.orders.filter((order) => order.userId === userId);
  }

  create(createOrderDto: CreateOrderDto): Order {
    // 计算订单总金额
    const totalAmount = createOrderDto.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const newId =
      this.orders.length > 0
        ? Math.max(...this.orders.map((o) => o.id)) + 1
        : 1;

    const newOrder: Order = {
      id: newId,
      userId: createOrderDto.userId,
      totalAmount,
      status: OrderStatus.PENDING,
      items: createOrderDto.items.map((item) => ({
        ...item,
      })),
      address: createOrderDto.address,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.orders.push(newOrder);
    return newOrder;
  }

  updateStatus(id: number, status: OrderStatus): Order {
    const orderIndex = this.orders.findIndex((order) => order.id === id);
    if (orderIndex === -1) {
      throw new NotFoundException(`订单ID ${id} 不存在`);
    }

    // 检查状态转换是否合法
    this.validateStatusTransition(this.orders[orderIndex].status, status);

    this.orders[orderIndex].status = status;
    this.orders[orderIndex].updatedAt = new Date();

    return this.orders[orderIndex];
  }

  cancel(id: number): Order {
    const orderIndex = this.orders.findIndex((order) => order.id === id);
    if (orderIndex === -1) {
      throw new NotFoundException(`订单ID ${id} 不存在`);
    }

    // 只有待付款或已付款的订单可以取消
    if (
      ![OrderStatus.PENDING, OrderStatus.PAID].includes(
        this.orders[orderIndex].status,
      )
    ) {
      throw new BadRequestException('只有待付款或已付款的订单可以取消');
    }

    this.orders[orderIndex].status = OrderStatus.CANCELLED;
    this.orders[orderIndex].updatedAt = new Date();

    return this.orders[orderIndex];
  }

  // 验证订单状态转换是否合法
  private validateStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ): void {
    const allowedTransitions = {
      [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!allowedTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `订单状态从 ${currentStatus} 到 ${newStatus} 的转换不允许`,
      );
    }
  }
}
