import {Provider, ethers, Log} from 'ethers';
import {provider, USDT_ADDRESS_ETH} from '../config/ethereum'


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
      
      
}