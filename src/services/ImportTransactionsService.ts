import path from 'path';
import fs from 'fs';
import csvParse from 'csv-parse';
import { getRepository, In } from 'typeorm';

import uploadConfig from '../config/upload';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface CSVfields {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

interface NewTransaction {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category_id: string;
}

class ImportTransactionsService {
  private getParseCSV(filePath: string): csvParse.Parser {
    const readStream = fs.createReadStream(filePath);
    const parseStream = csvParse({
      from_line: 2,
    });

    return readStream.pipe(parseStream);
  }

  private async getTransactionCSVArray(
    parseCSV: csvParse.Parser,
  ): Promise<CSVfields[]> {
    const transactions = [] as CSVfields[];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((field: string) => {
        return field.trim();
      });

      transactions.push({
        title,
        value,
        type,
        category,
      });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    return transactions;
  }

  public async execute(filename: string): Promise<Transaction[]> {
    const filePath = path.join(uploadConfig.directory, filename);

    const parseCSV = this.getParseCSV(filePath);
    const transactions = await this.getTransactionCSVArray(parseCSV);

    const categoryRepository = getRepository(Category);
    const transactionRepository = getRepository(Transaction);

    const existentCategories = await categoryRepository.find({
      title: In(transactions.map(transaction => transaction.category)),
    });

    const categoriesTitles = transactions
      .map(transaction => transaction.category)
      .filter(
        categoryTitle =>
          !existentCategories
            .map(category => category.title)
            .includes(categoryTitle),
      )
      .filter((value, index, self) => self.indexOf(value) === index);

    const newTitles: { title: string }[] = categoriesTitles.map(category => {
      return {
        title: category,
      };
    });

    const newCategories = categoryRepository.create(newTitles);
    await categoryRepository.save(newCategories);

    existentCategories.push.apply(newCategories);

    const fileTransactions: NewTransaction[] = transactions.map(transaction => {
      return {
        title: transaction.title,
        value: transaction.value,
        type: transaction.type,
        category_id: existentCategories.find(
          category => category.title === transaction.category,
        )?.id as string,
      };
    });

    const newTransactions = transactionRepository.create(fileTransactions);
    await transactionRepository.save(newTransactions);

    await fs.promises.unlink(filePath);

    return newTransactions;
  }
}

export default ImportTransactionsService;
