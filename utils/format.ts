export function formatNumber(value: number, options: {
  prefix?: string,
  suffix?: string,
  decimals?: number,
  compact?: boolean,
  percentage?: boolean,
  alreadyPercentage?: boolean
} = {}) {
  const { 
    prefix = '', 
    suffix = '',
    decimals = 2,
    compact = false,
    percentage = false,
    alreadyPercentage = false
  } = options

  let formattedValue = value
  
  if (percentage) {
    // If the value is already a percentage (like from DexScreener), don't multiply by 100
    formattedValue = alreadyPercentage ? value : value * 100
    return prefix + new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(formattedValue) + '%'
  }

  if (compact) {
    if (value >= 1e9) return prefix + Math.round(value / 1e9) + 'B' + suffix
    if (value >= 1e6) return prefix + Math.round(value / 1e6) + 'M' + suffix
    if (value >= 1e3) return prefix + Math.round(value / 1e3) + 'K' + suffix
  }

  // For very small numbers (like crypto prices)
  if (value < 0.001) {
    return prefix + value.toFixed(7) + suffix
  }

  return prefix + new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value) + suffix
}

export function formatPrice(value: number) {
  return formatNumber(value, { prefix: '$', decimals: 4 })
}

export function formatHexRatio(value: number) {
  return formatNumber(value, { decimals: 2 })
}

export function formatBacking(value: number) {
  return formatNumber(value, { decimals: 2, compact: true })
}

export function formatPercent(value: number, opts: { alreadyPercentage?: boolean } = {}) {
  const decimals = Math.abs(value) >= 100 ? 0 : 1;
  const sign = value > 0 ? '+' : '';
  return sign + formatNumber(value, {
    decimals,
    percentage: true,
    alreadyPercentage: opts.alreadyPercentage ?? true
  });
}

export function formatPriceSigFig(price: number, sigFigs = 3): string {
  if (price === 0) return '$0.00';
  // Use toPrecision for significant digits, then remove trailing zeros after decimal
  let str = price.toPrecision(sigFigs);
  // If the number is in exponential notation, convert to fixed
  if (str.includes('e')) {
    str = price.toFixed(sigFigs - 1);
  }
  // Remove trailing zeros after decimal, but keep at least 2 decimals for small numbers
  if (str.includes('.')) {
    str = str.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
    if (parseFloat(str) < 1) {
      // For small numbers, pad to at least 3 decimals
      const [int, dec = ''] = str.split('.');
      str = int + '.' + dec.padEnd(3, '0');
    }
  }
  return '$' + str;
}