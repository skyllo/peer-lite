import { EventEmitter } from '../src/emitter';

test('emitter can add and remove listeners', () => {
  const spyFunc = jest.fn();
  const emitter = new EventEmitter();
  emitter.on('eventName', spyFunc);
  emitter.emit('eventName');
  expect(spyFunc).toBeCalledTimes(1);

  spyFunc.mockClear();

  const spyFunc2 = jest.fn();
  emitter.on('eventName', spyFunc2);
  emitter.emit('eventName');
  expect(spyFunc).toBeCalledTimes(1);
  expect(spyFunc2).toBeCalledTimes(1);

  spyFunc.mockClear();
  spyFunc2.mockClear();

  emitter.off('eventName', spyFunc2);
  emitter.emit('eventName');
  expect(spyFunc).toBeCalledTimes(1);
  expect(spyFunc2).toBeCalledTimes(0);
});

test('emitter can remove multiple listeners', () => {
  const spyFunc = jest.fn();
  const emitter = new EventEmitter();
  emitter.on('eventName', spyFunc);
  emitter.offAll('eventName');
  emitter.emit('eventName');
  expect(spyFunc).toBeCalledTimes(0);

  spyFunc.mockClear();

  emitter.on('eventName', spyFunc);
  emitter.offAll();
  emitter.emit('eventName');
  expect(spyFunc).toBeCalledTimes(0);
});
