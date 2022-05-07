/* eslint-disable import/no-extraneous-dependencies */

const { Web3Shim, createInterfaceAdapter } = require('@truffle/interface-adapter');
const Config = require('@truffle/config');
const Resolver = require('@truffle/resolver');
const Codec = require('@truffle/codec');
const debug = require('debug')('lib:test');
const Debugger = require('@truffle/debugger');
const mocha = require('mocha');
const TestRunner = require('@truffle/core/lib/testing/TestRunner');
const Test = require('@truffle/core/lib/testing/Test');

const config = Config.default()
    .merge(Config.detect())
    .merge({ network: process.env.TRUFFLE_NETWORK || 'development' });

const testResolver = new Resolver(config, { includeTruffleSources: true });
config.resolver = testResolver;

const runner = new TestRunner(config);

const accounts = [];

async function initialize() {
    console.log('Initializing truffle test environment...');

    const web3 = new Web3Shim({
        provider: config.provider,
        networkType: config.networks[config.network].type
            ? config.networks[config.network].type
            : 'web3js',
    });

    const interfaceAdapter = createInterfaceAdapter({
        provider: config.provider,
        networkType: config.networks[config.network].type,
    });

    accounts.push(...(await Test.getAccounts(interfaceAdapter)));
    [config.networks[config.network].from] = accounts;

    global.accounts = accounts;

    const { compilations } = await Test.compileContractsWithTestFilesIfNeeded(
        [], // We don't support solidity tests in mocha
        config,
        testResolver,
    );

    const debuggerCompilations = Codec.Compilations.Utils.shimCompilations(compilations);

    await Test.performInitialDeploy(config, testResolver);

    let bugger;
    if (config.stacktrace) {
        debug('stacktraces on!');
        bugger = await Debugger.forProject({
            compilations: debuggerCompilations,
            provider: config.provider,
            lightMode: true,
        });
    }

    await Test.setJSTestGlobals({
        config,
        web3,
        interfaceAdapter,
        accounts,
        testResolver,
        runner,
        compilations: debuggerCompilations,
        bugger,
    });

    console.log('Successfully initialized truffle environment!');
}

function prepareContractMethod() {
    const template = function (tests) {
        this.timeout(runner.TEST_TIMEOUT);

        before('prepare suite', async function () {
            this.timeout(runner.BEFORE_TIMEOUT);
            await runner.initialize();
        });

        beforeEach('before test', async () => {
            await runner.startTest();
        });

        afterEach('after test', async function () {
            await runner.endTest(this);
        });

        tests(accounts);
    };

    global.contract = function (name, tests) {
        mocha.describe(`Contract: ${name}`, function () {
            template.bind(this, tests)();
        });
    };

    global.contract.only = function (name, tests) {
        mocha.describe.only(`Contract: ${name}`, function () {
            template.bind(this, tests)();
        });
    };

    global.contract.skip = function (name, tests) {
        mocha.describe.skip(`Contract: ${name}`, function () {
            template.bind(this, tests)();
        });
    };
}

prepareContractMethod();
initialize().then(() => run());
