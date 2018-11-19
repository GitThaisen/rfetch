/* global beforeAll, afterAll, afterEach, describe, expect, test */
/**
 * @jest-environment node
 */
import delay from '../common/delay.js'
import server from '../common/server.js'
import rfetch from '../../lib/index.js'

describe('fetch with retry for node', () => {
  beforeAll(async () => {
    try {
      await server.start(30003)
    } catch (err) {
      console.error(err)
      process.exit(1)
    }
  })

  afterAll(async () => {
    try {
      await server.stop()
    } catch (err) {
      console.error(err)
      process.exit(1)
    }
  })

  afterEach(() => {
    server.clearMocks()
  })

  test('Should have loaded the node-fetch implementation', () => {
    const keys = Object.keys(require.cache)
    const result = keys.find(key => /node_modules\/node-fetch/.test(key)) !== undefined
    expect(result).toBe(false)
  })

  test('Should fail after [signal error, 408, signal error, 503, signal error]', async (done) => {
    // Arrange
    const path = '/vary-responses-signal-408-signal-503-signal'
    const url = `${server.uri}${path}`
    const options = {}
    const errors = []
    const retryOptions = {
      resolveOn: 200,
      retries: 5,
      signalTimeout: 100,
      retryTimeout: 100,
      retryOn: [503, 408],
      errors
    }

    const expectedErrors = [
      'AbortError: The user aborted a request.',
      'RFetchError: Response.status: <503>, is in retryOn: <[503, 408]> status codes, attempt: <2> of: <5> retries, willRetry: <true>.',
      'AbortError: The user aborted a request.',
      'RFetchError: Response.status: <408>, is in retryOn: <[503, 408]> status codes, attempt: <4> of: <5> retries, willRetry: <true>.',
      'AbortError: The user aborted a request.'
    ]

    // Mock Responses
    server.mockRequestPathResponses(
      path,
      // signal (slow network)
      async () => {
        await delay(200)
        return {
          statusCode: 501,
          body: ''
        }
      },
      // service unavailable
      () => {
        return {
          statusCode: 503,
          body: ''
        }
      },
      // signal (slow network)
      async () => {
        await delay(200)
        return {
          statusCode: 503,
          body: ''
        }
      },
      // request timeout
      async () => {
        return {
          statusCode: 408,
          body: ''
        }
      },
      // ok
      async () => {
        await delay(200)
        return {
          statusCode: 200,
          body: 'OK'
        }
      }
    )

    // Act
    try {
      await rfetch(url, options, retryOptions)
    } catch (e) {
    // Assert
      const resultErrors = errors.map(err => err.toString())
      expect(resultErrors).toEqual(expectedErrors)
      done()
    }
  })

  test('Should succeed after [teapot (418), service unavailable (503), signal error] and finally 200 OK', async (done) => {
    // Arrange
    const path = '/vary-responses-418-503-signal-200'
    const url = `${server.uri}${path}`
    const options = {}
    const errors = []
    const retryOptions = {
      resolveOn: 200,
      retries: 5,
      signalTimeout: 100,
      retryTimeout: 100,
      retryOn: [418, 408, 503],
      errors
    }

    const expectedStatusCode = 200
    const expectedText = 'OK'
    const expectedErrors = [
      'RFetchError: Response.status: <418>, is in retryOn: <[418, 408, 503]> status codes, attempt: <1> of: <5> retries, willRetry: <true>.',
      'RFetchError: Response.status: <503>, is in retryOn: <[418, 408, 503]> status codes, attempt: <2> of: <5> retries, willRetry: <true>.',
      'AbortError: The user aborted a request.'
    ]

    // Mock Responses
    server.mockRequestPathResponses(
      path,
      // teapot
      () => {
        return {
          statusCode: 418,
          body: ''
        }
      },
      // service unavailable
      () => {
        return {
          statusCode: 503,
          body: ''
        }
      },
      // signal error
      async () => {
        await delay(200)
        return {
          statusCode: 408,
          body: ''
        }
      },
      // ok
      async () => {
        return {
          statusCode: 200,
          body: 'OK'
        }
      }
    )

    // Act
    const response = await rfetch(url, options, retryOptions)
    const text = await response.text()

    // Assert
    expect(text).toEqual(expectedText)
    expect(response.status).toEqual(expectedStatusCode)

    const resultErrors = errors.map(err => err.toString())
    expect(resultErrors).toEqual(expectedErrors)

    done()
  })
})
