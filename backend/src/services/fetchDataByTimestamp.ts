import {Provider, ethers, Log} from 'ethers';
import {provider, USDT_ADDRESS_ETH} from '../config/ethereum'

function topicToAddress(topic: string): string {
    return ethers.getAddress(`0x${topic.slice(26)}`);
  }

export class fetchDataByTimeStamp{
    private blockTimestampCache : Map<number, number>;

    constructor (){
        this.blockTimestampCache=new Map();
    }

    async getBlockByTimeStamp(provider : Provider, timestamp: number){
        let lastBlockNumber :number = await provider.getBlockNumber();
        let firstBlockNumber :number = 0;

        const firstBlock = provider.getBlock(firstBlockNumber);
        const lastBlock = provider.getBlock(lastBlockNumber);

        while (firstBlockNumber<lastBlockNumber){
            const mid = Math.floor((lastBlockNumber+firstBlockNumber)/2);
            const block = await provider.getBlock(mid);
            const firstBlock = await provider.getBlock(firstBlockNumber);
            const lastBlock = await provider.getBlock(lastBlockNumber);

            console.log('target imestamp : ', timestamp);
            console.log('lower limit timestamp', firstBlock?.timestamp);
            console.log('higher limit timestamp', lastBlock?.timestamp);

            if(block && block.timestamp<timestamp){
                firstBlockNumber=mid+1;
            }else{
                lastBlockNumber=mid;
            }
        }

        const targetBlock = await provider.getBlock(firstBlockNumber);
        console.log('target block number',firstBlockNumber);
        console.log('target block timestamp',targetBlock?.timestamp);

        return firstBlockNumber;
    }

    async getLogsByTimeStamp(provider: Provider, startTimestamp: number, endTimestamp: number) {
        const firstBlockNumber = await this.getBlockByTimeStamp(provider, startTimestamp);
        const lastBlockNumber = await this.getBlockByTimeStamp(provider, endTimestamp);
      
        const chunkSize = 50;            
        const parallelCalls = 17;         
        const logsTable: Log[] = [];
        const transferTopic = ethers.id("Transfer(address,address,uint256)");
      
        console.log("transferTopic", transferTopic);
      
        for (let i = firstBlockNumber; i <= lastBlockNumber; i += chunkSize * parallelCalls) {
          const promises: Promise<Log[]>[] = [];

          for (let p = 0; p < parallelCalls; p++) {
            const fromBlock = i + p * chunkSize;
            if (fromBlock > lastBlockNumber) break;
      
            const toBlock = Math.min(fromBlock + chunkSize - 1, lastBlockNumber);
      
            promises.push(
              provider.getLogs({
                address: USDT_ADDRESS_ETH,
                fromBlock,
                toBlock,
                topics: [transferTopic],
              })
            );
          }
      
          const results = await Promise.all(promises);
          for (let k = 0; k < results.length; k++) {
            const logs = results[k];
            logsTable.push(...logs);
          }
          const fetched = results.reduce((sum, arr) => sum + arr.length, 0);
          console.log(`block : ${i}`);
        }
        console.log('data struct',logsTable[1]);
        return logsTable;
      }

