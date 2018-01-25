"use strict";

// Based on https://gist.github.com/jakearchibald/31b89cba627924972ad6
function spawn(generatorFunc)
{
  let generator = generatorFunc();
  let onFulfilled;
  let onRejected;

  function continuer(verb, arg)
  {
    let result;
    try
    {
      result = generator[verb](arg);
    }
    catch (err)
    {
      return Promise.reject(err);
    }
    if (result.done)
    {
      return result.value;
    }
    return Promise.resolve(result.value).then(onFulfilled, onRejected);
  }

  onFulfilled = continuer.bind(continuer, "next");
  onRejected = continuer.bind(continuer, "throw");
  return onFulfilled();
}
exports.spawn = spawn;
