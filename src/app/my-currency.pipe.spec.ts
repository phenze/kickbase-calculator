import { MyCurrencyPipe } from './my-currency.pipe';

describe('MyCurrencyPipe', () => {
  it('create an instance', () => {
    const pipe = new MyCurrencyPipe();
    expect(pipe).toBeTruthy();
  });
});
