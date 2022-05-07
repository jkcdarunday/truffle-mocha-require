# truffle-mocha-require
A script that initializes Truffle's test environment so that you can use Mocha to run Truffle tests instead of using Truffle's builtin test tool.

This useful for when you want to use your IDE's builtin test runner to run tests and interpret test results.
An example of this is when using IntelliJ IDEA/Webstorm which currently does not have support for the Truffle test runner.

### Usage
#### Running
```
mocha --require truffle-mocha-require --delay  --exit
```

#### Configuration
Currently, only the ff. environment variables are supported:
* `TRUFFLE_NETWORK` - The network to use (default: development)



### Caveats
* This script currently does not yet have support for creating a temporary build directory so **it will use your current build directory**
* Solidity tests are not yet supported
* Not all global variables are immediately available in the test environment until the tests actually start executing
  * This means that you can't use things like web3 at the root level of your test scripts
  * `artifacts.require` is patched with a lazy loading proxy so you can use it at the root of your test scripts
* `--delay` is required because the initializer uses asynchronous functions
* `--exit` is required because the initializer seems to leave an unfulfilled promise
