import logger from '../utils/logger';

const SLIPPAGE_API_BASE_URL = 'https://web-production-97230.up.railway.app';

export interface SlippageRequest {
  symbol: string; // e.g., "BTC/USDT", "ETH/USDT"
  amount: number; // Amount in cryptocurrency
  side: 'buy' | 'sell';
  exchanges?: string[]; // Optional: specific exchanges to compare
}

export interface SlippageQuote {
  exchange: string;
  quote_price: number;
  predicted_slippage_pct: number;
  total_cost: number;
  fees: {
    trading_fee: number;
    slippage_cost: number;
  };
}

export interface SlippageResponse {
  best_venue: string;
  quotes: SlippageQuote[];
}

class SlippageService {
  /**
   * Get slippage predictions for all exchanges
   */
  async getPredictions(request: SlippageRequest): Promise<SlippageResponse> {
    try {
      logger.info('Slippage: Fetching predictions', {
        symbol: request.symbol,
        amount: request.amount,
        side: request.side,
      });

      const response = await fetch(`${SLIPPAGE_API_BASE_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: request.symbol,
          amount: request.amount,
          side: request.side,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Slippage API error', {
          status: response.status,
          error: errorText,
        });
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      logger.info('Slippage: Predictions received', {
        bestVenue: data.best_venue,
        quotesCount: data.quotes?.length || 0,
      });

      return data;
    } catch (error) {
      logger.error('Slippage: Failed to get predictions', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Compare specific exchanges
   */
  async compareExchanges(request: SlippageRequest): Promise<SlippageResponse> {
    try {
      if (!request.exchanges || request.exchanges.length === 0) {
        // If no specific exchanges, get all
        return this.getPredictions(request);
      }

      logger.info('Slippage: Comparing exchanges', {
        symbol: request.symbol,
        amount: request.amount,
        side: request.side,
        exchanges: request.exchanges,
      });

      const response = await fetch(`${SLIPPAGE_API_BASE_URL}/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: request.symbol,
          amount: request.amount,
          side: request.side,
          exchanges: request.exchanges,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Slippage API error', {
          status: response.status,
          error: errorText,
        });
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      logger.info('Slippage: Comparison received', {
        bestVenue: data.best_venue,
        quotesCount: data.quotes?.length || 0,
      });

      return data;
    } catch (error) {
      logger.error('Slippage: Failed to compare exchanges', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Format response for AI explanation
   */
  formatResponseForAI(response: SlippageResponse, request: SlippageRequest): string {
    const { best_venue, quotes } = response;
    const { symbol, amount, side } = request;

    let formatted = `📊 **Hasil Perbandingan Exchange untuk ${symbol}**\n\n`;
    formatted += `**Detail Transaksi:**\n`;
    formatted += `- Jumlah: ${amount} ${symbol.split('/')[0]}\n`;
    formatted += `- Aksi: ${side === 'buy' ? 'Beli' : 'Jual'}\n`;
    formatted += `- Exchange Terbaik: **${best_venue.toUpperCase()}**\n\n`;

    formatted += `**Perbandingan Detail:**\n\n`;
    
    // Sort by total_cost (ascending - cheapest first)
    const sortedQuotes = [...quotes].sort((a, b) => a.total_cost - b.total_cost);

    sortedQuotes.forEach((quote, index) => {
      const isBest = quote.exchange === best_venue;
      const rank = index + 1;
      
      formatted += `${rank}. **${quote.exchange.toUpperCase()}**${isBest ? ' ⭐ (TERBAIK)' : ''}\n`;
      formatted += `   - Harga Quote: $${quote.quote_price.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      formatted += `   - Prediksi Slippage: ${quote.predicted_slippage_pct.toFixed(2)}%\n`;
      formatted += `   - Trading Fee: $${quote.fees.trading_fee.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      formatted += `   - Slippage Cost: $${quote.fees.slippage_cost.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      formatted += `   - **Total Cost: $${quote.total_cost.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**\n\n`;
    });

    return formatted;
  }

  /**
   * Format as table for structured display
   */
  formatAsTable(response: SlippageResponse): string {
    const { quotes } = response;
    
    // Sort by total_cost
    const sortedQuotes = [...quotes].sort((a, b) => a.total_cost - b.total_cost);

    // Create markdown table
    let table = '| Exchange | Harga Quote | Slippage | Trading Fee | Slippage Cost | Total Cost |\n';
    table += '|----------|-------------|----------|-------------|---------------|-----------|\n';

    sortedQuotes.forEach((quote) => {
      const isBest = quote.exchange === response.best_venue;
      const exchangeName = isBest ? `**${quote.exchange.toUpperCase()} ⭐**` : quote.exchange.toUpperCase();
      
      table += `| ${exchangeName} | $${quote.quote_price.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | ${quote.predicted_slippage_pct.toFixed(2)}% | $${quote.fees.trading_fee.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | $${quote.fees.slippage_cost.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | **$${quote.total_cost.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** |\n`;
    });

    return table;
  }
}

export default new SlippageService();

