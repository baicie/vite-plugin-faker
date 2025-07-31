import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateProductDto,
  ProductFilterDto,
  UpdateProductDto,
} from './dto/product.dto';
import type { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  private products: Product[] = [
    {
      id: 1,
      name: 'iPhone 14',
      price: 5999,
      category: '手机',
      description: 'Apple最新款手机',
      stock: 100,
      createdAt: new Date(),
    },
    {
      id: 2,
      name: 'MacBook Pro',
      price: 12999,
      category: '电脑',
      description: '专业人士的首选',
      stock: 50,
      createdAt: new Date(),
    },
    {
      id: 3,
      name: 'iPad Air',
      price: 4399,
      category: '平板',
      description: '轻薄强大的平板电脑',
      stock: 75,
      createdAt: new Date(),
    },
  ];

  findAll(filter: ProductFilterDto) {
    let filteredProducts = [...this.products];

    if (filter.category) {
      filteredProducts = filteredProducts.filter(
        (product) => product.category === filter.category,
      );
    }

    if (filter.minPrice) {
      filteredProducts = filteredProducts.filter(
        (product) => product.price >= filter.minPrice,
      );
    }

    if (filter.maxPrice) {
      filteredProducts = filteredProducts.filter(
        (product) => product.price <= filter.maxPrice,
      );
    }

    // 计算分页
    const total = filteredProducts.length;
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;

    const data = filteredProducts.slice(skip, skip + limit);

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

  findById(id: number): Product {
    const product = this.products.find((product) => product.id === id);
    if (!product) {
      throw new NotFoundException(`商品ID ${id} 不存在`);
    }
    return product;
  }

  create(createProductDto: CreateProductDto): Product {
    const newId =
      this.products.length > 0
        ? Math.max(...this.products.map((p) => p.id)) + 1
        : 1;

    const newProduct: Product = {
      id: newId,
      ...createProductDto,
      createdAt: new Date(),
    };

    this.products.push(newProduct);
    return newProduct;
  }

  update(id: number, updateProductDto: UpdateProductDto): Product {
    const productIndex = this.products.findIndex(
      (product) => product.id === id,
    );
    if (productIndex === -1) {
      throw new NotFoundException(`商品ID ${id} 不存在`);
    }

    this.products[productIndex] = {
      ...this.products[productIndex],
      ...updateProductDto,
    };

    return this.products[productIndex];
  }

  remove(id: number): { success: boolean } {
    const productIndex = this.products.findIndex(
      (product) => product.id === id,
    );
    if (productIndex === -1) {
      throw new NotFoundException(`商品ID ${id} 不存在`);
    }

    this.products.splice(productIndex, 1);
    return { success: true };
  }
}
