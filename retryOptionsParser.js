const parser = require('./util/parser')

const defaultRetryOptions = {
  maxRetries: 3,
  timeout: 100,
  statusCodes: [ 200 ],
  retryStatusCodes: [ ]
}

/**
 * Parse Retry Options
 *
 * @param {Object} options
 * @param {Number} [options.maxRetries = 3] The number of retries
 * @param {Number} [options.timeout = 100] The number of timeout in ms before next retry
 * @param {Number[]} [options.statusCodes = [200]] The status codes to retry for if the status code is not expected
 * @returns
 */
function parse (options = {}) {
  if (!options || Array.isArray(options)) {
    return Object.assign({}, defaultRetryOptions)
  }

  const parsedOptions = options || {}

  for (const key of ['maxRetries', 'timeout']) {
    parsedOptions[key] =
      parser.parseInteger(options[key]) || defaultRetryOptions[key]
  }

  for (const key of ['statusCodes', 'retryStatusCodes']) {
    parsedOptions[key] =
      parser.parseIntegerArray(options[key]) || defaultRetryOptions[key]
  }

  return parsedOptions
}

module.exports = {
  defaultRetryOptions,
  parse
}
