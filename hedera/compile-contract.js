const solc = require('solc');
const fs = require('fs');
const path = require('path');

async function compileContract() {
    console.log("🔨 Compiling HelloWorld.sol for Hedera deployment...\n");
    
    try {
        // Read the contract source code - try Minimal first, then SimpleHello, then HelloWorld
        let contractPath = path.join(__dirname, 'contracts', 'Minimal.sol');
        let contractName = 'Minimal';
        
        if (!fs.existsSync(contractPath)) {
            contractPath = path.join(__dirname, 'contracts', 'SimpleHello.sol');
            contractName = 'SimpleHello';
        }
        
        if (!fs.existsSync(contractPath)) {
            contractPath = path.join(__dirname, 'contracts', 'HelloWorld.sol');
            contractName = 'HelloWorld';
        }
        
        const source = fs.readFileSync(contractPath, 'utf8');
        console.log(`📄 Compiling ${contractName}.sol...`);
        
        // Prepare the input for the Solidity compiler
        const input = {
            language: 'Solidity',
            sources: {
                [`${contractName}.sol`]: {
                    content: source
                }
            },
            settings: {
                outputSelection: {
                    '*': {
                        '*': ['abi', 'evm.bytecode']
                    }
                }
            }
        };
        
        console.log("📄 Compiling contract...");
        
        // Compile the contract
        const output = JSON.parse(solc.compile(JSON.stringify(input)));
        
        // Check for compilation errors
        if (output.errors) {
            const hasErrors = output.errors.some(error => error.severity === 'error');
            if (hasErrors) {
                console.error("❌ Compilation errors:");
                output.errors.forEach(error => {
                    if (error.severity === 'error') {
                        console.error(`  - ${error.formattedMessage}`);
                    }
                });
                process.exit(1);
            } else {
                // Only warnings
                console.log("⚠️  Compilation warnings:");
                output.errors.forEach(error => {
                    console.log(`  - ${error.formattedMessage}`);
                });
            }
        }
        
        // Extract the compiled contract
        const contract = output.contracts[`${contractName}.sol`][contractName];
        
        if (!contract) {
            throw new Error("Contract compilation failed - no output generated");
        }
        
        // Get bytecode and ABI
        const bytecode = contract.evm.bytecode.object;
        const abi = contract.abi;
        
        console.log("✅ Compilation successful!");
        console.log(`📊 Bytecode size: ${bytecode.length / 2} bytes`);
        
        // Create build directory if it doesn't exist
        const buildDir = path.join(__dirname, 'build');
        if (!fs.existsSync(buildDir)) {
            fs.mkdirSync(buildDir);
        }
        
        // Save compilation artifacts
        const artifacts = {
            contractName: contractName,
            bytecode: `0x${bytecode}`,
            abi: abi,
            compiledAt: new Date().toISOString(),
            compiler: {
                version: solc.version(),
                settings: input.settings
            }
        };
        
        const artifactsPath = path.join(buildDir, `${contractName}.json`);
        fs.writeFileSync(artifactsPath, JSON.stringify(artifacts, null, 2));
        
        console.log(`💾 Artifacts saved to: ${artifactsPath}`);
        console.log("\n🎉 Ready for deployment! Run 'yarn hedera:deploy' to deploy the contract.");
        
        return artifacts;
        
    } catch (error) {
        console.error("❌ Compilation failed:", error.message);
        console.log("\n🔧 Troubleshooting tips:");
        console.log("1. Check that HelloWorld.sol exists in hedera/contracts/");
        console.log("2. Verify Solidity syntax is correct");
        console.log("3. Ensure solc compiler is installed");
        process.exit(1);
    }
}

// Run compilation if called directly
if (require.main === module) {
    compileContract();
}

module.exports = { compileContract };
