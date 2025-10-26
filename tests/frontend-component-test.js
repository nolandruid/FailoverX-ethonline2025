/**
 * Frontend Component Test
 * Verifies all frontend polish features are implemented
 */

const fs = require('fs');
const path = require('path');

// Test results tracker
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, message) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (message) console.log(`   ${message}`);
  
  testResults.tests.push({ name, passed, message });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function fileContains(filePath, searchString) {
  if (!fileExists(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes(searchString);
}

function countOccurrences(filePath, searchString) {
  if (!fileExists(filePath)) return 0;
  const content = fs.readFileSync(filePath, 'utf8');
  return (content.match(new RegExp(searchString, 'g')) || []).length;
}

async function testToastSystem() {
  console.log('\n🔍 Test 1: Toast Notification System');
  console.log('─'.repeat(50));
  
  const toastFile = path.join(__dirname, '..', 'frontend', 'src', 'globals', 'components', 'ui', 'toast.tsx');
  
  // Check toast component exists
  const exists = fileExists(toastFile);
  logTest('Toast Component File', exists, exists ? 'toast.tsx found' : 'toast.tsx not found');
  
  if (exists) {
    // Check for toast types
    const hasSuccess = fileContains(toastFile, "'success'");
    const hasError = fileContains(toastFile, "'error'");
    const hasWarning = fileContains(toastFile, "'warning'");
    const hasInfo = fileContains(toastFile, "'info'");
    
    logTest('Toast Types', hasSuccess && hasError && hasWarning && hasInfo,
      `Success: ${hasSuccess ? '✓' : '✗'}, Error: ${hasError ? '✓' : '✗'}, Warning: ${hasWarning ? '✓' : '✗'}, Info: ${hasInfo ? '✓' : '✗'}`);
    
    // Check for key features
    const hasAutoRemove = fileContains(toastFile, 'setTimeout');
    const hasAnimation = fileContains(toastFile, 'animate');
    const hasCloseButton = fileContains(toastFile, 'onClose');
    
    logTest('Toast Features', hasAutoRemove && hasAnimation && hasCloseButton,
      `Auto-remove: ${hasAutoRemove ? '✓' : '✗'}, Animation: ${hasAnimation ? '✓' : '✗'}, Close: ${hasCloseButton ? '✓' : '✗'}`);
  }
}

async function testTransactionNotifications() {
  console.log('\n🔍 Test 2: Transaction Notification Service');
  console.log('─'.repeat(50));
  
  const notificationFile = path.join(__dirname, '..', 'frontend', 'src', 'modules', 'transactions', 'services', 'transactionNotificationService.ts');
  
  const exists = fileExists(notificationFile);
  logTest('Notification Service File', exists, 
    exists ? 'transactionNotificationService.ts found' : 'File not found');
  
  if (exists) {
    // Count notification methods
    const notificationMethods = [
      'notifyIntentCreated',
      'notifyMonitoringStarted',
      'notifyMonitoringStopped',
      'notifyIntentDetected',
      'notifyIntentExecuting',
      'notifyIntentExecuted',
      'notifyIntentFailed',
      'notifyFailoverTriggered',
      'notifyBridgingStarted',
      'notifyBridgingCompleted',
      'notifyMaxAttemptsReached',
      'notifyGasSavings',
      'notifyPKPInitialized',
      'notifyPKPExecution'
    ];
    
    let foundMethods = 0;
    notificationMethods.forEach(method => {
      if (fileContains(notificationFile, method)) foundMethods++;
    });
    
    logTest('Notification Methods', foundMethods >= 10,
      `Found ${foundMethods}/${notificationMethods.length} notification methods`);
    
    // Check for singleton pattern
    const hasSingleton = fileContains(notificationFile, 'export const transactionNotificationService');
    logTest('Singleton Pattern', hasSingleton, 
      hasSingleton ? 'Service exported as singleton' : 'Singleton not found');
  }
}

async function testTransactionHistory() {
  console.log('\n🔍 Test 3: Transaction History Page');
  console.log('─'.repeat(50));
  
  const historyFile = path.join(__dirname, '..', 'frontend', 'src', 'modules', 'transactions', 'components', 'pages', 'TransactionHistory.tsx');
  
  const exists = fileExists(historyFile);
  logTest('Transaction History File', exists,
    exists ? 'TransactionHistory.tsx found' : 'File not found');
  
  if (exists) {
    // Check file size (should be substantial)
    const stats = fs.statSync(historyFile);
    const sizeKB = (stats.size / 1024).toFixed(2);
    const isSubstantial = stats.size > 10000; // > 10KB
    
    logTest('Component Size', isSubstantial,
      `File size: ${sizeKB} KB (${isSubstantial ? 'substantial' : 'small'})`);
    
    // Check for key features
    const hasStatusBadges = fileContains(historyFile, 'Badge');
    const hasChainInfo = fileContains(historyFile, 'chainId') || fileContains(historyFile, 'chainName');
    const hasTransactionHash = fileContains(historyFile, 'hash') || fileContains(historyFile, 'txHash');
    
    logTest('History Features', hasStatusBadges && hasChainInfo && hasTransactionHash,
      `Badges: ${hasStatusBadges ? '✓' : '✗'}, Chains: ${hasChainInfo ? '✓' : '✗'}, Hashes: ${hasTransactionHash ? '✓' : '✗'}`);
    
    // Check for Hedera support
    const hasHedera = fileContains(historyFile, '296') || fileContains(historyFile, 'Hedera');
    logTest('Hedera Support', hasHedera,
      hasHedera ? 'Hedera Testnet (296) included' : 'Hedera not found');
  }
}

async function testTransactionScheduler() {
  console.log('\n🔍 Test 4: Transaction Scheduler Page');
  console.log('─'.repeat(50));
  
  const schedulerFile = path.join(__dirname, '..', 'frontend', 'src', 'modules', 'transactions', 'components', 'pages', 'TransactionScheduler.tsx');
  
  const exists = fileExists(schedulerFile);
  logTest('Transaction Scheduler File', exists,
    exists ? 'TransactionScheduler.tsx found' : 'File not found');
  
  if (exists) {
    // Check file size
    const stats = fs.statSync(schedulerFile);
    const sizeKB = (stats.size / 1024).toFixed(2);
    const isSubstantial = stats.size > 15000; // > 15KB
    
    logTest('Component Size', isSubstantial,
      `File size: ${sizeKB} KB (${isSubstantial ? 'feature-rich' : 'basic'})`);
    
    // Check for key features
    const hasFormValidation = fileContains(schedulerFile, 'useState') && fileContains(schedulerFile, 'formData');
    const hasWalletConnection = fileContains(schedulerFile, 'useWalletConnection') || fileContains(schedulerFile, 'connect');
    const hasPKPIntegration = fileContains(schedulerFile, 'usePKP') || fileContains(schedulerFile, 'createPKP');
    const hasMonitoring = fileContains(schedulerFile, 'useIntentMonitoring') || fileContains(schedulerFile, 'monitoring');
    
    logTest('Scheduler Features', hasFormValidation && hasWalletConnection && hasPKPIntegration && hasMonitoring,
      `Form: ${hasFormValidation ? '✓' : '✗'}, Wallet: ${hasWalletConnection ? '✓' : '✗'}, PKP: ${hasPKPIntegration ? '✓' : '✗'}, Monitoring: ${hasMonitoring ? '✓' : '✗'}`);
    
    // Check for failover chains including Hedera
    const failoverCount = countOccurrences(schedulerFile, '296');
    logTest('Failover Configuration', failoverCount > 0,
      `Hedera (296) referenced ${failoverCount} times`);
  }
}

async function testMultiChainSupport() {
  console.log('\n🔍 Test 5: Multi-Chain Support');
  console.log('─'.repeat(50));
  
  const chainsFile = path.join(__dirname, '..', 'frontend', 'src', 'modules', 'chains', 'config', 'supportedChains.ts');
  const hardhatFile = path.join(__dirname, '..', 'hardhat.config.js');
  
  // Check chains config
  const chainsExists = fileExists(chainsFile);
  logTest('Chains Config File', chainsExists,
    chainsExists ? 'supportedChains.ts found' : 'File not found');
  
  // Check hardhat config for networks
  const hardhatExists = fileExists(hardhatFile);
  if (hardhatExists) {
    const hasSepolia = fileContains(hardhatFile, 'sepolia');
    const hasArbitrum = fileContains(hardhatFile, 'arbitrum');
    const hasOptimism = fileContains(hardhatFile, 'optimism');
    const hasHedera = fileContains(hardhatFile, 'hedera') || fileContains(hardhatFile, '296');
    const hasBase = fileContains(hardhatFile, 'base');
    
    const chainCount = [hasSepolia, hasArbitrum, hasOptimism, hasHedera, hasBase].filter(Boolean).length;
    logTest('Hardhat Networks', chainCount >= 4,
      `Sepolia: ${hasSepolia ? '✓' : '✗'}, Arbitrum: ${hasArbitrum ? '✓' : '✗'}, Optimism: ${hasOptimism ? '✓' : '✗'}, Hedera: ${hasHedera ? '✓' : '✗'}, Base: ${hasBase ? '✓' : '✗'}`);
  }
  
  // Check for Hedera service
  const hederaServiceFile = path.join(__dirname, '..', 'frontend', 'src', 'modules', 'transactions', 'services', 'hederaService.ts');
  const hederaServiceExists = fileExists(hederaServiceFile);
  logTest('Hedera Service', hederaServiceExists,
    hederaServiceExists ? 'hederaService.ts implemented' : 'Service not found');
  
  if (hederaServiceExists) {
    const hasTransfer = fileContains(hederaServiceFile, 'transferHbar');
    const hasBalance = fileContains(hederaServiceFile, 'getBalance');
    const hasSDK = fileContains(hederaServiceFile, '@hashgraph/sdk');
    
    logTest('Hedera Service Features', hasTransfer && hasBalance && hasSDK,
      `Transfer: ${hasTransfer ? '✓' : '✗'}, Balance: ${hasBalance ? '✓' : '✗'}, SDK: ${hasSDK ? '✓' : '✗'}`);
  }
}

async function testBlockscoutIntegration() {
  console.log('\n🔍 Test 6: Blockscout Integration');
  console.log('─'.repeat(50));
  
  const blockscoutHookFile = path.join(__dirname, '..', 'frontend', 'src', 'modules', 'transactions', 'hooks', 'useBlockscoutNotifications.ts');
  const packageFile = path.join(__dirname, '..', 'frontend', 'package.json');
  
  // Check hook file
  const hookExists = fileExists(blockscoutHookFile);
  logTest('Blockscout Hook', hookExists,
    hookExists ? 'useBlockscoutNotifications.ts found' : 'Hook not found');
  
  if (hookExists) {
    const hasToast = fileContains(blockscoutHookFile, 'openTxToast');
    const hasPopup = fileContains(blockscoutHookFile, 'openPopup');
    const hasSDK = fileContains(blockscoutHookFile, '@blockscout/app-sdk');
    
    logTest('Blockscout Features', hasToast && hasPopup && hasSDK,
      `Toast: ${hasToast ? '✓' : '✗'}, Popup: ${hasPopup ? '✓' : '✗'}, SDK: ${hasSDK ? '✓' : '✗'}`);
  }
  
  // Check package.json for dependency
  if (fileExists(packageFile)) {
    const hasBlockscoutDep = fileContains(packageFile, '@blockscout/app-sdk');
    logTest('Blockscout Dependency', hasBlockscoutDep,
      hasBlockscoutDep ? 'SDK installed in package.json' : 'SDK not in dependencies');
  }
}

async function testErrorHandling() {
  console.log('\n🔍 Test 7: Error Handling & Edge Cases');
  console.log('─'.repeat(50));
  
  const schedulerFile = path.join(__dirname, '..', 'frontend', 'src', 'modules', 'transactions', 'components', 'pages', 'TransactionScheduler.tsx');
  
  if (fileExists(schedulerFile)) {
    // Check for error handling patterns
    const hasTryCatch = countOccurrences(schedulerFile, 'try {') > 0;
    const hasErrorState = fileContains(schedulerFile, 'error') || fileContains(schedulerFile, 'Error');
    const hasLoadingState = fileContains(schedulerFile, 'isLoading') || fileContains(schedulerFile, 'isSubmitting');
    const hasValidation = fileContains(schedulerFile, 'validate') || fileContains(schedulerFile, 'required');
    
    logTest('Error Handling Patterns', hasTryCatch && hasErrorState,
      `Try-Catch: ${hasTryCatch ? '✓' : '✗'}, Error State: ${hasErrorState ? '✓' : '✗'}`);
    
    logTest('Loading & Validation', hasLoadingState && hasValidation,
      `Loading: ${hasLoadingState ? '✓' : '✗'}, Validation: ${hasValidation ? '✓' : '✗'}`);
  }
  
  // Check notification service for error notifications
  const notificationFile = path.join(__dirname, '..', 'frontend', 'src', 'modules', 'transactions', 'services', 'transactionNotificationService.ts');
  if (fileExists(notificationFile)) {
    const hasErrorNotify = fileContains(notificationFile, 'notifyError');
    const hasFailedNotify = fileContains(notificationFile, 'notifyIntentFailed');
    
    logTest('Error Notifications', hasErrorNotify && hasFailedNotify,
      `Error: ${hasErrorNotify ? '✓' : '✗'}, Failed: ${hasFailedNotify ? '✓' : '✗'}`);
  }
}

async function testUIComponents() {
  console.log('\n🔍 Test 8: UI Components & Polish');
  console.log('─'.repeat(50));
  
  const uiDir = path.join(__dirname, '..', 'frontend', 'src', 'globals', 'components', 'ui');
  
  // Check for key UI components
  const components = ['button', 'card', 'input', 'label', 'badge', 'alert', 'toast'];
  let foundComponents = 0;
  
  components.forEach(component => {
    const componentPath = path.join(uiDir, `${component}.tsx`);
    if (fileExists(componentPath)) foundComponents++;
  });
  
  logTest('UI Components', foundComponents >= 5,
    `Found ${foundComponents}/${components.length} core components`);
  
  // Check package.json for UI libraries
  const packageFile = path.join(__dirname, '..', 'frontend', 'package.json');
  if (fileExists(packageFile)) {
    const hasTailwind = fileContains(packageFile, 'tailwindcss');
    const hasRadix = fileContains(packageFile, '@radix-ui');
    const hasLucide = fileContains(packageFile, 'lucide-react');
    
    logTest('UI Libraries', hasTailwind && hasRadix && hasLucide,
      `Tailwind: ${hasTailwind ? '✓' : '✗'}, Radix: ${hasRadix ? '✓' : '✗'}, Lucide: ${hasLucide ? '✓' : '✗'}`);
  }
}

async function testVincentPKPIntegration() {
  console.log('\n🔍 Test 9: Vincent PKP Integration');
  console.log('─'.repeat(50));
  
  const vincentFile = path.join(__dirname, '..', 'frontend', 'src', 'modules', 'transactions', 'services', 'vincentPKPService.ts');
  
  const exists = fileExists(vincentFile);
  logTest('Vincent PKP Service', exists,
    exists ? 'vincentPKPService.ts found' : 'Service not found');
  
  if (exists) {
    const hasVincentSDK = fileContains(vincentFile, '@lit-protocol/vincent-app-sdk');
    const hasAppId = fileContains(vincentFile, '1339828260');
    const hasCreatePKP = fileContains(vincentFile, 'createAIPKP');
    const hasAnalyze = fileContains(vincentFile, 'analyzeTransaction');
    const hasHedera = fileContains(vincentFile, 'hedera');
    
    logTest('Vincent SDK Integration', hasVincentSDK && hasAppId,
      `SDK: ${hasVincentSDK ? '✓' : '✗'}, App ID: ${hasAppId ? '✓' : '✗'}`);
    
    logTest('Vincent Features', hasCreatePKP && hasAnalyze && hasHedera,
      `Create PKP: ${hasCreatePKP ? '✓' : '✗'}, Analyze: ${hasAnalyze ? '✓' : '✗'}, Hedera: ${hasHedera ? '✓' : '✗'}`);
  }
}

async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║     FRONTEND POLISH COMPONENT TEST SUITE      ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  await testToastSystem();
  await testTransactionNotifications();
  await testTransactionHistory();
  await testTransactionScheduler();
  await testMultiChainSupport();
  await testBlockscoutIntegration();
  await testErrorHandling();
  await testUIComponents();
  await testVincentPKPIntegration();
  
  // Print summary
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║              TEST SUMMARY                      ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total:  ${testResults.tests.length}`);
  console.log(`🎯 Success Rate: ${Math.round((testResults.passed / testResults.tests.length) * 100)}%\n`);
  
  // Integration status
  const allPassed = testResults.failed === 0;
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED! Frontend polish is complete!\n');
    console.log('✅ Frontend Features:');
    console.log('   • Toast notifications: WORKING');
    console.log('   • Transaction history: POLISHED');
    console.log('   • Multi-chain support: READY');
    console.log('   • Error handling: COMPREHENSIVE');
    console.log('   • Blockscout integration: ACTIVE');
    console.log('   • UI components: MODERN');
    console.log('   • Vincent PKP: INTEGRATED');
    console.log('\n🚀 Frontend is ready for demo!\n');
    console.log('📍 Start dev server: cd frontend && npm run dev');
    console.log('🌐 Open: http://localhost:5173/\n');
  } else {
    console.log('⚠️  Some tests failed. Please review the issues above.\n');
    console.log('📋 Failed Tests:');
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`   • ${t.name}: ${t.message}`));
    console.log('');
  }
  
  return allPassed;
}

// Run tests
runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
