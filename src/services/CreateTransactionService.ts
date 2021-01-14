import { getRepository, Repository, getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  private async createCategory(
    title: string,
    repository: Repository<Category>,
  ): Promise<Category> {
    const category = repository.create({
      title,
    });

    await repository.save(category);

    return category;
  }

  public async execute(
    { title, value, type, category }: Request,
    validateBalance = true,
  ): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    if (type === 'outcome' && validateBalance)
      if (await transactionRepository.checkBalanceForOutcome(value))
        throw new AppError('Insufficient balance to create this transaction.');

    let transactionCategory = await categoryRepository.findOne({
      where: { title: category },
    });

    if (!transactionCategory)
      transactionCategory = await this.createCategory(
        category,
        categoryRepository,
      );

    const transaction = transactionRepository.create({
      title,
      value,
      type,
      category_id: transactionCategory.id,
    });

    await transactionRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
