import { isAddress, getAddress } from 'viem';
import logger from '../utils/logger';

// Types
export interface ValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
  recommendations: string[];
}

export interface TransactionParams {
  fromAddress: string;
  toAddress: string;
  amount: number;
  chainId: number;
  tokenSymbol?: string;
  currentBalance?: number;
  gasEstimate?: number;
}

export interface GuardianResult extends ValidationResult {
  requiresDoubleConfirm: boolean;
  amountUSD?: number;
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

// Chain metadata
const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum Mainnet',
  137: 'Polygon',
  10: 'Optimism',
  42161: 'Arbitrum',
  8453: 'Base',
  4202: 'Lisk Sepolia',
};

class GuardianService {
  /**
   * Validate Ethereum address format and checksum
   */
  validateAddress(address: string, chainId: number): ValidationResult {
    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    logger.info('Guardian: Validating address', { address, chainId });

    // 1. Format validation
    if (!address || typeof address !== 'string') {
      issues.push('Alamat tidak valid: format tidak dikenali.');
      return { valid: false, issues, warnings, recommendations };
    }

    if (!isAddress(address)) {
      issues.push(
        'Format alamat tidak valid. Pastikan formatnya 0x... dengan 40 karakter hexadecimal.'
      );
      return { valid: false, issues, warnings, recommendations };
    }

    // 2. Checksum validation (EIP-55)
    try {
      const checksummedAddress = getAddress(address);

      // Check if the provided address matches the checksummed version
      const isAllLower = address === address.toLowerCase();
      const isAllUpper = address === address.toUpperCase();
      const isMixedCase = !isAllLower && !isAllUpper;

      if (checksummedAddress !== address) {
        // Only warn if address is clearly not checksummed:
        // - All lowercase (common when copy-pasting from some sources)
        // - All uppercase (rare but possible)
        // - Mixed case but wrong (likely typo - important to warn)

        // For all lowercase, show a softer warning (might be from MetaMask export or other valid source)
        if (isAllLower) {
          warnings.push(
            `Alamat menggunakan format lowercase. Untuk keamanan ekstra, gunakan format checksum: ${checksummedAddress}`
          );
          recommendations.push(
            'Format checksum membantu mencegah typo. Alamat lowercase tetap valid, tapi checksum lebih aman.'
          );
        } else if (isAllUpper) {
          // All uppercase is unusual - warn
          warnings.push(
            `Alamat menggunakan format uppercase. Untuk keamanan, gunakan format checksum: ${checksummedAddress}`
          );
        } else if (isMixedCase) {
          // Mixed case but wrong checksum - likely typo, important warning
          warnings.push(
            `Alamat memiliki checksum yang tidak sesuai. Format yang benar: ${checksummedAddress}`
          );
          recommendations.push(
            'Periksa kembali alamat - mungkin ada typo. Checksum yang salah bisa berarti alamat salah.'
          );
        }
      } else {
        // Address is already properly checksummed - no warning needed
        logger.info('Guardian: Address is properly checksummed', { address });
      }
    } catch (error) {
      // This shouldn't happen if isAddress passed, but handle it anyway
      issues.push('Alamat gagal validasi checksum. Periksa kembali alamat yang dimasukkan.');
      logger.error('Guardian: Checksum validation failed', { address, error });
      return { valid: false, issues, warnings, recommendations };
    }

    // 3. Zero address check
    if (address.toLowerCase() === '0x0000000000000000000000000000000000000000') {
      issues.push('Alamat nol (0x000...000) tidak valid untuk transaksi. Ini akan membakar token Anda.');
      return { valid: false, issues, warnings, recommendations };
    }

    // 4. Same address check (will be done in comprehensive check with fromAddress)

    logger.info('Guardian: Address validation passed', {
      address,
      hasWarnings: warnings.length > 0
    });

    return {
      valid: true,
      issues,
      warnings,
      recommendations,
    };
  }

