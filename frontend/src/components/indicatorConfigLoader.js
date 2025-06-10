import ema from '../../../indicator_config/ema.json';
import rsi from '../../../indicator_config/rsi.json';
import macd from '../../../indicator_config/macd.json';

export async function loadAllIndicatorConfigs() {
  return { ema, rsi, macd };
}