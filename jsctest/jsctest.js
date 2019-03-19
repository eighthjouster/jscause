'use strict';

let onCompletion;
const start = (jscLib, onCompletionCb) =>
{
  console.log('Testing started.');
  onCompletion = onCompletionCb;

  console.log(jscLib);

  if (typeof(onCompletion) === 'function')
  {
    onCompletion();
  }
};

module.exports =
{
  start
};