  /**
   * Check network compatibility and potential cross-chain issues
   */
  checkNetworkCompatibility(
    fromChainId: number,
    toAddress: string,
    tokenSymbol?: string
  ): ValidationResult {
    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const chainName = CHAIN_NAMES[fromChainId] || `Chain ${fromChainId}`;

    logger.info('Guardian: Checking network compatibility', {
      fromChainId,
      toAddress,
      tokenSymbol,
    });

    // 1. General cross-chain warning
    // Note: We can't reliably detect the target chain from just an address
    // since addresses are the same format across EVM chains
    // So we provide a general warning
    warnings.push(
      `Pastikan penerima menggunakan alamat yang sama di ${chainName}. ` +
      `Alamat Ethereum sama di semua EVM chains, tapi jika penerima tidak memiliki akses ke chain ini, dana tidak bisa diakses.`
    );

    // 2. Token-specific warnings
    if (tokenSymbol && tokenSymbol !== 'ETH' && tokenSymbol !== 'LSK') {
      // This is for future ERC-20 support
      warnings.push(
        `Token ${tokenSymbol} di ${chainName} adalah kontrak spesifik untuk chain ini. ` +
        `Pastikan penerima dapat menerima ${tokenSymbol} di ${chainName}.`
      );
    }

    // 3. L2 specific warnings
    const l2Chains = [137, 10, 42161, 8453]; // Polygon, Optimism, Arbitrum, Base
    if (l2Chains.includes(fromChainId)) {
      recommendations.push(
        `Anda mengirim di ${chainName} (Layer 2). Pastikan penerima memiliki akses ke chain ini.`
      );
    }

    // 4. Testnet warning
    if (fromChainId === 4202) {
      warnings.push(
        '⚠️ Anda mengirim di Lisk Sepolia (testnet). Token ini tidak memiliki nilai real.'
      );
    }

    logger.info('Guardian: Network compatibility check completed', {
      warningsCount: warnings.length,
    });

    return {
      valid: true, // Network compatibility doesn't block transaction
      issues,
      warnings,
      recommendations,
    };
  }

  /**
   * Validate balance sufficiency including gas buffer
   */
  validateBalance(
    balance: number,
    amount: number,
    gasEstimate: number,
    tokenSymbol: string
  ): ValidationResult {
    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    logger.info('Guardian: Validating balance', {
      balance,
      amount,
      gasEstimate,
      tokenSymbol,
    });

    // 1. Calculate total needed with 15% gas buffer
    const gasBuffer = gasEstimate * 0.15;
    const totalNeeded = amount + gasEstimate + gasBuffer;

    // 2. Check sufficient balance
    if (balance < totalNeeded) {
      const shortfall = totalNeeded - balance;
      issues.push(
        `Saldo tidak cukup. Diperlukan: ${totalNeeded.toFixed(6)} ${tokenSymbol} ` +
        `(termasuk gas + buffer), saldo Anda: ${balance.toFixed(6)} ${tokenSymbol}. ` +
        `Kekurangan: ${shortfall.toFixed(6)} ${tokenSymbol}.`
      );

      recommendations.push(
        'Top up wallet Anda atau kurangi jumlah yang dikirim.'
      );

      return { valid: false, issues, warnings, recommendations };
    }

    // 3. Low balance warning
    const remainingBalance = balance - totalNeeded;
    const lowBalanceThreshold = 0.01; // 0.01 ETH or equivalent

    if (remainingBalance < lowBalanceThreshold && remainingBalance >= 0) {
      warnings.push(
        `Setelah transaksi, saldo Anda akan tersisa ${remainingBalance.toFixed(6)} ${tokenSymbol}. ` +
        `Ini mungkin tidak cukup untuk transaksi berikutnya.`
      );
      recommendations.push(
        'Pertimbangkan untuk menyisakan lebih banyak saldo untuk gas fee transaksi berikutnya.'
      );
    }

    // 4. Very low remaining balance (critical warning)
    if (remainingBalance < 0.001 && remainingBalance >= 0) {
      warnings.push(
        `⚠️ PERINGATAN: Saldo tersisa sangat sedikit (${remainingBalance.toFixed(8)} ${tokenSymbol}). ` +
        `Anda mungkin tidak bisa melakukan transaksi lagi tanpa top up.`
      );
    }

    logger.info('Guardian: Balance validation passed', {
      remainingBalance,
      hasWarnings: warnings.length > 0,
    });

    return {
      valid: true,
      issues,
      warnings,
      recommendations,
    };
  }

  /**
   * Validate transaction amount (check for large amounts, potential typos)
   */
  validateAmount(
    amount: number,
    tokenSymbol: string,
    balance: number
  ): ValidationResult & { requiresDoubleConfirm: boolean } {
    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let requiresDoubleConfirm = false;

    logger.info('Guardian: Validating amount', { amount, tokenSymbol, balance });

    // 1. Zero or negative amount
    if (amount <= 0) {
      issues.push('Jumlah harus lebih besar dari 0.');
      return { valid: false, issues, warnings, recommendations, requiresDoubleConfirm };
    }

    // 2. Very small amount (dust)
    if (amount < 0.000001) {
      warnings.push(
        'Jumlah sangat kecil (dust). Pastikan ini yang Anda maksud.'
      );
    }

    // 3. Sending entire balance (potential mistake)
    const percentageOfBalance = (amount / balance) * 100;

    if (percentageOfBalance > 95) {
      warnings.push(
        `Anda mengirim ${percentageOfBalance.toFixed(1)}% dari total saldo Anda. ` +
        `Pastikan Anda menyisakan cukup untuk gas fee.`
      );
      requiresDoubleConfirm = true;
    }

    // 4. Large amount (>50% of balance)
    if (percentageOfBalance > 50 && percentageOfBalance <= 95) {
      warnings.push(
        `Anda mengirim ${percentageOfBalance.toFixed(1)}% dari saldo Anda. Pastikan ini sudah benar.`
      );
    }

    // 5. Very large absolute amount
    if (amount > 10 && (tokenSymbol === 'ETH' || tokenSymbol === 'LSK')) {
      warnings.push(
        `Transaksi besar: ${amount} ${tokenSymbol}. Periksa kembali semua detail sebelum melanjutkan.`
      );
      requiresDoubleConfirm = true;
      recommendations.push(
        'Untuk transaksi besar, pertimbangkan untuk membagi menjadi beberapa transaksi lebih kecil.'
      );
    }

    // 6. Round number check (potential typo)
    // e.g., 100 ETH instead of 1.00 ETH
    if (amount >= 100 && amount % 10 === 0) {
      warnings.push(
        `Jumlah ${amount} ${tokenSymbol} adalah angka bulat besar. ` +
        `Pastikan bukan typo (misal: ${amount / 100} ${tokenSymbol})?`
      );
      requiresDoubleConfirm = true;
    }

    logger.info('Guardian: Amount validation completed', {
      requiresDoubleConfirm,
      warningsCount: warnings.length,
    });

    return {
      valid: true,
      issues,
      warnings,
      recommendations,
      requiresDoubleConfirm,
    };
  }

