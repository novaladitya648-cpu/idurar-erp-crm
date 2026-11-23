import currency from 'currency.js';

import { useSelector } from 'react-redux';
import storePersist from '@/redux/storePersist';

import { selectMoneyFormat } from '@/redux/settings/selectors';

const DEFAULT_IDR_FORMAT = {
  currency_symbol: 'Rp',
  currency_code: 'IDR',
  currency_position: 'before',
  decimal_sep: ',',
  thousand_sep: '.',
  cent_precision: 0,
  zero_format: true,
};

const useMoney = () => {
  const money_format_settings = useSelector(selectMoneyFormat);

  const persisted_settings =
    money_format_settings || storePersist.get('settings')?.money_format_settings || {};

  const money_format_state = {
    ...DEFAULT_IDR_FORMAT,
    ...persisted_settings,
    currency_symbol:
      !persisted_settings?.currency_symbol || persisted_settings?.currency_symbol === '$'
        ? 'Rp'
        : persisted_settings.currency_symbol,
    currency_code:
      !persisted_settings?.currency_code || persisted_settings?.currency_code === 'USD'
        ? 'IDR'
        : persisted_settings.currency_code,
    currency_position: persisted_settings?.currency_position || 'before',
    thousand_sep: persisted_settings?.thousand_sep || '.',
    decimal_sep: persisted_settings?.decimal_sep || ',',
    cent_precision:
      persisted_settings?.cent_precision !== undefined &&
        persisted_settings?.cent_precision !== null
        ? persisted_settings.cent_precision
        : 0,
  };

  function currencyFormat({ amount, currency_code = money_format_state?.currency_code }) {
    const numericAmount = Number(amount || 0);
    return currency(numericAmount, {
      separator: money_format_state.thousand_sep,
      decimal: money_format_state.decimal_sep,
      symbol: '',
      precision: money_format_state.cent_precision,
    }).format();
  }

  function moneyFormatter({ amount = 0, currency_code = money_format_state?.currency_code }) {
    const formatted = currencyFormat({ amount, currency_code });
    return money_format_state.currency_position === 'after'
      ? `${formatted} ${money_format_state.currency_symbol}`
      : `${money_format_state.currency_symbol} ${formatted}`;
  }

  function amountFormatter({ amount = 0, currency_code = money_format_state?.currency_code }) {
    return currencyFormat({ amount, currency_code });
  }

  function moneyRowFormatter({ amount = 0, currency_code = money_format_state?.currency_code }) {
    return {
      props: {
        style: {
          textAlign: 'right',
          whiteSpace: 'nowrap',
          direction: 'ltr',
        },
      },
      children: (
        <>
          {money_format_state.currency_position === 'after'
            ? `${currencyFormat({ amount, currency_code })} ${money_format_state.currency_symbol}`
            : `${money_format_state.currency_symbol} ${currencyFormat({ amount, currency_code })}`}
        </>
      ),
    };
  }

  return {
    moneyRowFormatter,
    moneyFormatter,
    amountFormatter,
    currency_symbol: money_format_state.currency_symbol,
    currency_code: money_format_state.currency_code,
    currency_position: money_format_state.currency_position,
    decimal_sep: money_format_state.decimal_sep,
    thousand_sep: money_format_state.thousand_sep,
    cent_precision: money_format_state.cent_precision,
    zero_format: money_format_state.zero_format,
  };
};

export default useMoney;