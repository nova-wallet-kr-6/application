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
     * Format response for AI explanation - Plain text friendly, mobile-optimized
     * NO MARKDOWN - karena frontend tidak parse markdown
     */
    formatResponseForAI(response: SlippageResponse, request: SlippageRequest): string {
        const { best_venue, quotes } = response;
        const { symbol, amount, side } = request;

        // Sort by total_cost (ascending - cheapest first)
        const sortedQuotes = [...quotes].sort((a, b) => a.total_cost - b.total_cost);
        const bestQuote = sortedQuotes[0];
        const worstQuote = sortedQuotes[sortedQuotes.length - 1];
        const savings = worstQuote.total_cost - bestQuote.total_cost;

        // Helper untuk format angka besar dengan lebih readable
        const formatLargeNumber = (num: number): string => {
            if (num >= 1000000) {
                // Untuk jutaan, tampilkan dengan 2 desimal + M
                const millions = num / 1000000;
                return `$${millions.toFixed(2)}M`;
            } else if (num >= 1000) {
                // Untuk ribuan, tampilkan dengan 2 desimal + K
                const thousands = num / 1000;
                return `$${thousands.toFixed(2)}K`;
            }
            // Untuk angka kecil, tampilkan dengan 2 desimal
            return `$${num.toFixed(2)}`;
        };

        // Helper untuk format angka dengan separator (untuk detail)
        const formatWithSeparator = (num: number): string => {
            return `$${num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        };

        // Format dengan markdown yang bagus - frontend akan render dengan react-markdown
        let formatted = `📊 **Hasil Perbandingan Exchange**\n\n`;
        formatted += `**Transaksi:** ${side === 'buy' ? 'Beli' : 'Jual'} ${amount} ${symbol.split('/')[0]}\n\n`;

        // Summary box dengan highlight
        formatted += `---\n\n`;
        formatted += `⭐ **REKOMENDASI: ${best_venue.toUpperCase()}**\n\n`;
        formatted += `💰 **Total Biaya:** ${formatLargeNumber(bestQuote.total_cost)}\n`;
        if (savings > 100) {
            formatted += `💵 **Hemat:** ${formatLargeNumber(savings)} vs ${worstQuote.exchange.toUpperCase()}\n`;
        }
        formatted += `\n---\n\n`;

        // Format per exchange - card style dengan markdown
        formatted += `**Perbandingan Semua Exchange:**\n\n`;

        sortedQuotes.forEach((quote, index) => {
            const isBest = quote.exchange === best_venue;

            // Exchange card dengan markdown
            formatted += `${isBest ? '⭐' : `${index + 1}.`} **${quote.exchange.toUpperCase()}**${isBest ? ' (TERBAIK)' : ''}\n\n`;
            formatted += `   💰 **TOTAL:** ${formatLargeNumber(quote.total_cost)}\n`;
            formatted += `   📈 Harga: ${formatLargeNumber(quote.quote_price)}\n`;
            formatted += `   📊 Slippage: ${quote.predicted_slippage_pct.toFixed(2)}%\n`;
            formatted += `   💸 Total Fee: ${formatLargeNumber(quote.fees.trading_fee + quote.fees.slippage_cost)}\n`;

            // Spacing antar exchange
            if (index < sortedQuotes.length - 1) {
                formatted += `\n`;
            }
        });

        return formatted;
    }

    /**
     * Format as compact summary (for AI to use, not displayed directly)
     */
    formatAsTable(response: SlippageResponse): string {
        const { quotes } = response;

        // Sort by total_cost
        const sortedQuotes = [...quotes].sort((a, b) => a.total_cost - b.total_cost);

        // Simple summary format
        let summary = '\n**Ringkasan:**\n\n';

        sortedQuotes.forEach((quote, index) => {
            const isBest = quote.exchange === response.best_venue;
            summary += `${isBest ? '⭐' : `${index + 1}.`} ${quote.exchange.toUpperCase()}: $${quote.total_cost.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        });

        return summary;
    }
}

export default new SlippageService();

