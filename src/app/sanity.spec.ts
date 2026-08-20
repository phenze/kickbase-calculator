describe('Sanity Check', () => {
  it('sollte einfache Mathematik korrekt ausfuehren', () => {
    expect(1 + 1).toBe(2);
  });

  it('sollte Strings vergleichen koennen', () => {
    expect('hallo').toEqual('hallo');
  });
});