
describe('Test dirscanner', function () {
  it('Load dirscanner', function () {
    return setGlobal('dirscanner', require('../dirscannercreator')(execlib));
  });
  it('Test for a non-existent dir', function () {
    return expect(dirscanner('blah'), 'blah').to.eventually.equal(false);
  });
});
