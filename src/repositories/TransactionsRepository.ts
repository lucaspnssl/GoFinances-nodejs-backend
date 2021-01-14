import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async checkBalanceForOutcome(outcomeValue: number): Promise<boolean> {
    return (await this.getBalance()).total < outcomeValue;
  }

  public async getBalance(): Promise<Balance> {
    const { income, outcome } = (await this.find()).reduce(
      (accumulator, currentTransaction) => {
        if (currentTransaction.type === 'income') {
          accumulator.income += Number(currentTransaction.value);
        } else {
          accumulator.outcome += Number(currentTransaction.value);
        }

        return accumulator;
      },
      {
        income: 0,
        outcome: 0,
      },
    );

    return {
      income,
      outcome,
      total: income - outcome,
    };
  }
}

export default TransactionsRepository;
