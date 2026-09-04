#!/usr/bin/env node
import { IntentraClient, IntentConstraint } from './src';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function sdkDemo() {
  console.log('\n' + '='.repeat(60));
  console.log('INTENTRA SDK DEMO');
  console.log('='.repeat(60));
  
  console.log('\nCreating IntentraClient with dryRun: true (no real execution)...');
  
  const client = new IntentraClient({
    dryRun: true,
    autoRenewSession: true
  });
  
  console.log('✓ Client created');
  console.log('✓ Session created (expires in 60 minutes)');
  console.log(`✓ Session ID: ${client.getSessionId().substring(0, 16)}...`);
  
  console.log('\n' + '-'.repeat(60));
  console.log('STEP 1: Declare intent');
  console.log('-'.repeat(60));
  
  const intent: IntentConstraint = {
    humanIntent: 'Buy BTC only. Max $100 per order. Max $200 per day.',
    actionConstraints: {
      allowedActions: ['BUY'],
      allowedAssets: ['BTC'],
      maxOrderValue: 100,
      dailyBudgetLimit: 200
    },
    session: {
      expiresAt: Date.now() + 60 * 60 * 1000,
      nonce: 'demo-nonce-123'
    }
  };
  
  console.log('\nIntent:');
  console.log('  Actions: BUY');
  console.log('  Assets: BTC');
  console.log('  Max per order: $100');
  console.log('  Daily limit: $200');
  
  client.setIntent(intent);
  console.log('\n✓ Intent registered');
  
  console.log('\n' + '-'.repeat(60));
  console.log('STEP 2: Agent proposes trades');
  console.log('-'.repeat(60));
  
  const proposals = [
    'Buy $90 BTC',
    'Buy another $90 BTC',
    'Increase my daily limit to $500',
    'Buy $50 BTC and $50 BTC',
    'Sell $80 BTC',
    'Buy $50 ETH'
  ];
  
  for (let i = 0; i < proposals.length; i++) {
    const proposal = proposals[i];
    
    console.log(`\nPROPOSAL ${i + 1}: ${proposal}`);
    console.log('AGENT: "' + proposal + '"');
    
    const result = client.validateProposal(proposal);
    
    if (result.allowed) {
      console.log(`INTENTRA: ALLOWED`);
      console.log(`Binance MCP call pending...`);
      
      const shouldExecute = await question('\nExecute on Binance? (y/n/quit): ');
      
      if (shouldExecute.toLowerCase() === 'quit' || shouldExecute.toLowerCase() === 'q') {
        console.log('\nQuitting...');
        break;
      }
      
      if (shouldExecute.toLowerCase() === 'y') {
        console.log('\nExecuting on Binance...');
        const execResult = await client.executeApprovedProposal(proposal);
        
        if (execResult.receipt) {
          console.log(`BINANCE: EXECUTED`);
          console.log(`Receipt: ${execResult.receipt.receiptHash}`);
          console.log(`Order ID: ${execResult.receipt.executionResult.orderId}`);
        } else {
          console.log(`Execution error: ${execResult.errorMessage}`);
        }
      } else {
        console.log('Skipped execution');
      }
    } else {
      console.log(`INTENTRA: BLOCKED`);
      console.log(`REASON: ${result.reason}`);
      console.log(`BINANCE MCP CALL: NONE`);
      
      if (result.violations.includes('POLICY_MUTATION')) {
        console.log('\n⚠ THE THING BEING GOVERNED CANNOT REWRITE THE RULES GOVERNING ITSELF');
      }
    }
    
    if (i < proposals.length - 1) {
      const next = await question('\nContinue to next proposal? (y/n): ');
      if (next.toLowerCase() !== 'y') {
        console.log('\nQuitting...');
        break;
      }
    }
  }
  
  console.log('\n' + '-'.repeat(60));
  console.log('STEP 3: Stats & status');
  console.log('-'.repeat(60));
  
  const stats = client.getSessionStats();
  
  console.log('\nSession stats:');
  console.log(`  Total proposals: ${stats.totalProposals}`);
  console.log(`  Allowed: ${stats.allowedCount}`);
  console.log(`  Blocked: ${stats.blockedCount}`);
  console.log(`  Violations: ${stats.violationsDetected}`);
  console.log(`  Receipts: ${stats.receiptsGenerated}`);
  console.log(`  Daily budget used: $${stats.totalDailyBudgetUsed.toFixed(2)}`);
  console.log(`  Daily budget limit: $${client.getDailyBudgetLimit()}`);
  console.log(`  Authority score: ${stats.authorityScore}/100`);
  console.log(`  Session valid: ${client.isSessionValid()}`);
  
  console.log('\nActive constraints:');
  client.getActiveConstraints().forEach(c => {
    console.log(`  • ${c.description}`);
  });
  
  console.log('\n' + '-'.repeat(60));
  console.log('STEP 4: Revoke (optional)');
  console.log('-'.repeat(60));
  
  const revokeAnswer = await question('\nRevoke agent access immediately? (y/n): ');
  
  if (revokeAnswer.toLowerCase() === 'y') {
    client.revoke();
    console.log('✓ Session revoked');
    console.log(`Session valid: ${client.isSessionValid()}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('SDK DEMO COMPLETE');
  console.log('='.repeat(60));
  
  console.log('\nSummary:');
  console.log(`  Blocked requests never reached Binance.`);
  console.log(`  Allowed requests did.`);
  console.log(`  That's the proof.`);
  
  console.log('\nInstall the SDK:');
  console.log('  npm install intentra');
  console.log('  yarn add intentra');
  
  console.log('\nGitHub: https://github.com/[you]/intentra');
  console.log('npm: https://npmjs.com/package/intentra');
  
  rl.close();
}

sdkDemo().catch(err => {
  console.error(err);
  rl.close();
  process.exit(1);
});
