import { getRepository } from 'typeorm';

import Transaction from '../models/Transaction';

class DeleteTransactionService {
  public async execute(transaction_id: string): Promise<void> {
    const transactionRepository = getRepository(Transaction);
    await transactionRepository.delete(transaction_id);
  }
}

export default DeleteTransactionService;