      async getTransferUsdtPerThirtyMinutes(provider : Provider, startTimestamp :number, endTimestamp:number){
        let allLogs : Log[] = await this.getLogsByTimeStamp(provider,startTimestamp,endTimestamp);
        
        console.log(`Total logs : ${allLogs.length}`);
        
        const thirtyMin = 30 * 60
        const buckets = new Map<number, bigint>();

        for (let ts = startTimestamp; ts < endTimestamp; ts += thirtyMin) {
            buckets.set(ts, BigInt(0));
          }

        const table = new Map<number,number>();
        const tableValue = new Map<number,bigint>();

        const uniqueBlockNumbers = [...new Set(allLogs.map(l => l.blockNumber))];
        const missingBlocks = uniqueBlockNumbers.filter(bn => !this.blockTimestampCache.has(bn));

        const batch_size = 120;
        for (let j = 0; j<=missingBlocks.length ; j+=batch_size){
            const batch = missingBlocks.slice(j,j+batch_size);
            await Promise.all(
                batch.map(async (bn) => {
                  const block = await provider.getBlock(bn);
                  if(block)
                  this.blockTimestampCache.set(bn, block.timestamp);
                })
              );
        }
        
        let logCount = 0;
        for (const log of allLogs){
            logCount++;
            if (logCount % 100 === 0) {
                console.log(`log ${logCount} / ${allLogs.length}`);
            }
            
            let blockTimeStamp = this.blockTimestampCache.get(log.blockNumber);
            
            if (blockTimeStamp === undefined) continue;

            const prev = tableValue.get(log.blockNumber) ?? BigInt(0);
            tableValue.set(log.blockNumber, prev + BigInt(log.data));

            table.set(log.blockNumber, blockTimeStamp);
        }

        for (const [blockNumber, blockTimeStamp] of table){
            const timePassed = blockTimeStamp-startTimestamp;
            const numberOfBucketCollapsed = timePassed/thirtyMin;
            const bucketIndex = Math.floor(timePassed / thirtyMin);

            const bucketStart = startTimestamp + bucketIndex * thirtyMin;
            const blockValue = tableValue.get(blockNumber) ?? BigInt(0);
            
            buckets.set(bucketStart, (buckets.get(bucketStart) ?? BigInt(0)) + blockValue);
        }

        const result = Array.from(buckets.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([bucketStart, volumeRaw]) => ({
                bucketStart,
                volumeRaw: volumeRaw.toString(),
                volumeUsdt: ethers.formatUnits(volumeRaw, 6),
            }));

        console.log("final result:", result);
        return result;
        
    }
    
    async getTopSendersForPeriod( provider: Provider, startTimestamp: number, endTimestamp: number) {
        const logs: Log[] = await this.getLogsByTimeStamp(provider, startTimestamp, endTimestamp);
        console.log(`Total logs for top senders: ${logs.length}`);
    
        const zeroAddress = "0x0000000000000000000000000000000000000000";
    
        const senderTotals = new Map<string, bigint>();
        let total = BigInt(0);
    
        let i = 0;
        for (const log of logs) {
          i++;
          if (i % 5000 === 0) {
            console.log(`Top senders aggregation: ${i}/${logs.length}`);
          }

          const from = topicToAddress(log.topics[1]);
          if (from === zeroAddress) continue;
    
          const value = BigInt(log.data);
          total += value;
    
          const prev = senderTotals.get(from) ?? BigInt(0);
          senderTotals.set(from, prev + value);
        }
    
        const sortedSenders = [...senderTotals.entries()]
        .sort(([, valueA], [, valueB]) => {
            if (valueB > valueA) return 1;
            if (valueB < valueA) return -1;
            return 0;
        });
    
        const ninetyPercent = (BigInt(90)*total)/BigInt(100);

        const topSenders = new Map<string, bigint>();
        let topSendersAmout=BigInt(0);

        for(const [address, amount] of sortedSenders){
            if (topSendersAmout >= ninetyPercent) break;

            topSenders.set(address, amount);
            topSendersAmout += amount;
        }

        const othersAmount = total - topSendersAmout;

        const slices: Array<{
            label: string;
            address?: string;
            amountRaw: string;
            amountUsdt: string;
          }> = [];

          for (const [address, amount] of topSenders.entries()) {
            slices.push({
              label: address,
              address,
              amountRaw: amount.toString(),
              amountUsdt: ethers.formatUnits(amount, 6),
            });
          }
          slices.push({
            label: "Others",
            amountRaw: othersAmount.toString(),
            amountUsdt: ethers.formatUnits(othersAmount, 6),
          });
          console.log("final result:", slices);
          return slices;
      }
}