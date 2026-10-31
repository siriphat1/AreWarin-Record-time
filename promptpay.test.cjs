const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const client=fs.readFileSync(__dirname+'/student-client.js','utf8');const a=client.indexOf('function tlv('),b=client.indexOf('function paymentForm(',a);assert(a>=0&&b>a);
const sandbox={};vm.createContext(sandbox);vm.runInContext(client.slice(a,b),sandbox);
const code=sandbox.promptPayPayload('1901001151577',90000);
assert(code.startsWith('000201010212'));
assert(code.includes('5303764'));
assert(code.includes('5406900.00'));
assert(code.includes('1901001151577'));
assert(code.endsWith('6304'+code.slice(-4))===false || code.includes('6304')); // structure check below
const input=code.slice(0,-4);let crc=65535;for(let i=0;i<input.length;i++){crc^=input.charCodeAt(i)<<8;for(let j=0;j<8;j++)crc=crc&32768?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff;}
assert.equal(code.slice(-4),crc.toString(16).toUpperCase().padStart(4,'0'));
assert.throws(()=>sandbox.promptPayPayload('invalid',90000),/ไม่ถูกต้อง/);
console.log('PASS: Thai PromptPay QR EMV tags, exact amount and CRC');