  /**
   * Comprehensive transaction validation
   * Combines all validation checks
   */
  async validateTransaction(params: TransactionParams): Promise<GuardianResult> {
    const {
      fromAddress,
      toAddress,
      amount,
      chainId,
      tokenSymbol = 'ETH',
      currentBalance = 0,
      gasEstimate = 0,
    } = params;

    logger.info('Guardian: Starting comprehensive validation', params);

    const allIssues: string[] = [];
    const allWarnings: string[] = [];
    const allRecommendations: string[] = [];
    let requiresDoubleConfirm = false;
    let severity: GuardianResult['severity'] = 'none';

    // 1. Validate sender address (fromAddress)
    const fromAddressValidation = this.validateAddress(fromAddress, chainId);
    if (!fromAddressValidation.valid) {
      allIssues.push(...fromAddressValidation.issues);
      severity = 'critical';
    }
    allWarnings.push(...fromAddressValidation.warnings);
    allRecommendations.push(...fromAddressValidation.recommendations);

    // 2. Validate recipient address (toAddress)
    const toAddressValidation = this.validateAddress(toAddress, chainId);
    if (!toAddressValidation.valid) {
      allIssues.push(...toAddressValidation.issues);
      severity = 'critical';
    }
    allWarnings.push(...toAddressValidation.warnings);
    allRecommendations.push(...toAddressValidation.recommendations);

    // 3. Check if sending to self
    if (fromAddress.toLowerCase() === toAddress.toLowerCase()) {
      allWarnings.push(
        'Anda mengirim ke alamat Anda sendiri. Ini akan membuang gas fee tanpa efek.'
      );
      severity = severity === 'none' ? 'low' : severity;
    }

    // 4. Network compatibility check
    const networkCheck = this.checkNetworkCompatibility(
      chainId,
      toAddress,
      tokenSymbol
    );
    allWarnings.push(...networkCheck.warnings);
    allRecommendations.push(...networkCheck.recommendations);

    // 5. Balance validation
    if (currentBalance > 0 && gasEstimate > 0) {
      const balanceValidation = this.validateBalance(
        currentBalance,
        amount,
        gasEstimate,
        tokenSymbol
      );
      if (!balanceValidation.valid) {
        allIssues.push(...balanceValidation.issues);
        severity = 'critical';
      }
      allWarnings.push(...balanceValidation.warnings);
      allRecommendations.push(...balanceValidation.recommendations);
    }

    // 6. Amount validation
    if (currentBalance > 0) {
      const amountValidation = this.validateAmount(amount, tokenSymbol, currentBalance);
      allWarnings.push(...amountValidation.warnings);
      allRecommendations.push(...amountValidation.recommendations);
      requiresDoubleConfirm = requiresDoubleConfirm || amountValidation.requiresDoubleConfirm;

      if (amountValidation.warnings.length > 0) {
        severity = severity === 'none' ? 'medium' : severity;
      }
    }

    // 7. Determine final severity
    if (allIssues.length > 0) {
      severity = 'critical';
    } else if (requiresDoubleConfirm) {
      severity = severity === 'critical' ? 'critical' : 'high';
    } else if (allWarnings.length > 0) {
      severity = severity === 'none' ? 'medium' : severity;
    }

    const result: GuardianResult = {
      valid: allIssues.length === 0,
      issues: allIssues,
      warnings: allWarnings,
      recommendations: allRecommendations,
      requiresDoubleConfirm,
      severity,
    };

    logger.info('Guardian: Validation completed', {
      valid: result.valid,
      issuesCount: allIssues.length,
      warningsCount: allWarnings.length,
      severity,
      requiresDoubleConfirm,
    });

    return result;
  }
}

export default new GuardianService();
